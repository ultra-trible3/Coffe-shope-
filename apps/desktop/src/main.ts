import {
  BrowserWindow,
  Menu,
  app,
  ipcMain,
  shell,
  type IpcMainInvokeEvent,
} from 'electron';
import { randomUUID } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { ApiClient } from './main/api-client.js';
import { SessionStore } from './main/session.js';
import type {
  ApiRequestPayload,
  AppInfo,
  LoginPayload,
  PrintOptions,
  PrintResult,
  SessionState,
} from './shared/ipc.js';
import { IPC } from './shared/ipc.js';

// Injected by @electron-forge/plugin-vite at build time.
declare const MAIN_WINDOW_VITE_DEV_SERVER_URL: string | undefined;
declare const MAIN_WINDOW_VITE_NAME: string;

const API_BASE_URL = process.env.QAHWA_API_URL ?? 'http://127.0.0.1:4000';

// Window/taskbar icon: the project asset in dev, the packaged extra resource otherwise.
const APP_ICON = app.isPackaged
  ? join(process.resourcesPath, 'icon.png')
  : join(__dirname, '../../build/icon.png');

// The application name decides `%APPDATA%\<name>`, where the refresh token and
// the terminal id live. Forge's packager `name` and package.json's `productName`
// can disagree, so pin it here — before the single-instance lock (which is keyed
// to the same directory) and before anything reads `app.getPath('userData')`.
app.setName('Qahwa Coffee House');

let mainWindow: BrowserWindow | null = null;
let sessionStore: SessionStore;
let apiClient: ApiClient;

/** A stable identifier for this physical terminal (recorded in the audit log). */
function resolveTerminalId(): string {
  const file = join(app.getPath('userData'), 'terminal-id');
  try {
    if (existsSync(file)) {
      const existing = readFileSync(file, 'utf8').trim();
      if (existing) return existing;
    }
    const generated = `TERM-${randomUUID().slice(0, 8).toUpperCase()}`;
    writeFileSync(file, generated, 'utf8');
    return generated;
  } catch {
    return `TERM-${randomUUID().slice(0, 8).toUpperCase()}`;
  }
}

// A POS terminal must never run twice against the same cash drawer.
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}

function notifySession(state: SessionState): void {
  mainWindow?.webContents.send(IPC.authChanged, state);
}

