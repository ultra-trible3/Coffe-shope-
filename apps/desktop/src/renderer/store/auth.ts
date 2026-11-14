import { create } from 'zustand';
import { hasPermission as checkPermission } from '@pharmacy/shared';
import type { Permission, Role } from '@pharmacy/shared';
import type { SessionState } from '../../shared/ipc';
import { api } from '../lib/api';
import { translate } from '../i18n/dictionaries';
import { getActiveLanguage } from '../lib/language';

interface AuthState {
  status: 'loading' | 'authenticated' | 'anonymous';
  user: SessionState['user'];
  permissions: string[];
  error: string | null;
  bootstrap: () => Promise<void>;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  applySession: (state: SessionState) => void;
  can: (permission: Permission) => boolean;
  isAdmin: () => boolean;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  status: 'loading',
  user: null,
  permissions: [],
  error: null,

  applySession: (state) => {
    set({
      status: state.authenticated && state.user ? 'authenticated' : 'anonymous',
      user: state.user,
      permissions: state.permissions,
      error: null,
    });
  },

  bootstrap: async () => {
    try {
      const session = await api.session();
      get().applySession(session);
    } catch {
      set({ status: 'anonymous', user: null, permissions: [] });
    }
  },

  login: async (username, password) => {
    set({ error: null });
    try {
      const result = await api.login(username, password);
      set({
        status: 'authenticated',
        user: result.user,
        permissions: result.permissions,
        error: null,
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : translate(getActiveLanguage(), 'auth.errors.signInFailed');
      set({ status: 'anonymous', error: message });
      throw error;
    }
  },

  logout: async () => {
    await api.logout();
    set({ status: 'anonymous', user: null, permissions: [], error: null });
  },

  can: (permission) => {
    const { user } = get();
    if (!user) return false;
    return checkPermission(user.role as Role, permission);
  },

  isAdmin: () => get().user?.role === 'ADMIN',
}));
