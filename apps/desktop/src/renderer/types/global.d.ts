import type { PharmacyBridge } from '../../shared/ipc';

declare global {
  interface Window {
    /** Preload bridge injected by the Electron shell. */
    pharmacy?: PharmacyBridge;
  }
}

export {};
