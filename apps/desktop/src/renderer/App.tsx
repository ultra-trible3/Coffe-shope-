import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { Coffee } from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type ReactElement } from 'react';
import type { Permission, Role } from '@pharmacy/shared';
import { AppShell, NAV_GROUPS, type PageKey } from './components/layout/AppShell';
import { CoffeeLoader } from './components/layout/CoffeeLoader';
import { Toaster } from './components/ui/toast';
import { useI18n } from './i18n';
import { getBridge, hasBridge } from './lib/bridge';
import { useLanguageStore } from './store/language';
import { LoginPage } from './pages/LoginPage';
import { HomePage } from './pages/HomePage';
import { DashboardPage } from './pages/DashboardPage';
import { PosPage } from './pages/PosPage';
import { OrdersPage } from './pages/OrdersPage';
import { KitchenPage } from './pages/KitchenPage';
import { InvoicesPage } from './pages/InvoicesPage';
import { MenuPage } from './pages/MenuPage';
import { InventoryPage } from './pages/InventoryPage';
import { CustomersPage } from './pages/CustomersPage';
import { ReportsPage } from './pages/ReportsPage';
import { UsersPage } from './pages/UsersPage';
import { SettingsPage } from './pages/SettingsPage';
import { useAuthStore } from './store/auth';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 15_000,
    },
    mutations: { retry: 0 },
  },
});

function defaultPageFor(role: string | undefined): PageKey {
  if (role === 'KITCHEN_STAFF') return 'kitchen';
  if (role === 'ADMIN') return 'home';
  return 'pos';
}

function isPageAllowed(
  page: PageKey,
  role: string | undefined,
  can: (permission: Permission) => boolean,
): boolean {
  for (const group of NAV_GROUPS) {
    const item = group.items.find((candidate) => candidate.key === page);
    if (!item) continue;
    if (item.roles && (!role || !item.roles.includes(role as Role))) return false;
    if (role !== 'ADMIN' && item.adminOnly) return false;
    if (item.permission && !can(item.permission)) return false;
    return true;
  }
  return false;
}

function Splash(): ReactElement {
  const { t } = useI18n();
  return (
    <CoffeeLoader title={t('auth.splash.title')} subtitle={t('auth.splash.subtitle')} />
  );
}

function BridgeMissing(): ReactElement {
  const { t } = useI18n();
  return (
    <div className="flex h-full min-h-screen items-center justify-center bg-background p-6">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 text-center shadow-card">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary text-white">
          <Coffee className="h-7 w-7" />
        </span>
        <h1 className="mt-5 text-xl font-bold">{t('auth.bridgeMissing.title')}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{t('auth.bridgeMissing.message')}</p>
      </div>
    </div>
  );
}

/**
 * Dynamic content is localized by the API, so every cached query must refetch
 * when the language changes. The first render is skipped to avoid a duplicate
 * fetch on start-up.
 */
function LanguageQuerySync(): null {
  const language = useLanguageStore((state) => state.language);
  const queryClient = useQueryClient();
  const firstRender = useRef(true);

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    void queryClient.invalidateQueries();
  }, [language, queryClient]);

  return null;
}

const BOOT_SPLASH_MS = 900;
const ENTRY_SPLASH_MS = 1200;
const ENTRY_FADE_MS = 240;

function Shell(): ReactElement {
  const { t } = useI18n();
  const status = useAuthStore((state) => state.status);
  const user = useAuthStore((state) => state.user);
  const can = useAuthStore((state) => state.can);
  const bootstrap = useAuthStore((state) => state.bootstrap);
  const applySession = useAuthStore((state) => state.applySession);
  const bridgeAvailable = useMemo(() => hasBridge(), []);
  const [page, setPage] = useState<PageKey | null>(null);
  const [bootVisible, setBootVisible] = useState(true);
  const [entryPhase, setEntryPhase] = useState<'hidden' | 'visible' | 'leaving'>('hidden');
  const previousStatus = useRef(status);

  useEffect(() => {
    const timer = window.setTimeout(() => setBootVisible(false), BOOT_SPLASH_MS);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (status !== 'authenticated') {
      setEntryPhase('hidden');
      previousStatus.current = status;
      return;
    }
    if (previousStatus.current === 'authenticated') return;
    setEntryPhase('visible');
    previousStatus.current = status;
    const hold = window.setTimeout(() => setEntryPhase('leaving'), ENTRY_SPLASH_MS);
    const done = window.setTimeout(
      () => setEntryPhase('hidden'),
      ENTRY_SPLASH_MS + ENTRY_FADE_MS,
    );
    return () => {
      window.clearTimeout(hold);
      window.clearTimeout(done);
    };
  }, [status]);

  useEffect(() => {
    if (!bridgeAvailable) return;
    void bootstrap();
    const bridge = getBridge();
    return bridge.auth.onChange(applySession);
  }, [bridgeAvailable, bootstrap, applySession]);

  useEffect(() => {
    if (!user) {
      setPage(null);
      return;
    }
    setPage((current) => {
      if (current && isPageAllowed(current, user.role, can)) return current;
      return defaultPageFor(user.role);
    });
  }, [user, can]);

  useEffect(() => {
    if (status === 'anonymous') queryClient.clear();
  }, [status]);

  if (!bridgeAvailable) return <BridgeMissing />;
  if (status === 'loading' || bootVisible) return <Splash />;
  if (status === 'anonymous' || !user) return <LoginPage />;
  if (!page) return <Splash />;

  const navigate = (next: PageKey): void => {
    if (isPageAllowed(next, user.role, can)) setPage(next);
  };
  const firstName = user.fullName.split(' ').filter(Boolean)[0] ?? user.fullName;

  return (
    <>
      <AppShell page={page} onNavigate={navigate}>
        {page === 'home' ? <HomePage onNavigate={navigate} /> : null}
        {page === 'dashboard' ? <DashboardPage onNavigate={navigate} /> : null}
        {page === 'pos' ? <PosPage onNavigate={navigate} /> : null}
        {page === 'orders' ? <OrdersPage /> : null}
        {page === 'kitchen' ? <KitchenPage /> : null}
        {page === 'invoices' ? <InvoicesPage /> : null}
        {page === 'menu' ? <MenuPage /> : null}
        {page === 'inventory' ? <InventoryPage /> : null}
        {page === 'customers' ? <CustomersPage /> : null}
        {page === 'reports' ? <ReportsPage /> : null}
        {page === 'users' ? <UsersPage /> : null}
        {page === 'settings' ? <SettingsPage /> : null}
      </AppShell>
      {entryPhase !== 'hidden' ? (
        <CoffeeLoader
          overlay
          leaving={entryPhase === 'leaving'}
          title={t('auth.splash.entryTitle')}
          subtitle={t('auth.splash.entrySubtitle', { name: firstName })}
        />
      ) : null}
    </>
  );
}

export function Root(): ReactElement {
  return (
    <QueryClientProvider client={queryClient}>
      <LanguageQuerySync />
      <Shell />
      <Toaster />
    </QueryClientProvider>
  );
}