function createWindow(): BrowserWindow {
  const window = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1100,
    minHeight: 700,
    show: false,
    autoHideMenuBar: true,
    backgroundColor: '#fbf7f1',
    title: 'Qahwa Coffee House — Coffee Shop POS',
    icon: APP_ICON,
    webPreferences: {
      preload: join(__dirname, 'preload.js'),
      // --- hard security boundaries -------------------------------------
      contextIsolation: true,
      nodeIntegration: false,
      nodeIntegrationInWorker: false,
      nodeIntegrationInSubFrames: false,
      sandbox: true,
      webSecurity: true,
      allowRunningInsecureContent: false,
      experimentalFeatures: false,
      spellcheck: false,
    },
  });

  window.once('ready-to-show', () => window.show());

  // Never allow the renderer to navigate away or spawn arbitrary windows.
  window.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://')) void shell.openExternal(url);
    return { action: 'deny' };
  });

  window.webContents.on('will-navigate', (event, url) => {
    const devUrl = MAIN_WINDOW_VITE_DEV_SERVER_URL;
    if (devUrl && url.startsWith(devUrl)) return;
    event.preventDefault();
  });

  window.webContents.on('render-process-gone', (_event, details) => {
    console.error('[main] renderer process gone', details);
  });

  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    void window.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    void window.loadFile(
      join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`),
    );
  }

  window.on('closed', () => {
    mainWindow = null;
  });

  return window;
}

function buildMenu(): void {
  const isDev = !app.isPackaged;
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: 'File',
      submenu: [
        {
          label: 'Reload',
          accelerator: 'CmdOrCtrl+R',
          click: () => mainWindow?.reload(),
        },
        { type: 'separator' },
        { label: 'Quit', role: 'quit' },
      ],
    },
    {
      label: 'View',
      submenu: [
        { label: 'Zoom in', role: 'zoomIn' },
        { label: 'Zoom out', role: 'zoomOut' },
        { label: 'Actual size', role: 'resetZoom' },
        { type: 'separator' },
        { label: 'Toggle full screen', role: 'togglefullscreen' },
      ],
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'API documentation',
          click: () => {
            void shell.openExternal(`${API_BASE_URL}/api/docs`);
          },
        },
      ],
    },
  ];

  if (isDev) {
    template.push({
      label: 'Developer',
      submenu: [
        { label: 'Developer tools', role: 'toggleDevTools' },
        {
          label: 'Check API health',
          click: async () => {
            const health = await apiClient.health();
            console.log('[dev] server health', health);
          },
        },
      ],
    });
  }

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

function registerIpcHandlers(): void {
  ipcMain.handle(IPC.appInfo, (): AppInfo => ({
    name: app.getName(),
    version: app.getVersion(),
    electron: process.versions.electron ?? '',
    chrome: process.versions.chrome ?? '',
    node: process.versions.node ?? '',
    platform: process.platform,
    apiBaseUrl: API_BASE_URL,
    isPackaged: app.isPackaged,
    terminalId: resolveTerminalId(),
  }));

  ipcMain.handle(IPC.appHealth, () => apiClient.health());

  ipcMain.handle(IPC.authLogin, async (_event: IpcMainInvokeEvent, payload: LoginPayload) => {
    const ar = payload?.language === 'ar';
    if (!payload || typeof payload.username !== 'string' || typeof payload.password !== 'string') {
      return {
        ok: false,
        status: 400,
        error: {
          code: 'VALIDATION_ERROR',
          message: ar ? 'بيانات الدخول غير صحيحة' : 'Invalid sign-in details',
        },
      };
    }
    try {
      return await apiClient.login({
        username: payload.username,
        password: payload.password,
        language: payload.language,
      });
    } catch (error) {
      return {
        ok: false,
        status: 0,
        error: {
          code: 'NETWORK_ERROR',
          message: ar
            ? 'تعذر الاتصال بخادم المطعم. تأكد من تشغيل الخادم على الشبكة المحلية'
            : 'Unable to reach the restaurant server. Make sure it is running on the local network.',
          details: error instanceof Error ? error.message : String(error),
        },
      };
    }
  });

  ipcMain.handle(IPC.authLogout, async () => {
    await apiClient.logout();
  });

  ipcMain.handle(IPC.authSession, (): SessionState => apiClient.sessionState());

  ipcMain.handle(IPC.apiRequest, async (_event: IpcMainInvokeEvent, payload: ApiRequestPayload) => {
    try {
      return await apiClient.request(payload);
    } catch (error) {
      return {
        ok: false,
        status: 0,
        error: {
          code: 'NETWORK_ERROR',
          message:
            payload.query?.lang === 'ar'
              ? 'تعذر الاتصال بالخادم، تحقق من الشبكة'
              : 'Unable to reach the server. Check the network connection.',
          details: error instanceof Error ? error.message : String(error),
        },
      };
    }
  });

  // Label printing. The renderer lays the labels out in the DOM (hidden by
  // print CSS) and delegates the actual print job to Chromium; we never fake a
  // print. The callback reports success, an explicit cancellation, or a
  // failure so the UI can react appropriately.
  ipcMain.handle(
    IPC.appPrint,
    (event: IpcMainInvokeEvent, options?: PrintOptions): Promise<PrintResult> =>
      new Promise<PrintResult>((resolve) => {
        event.sender.print(
          {
            silent: options?.silent ?? false,
            printBackground: options?.printBackground ?? true,
            ...(options?.deviceName ? { deviceName: options.deviceName } : {}),
          },
          (success, failureReason) => {
            if (success) {
              resolve({ ok: true });
              return;
            }
            const error =
              failureReason ||
              (options?.language === 'ar' ? 'تعذر إتمام الطباعة' : 'Printing could not be completed');
            resolve({ ok: false, cancelled: /cancel/i.test(error), error });
          },
        );
      }),
  );
}

void app.whenReady().then(async () => {
  app.setAppUserModelId('co.qahwa.pos');
  sessionStore = new SessionStore();
  apiClient = new ApiClient(sessionStore, API_BASE_URL, resolveTerminalId(), notifySession);

  registerIpcHandlers();
  buildMenu();
  mainWindow = createWindow();

  // Restore a previous session in the background; the renderer is notified.
  void apiClient.restore().then((restored) => {
    if (restored) notifySession(apiClient.sessionState());
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      mainWindow = createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
