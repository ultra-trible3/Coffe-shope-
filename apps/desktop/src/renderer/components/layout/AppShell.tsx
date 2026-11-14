import {
  BarChart3,
  Boxes,
  Coffee,
  Croissant,
  FileText,
  LayoutDashboard,
  LogOut,
  Menu as MenuIcon,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  ReceiptText,
  Settings,
  ShoppingBag,
  Users,
  Wifi,
  WifiOff,
  X,
} from 'lucide-react';
import type { ReactElement, ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { Permission, Role } from '@pharmacy/shared';
import { Button } from '../ui/button';
import { LanguageToggle } from '../ui/language-toggle';
import { ThemeToggle } from '../ui/theme-toggle';
import qahwaLogo from '../../assets/qahwa-logo.svg';
import { useI18n, type TranslationKey } from '../../i18n';
import { cn } from '../../lib/utils';
import { api } from '../../lib/api';
import { formatDate, initials, roleLabel } from '../../lib/format';
import { useAuthStore } from '../../store/auth';

export type PageKey =
  | 'home'
  | 'dashboard'
  | 'pos'
  | 'orders'
  | 'kitchen'
  | 'invoices'
  | 'menu'
  | 'inventory'
  | 'customers'
  | 'reports'
  | 'users'
  | 'settings';

interface NavItem {
  key: PageKey;
  labelKey: TranslationKey;
  icon: typeof LayoutDashboard;
  permission?: Permission;
  adminOnly?: boolean;
  roles?: readonly Role[];
}

interface NavGroup {
  labelKey: TranslationKey;
  items: NavItem[];
}

export const NAV_GROUPS: NavGroup[] = [
  {
    labelKey: 'nav.groups.shop',
    items: [{ key: 'home', labelKey: 'nav.items.home', icon: Coffee }],
  },
  {
    labelKey: 'nav.groups.operations',
    items: [
      {
        key: 'dashboard',
        labelKey: 'nav.items.dashboard',
        icon: LayoutDashboard,
        permission: 'dashboard:view',
      },
      { key: 'pos', labelKey: 'nav.items.pos', icon: ShoppingBag, permission: 'orders:create' },
      { key: 'orders', labelKey: 'nav.items.orders', icon: ReceiptText, permission: 'orders:create' },
      {
        key: 'kitchen',
        labelKey: 'nav.items.kitchen',
        icon: Coffee,
        permission: 'kitchen:view',
      },
      { key: 'invoices', labelKey: 'nav.items.invoices', icon: FileText, permission: 'invoices:read' },
    ],
  },
  {
    labelKey: 'nav.groups.restaurant',
    items: [
      { key: 'menu', labelKey: 'nav.items.menu', icon: Croissant, adminOnly: true },
      { key: 'inventory', labelKey: 'nav.items.inventory', icon: Boxes, adminOnly: true },
      { key: 'customers', labelKey: 'nav.items.customers', icon: Users, adminOnly: true },
    ],
  },
  {
    labelKey: 'nav.groups.insights',
    items: [
      {
        key: 'reports',
        labelKey: 'nav.items.reports',
        icon: BarChart3,
        permission: 'reports:view',
      },
    ],
  },
  {
    labelKey: 'nav.groups.administration',
    items: [
      { key: 'users', labelKey: 'nav.items.users', icon: Users, adminOnly: true },
      { key: 'settings', labelKey: 'nav.items.settings', icon: Settings, adminOnly: true },
    ],
  },
];

const SIDEBAR_STORAGE_KEY = 'qahwa-sidebar-collapsed';

function canSee(item: NavItem, role: string | undefined, can: (p: Permission) => boolean): boolean {
  if (item.roles && (!role || !item.roles.includes(role as Role))) return false;
  if (role !== 'ADMIN' && item.adminOnly) return false;
  if (item.permission && !can(item.permission)) return false;
  return true;
}

export function AppShell({
  page,
  onNavigate,
  children,
}: {
  page: PageKey;
  onNavigate: (page: PageKey) => void;
  children: ReactNode;
}): ReactElement {
  const { t } = useI18n();
  const { user, logout, can } = useAuthStore();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(
    () => localStorage.getItem(SIDEBAR_STORAGE_KEY) === '1',
  );
  const health = useQuery({
    queryKey: ['health'],
    queryFn: () => api.health(),
    refetchInterval: 30_000,
    retry: false,
  });
  const online = health.data?.reachable ?? false;

  useEffect(() => {
    localStorage.setItem(SIDEBAR_STORAGE_KEY, collapsed ? '1' : '0');
  }, [collapsed]);

  useEffect(() => {
    setMobileOpen(false);
  }, [page]);

  const navigate = (key: PageKey): void => {
    onNavigate(key);
    setMobileOpen(false);
  };

  const visibleGroups = NAV_GROUPS.map((group) => ({
    labelKey: group.labelKey,
    items: group.items.filter((item) => canSee(item, user?.role, can)),
  })).filter((group) => group.items.length > 0);

  const onlineLabel = online ? t('states.kitchenOnline') : t('states.serverUnreachable');

  const renderNav = (compact: boolean, includeClose: boolean): ReactElement => (
    <>
      <div
        className={cn(
          'flex pb-5 pt-6',
          compact ? 'flex-col items-center gap-2 px-2' : 'items-center gap-3 px-5',
        )}
      >
        <img
          src={qahwaLogo}
          alt=""
          className={cn(
            'shrink-0 rounded-full shadow-lg shadow-black/30 ring-1 ring-white/10',
            compact ? 'h-9 w-9' : 'h-10 w-10',
          )}
        />
        {compact ? (
          <button
            type="button"
            onClick={() => setCollapsed(false)}
            className="hidden rounded-md p-1.5 text-sidebar-muted transition-colors hover:bg-sidebar-active hover:text-sidebar-foreground lg:inline-flex"
            aria-label={t('nav.aria.expandNavigation')}
            aria-controls="app-sidebar"
            aria-expanded="false"
            title={t('nav.aria.expandNavigation')}
          >
            <PanelLeftOpen className="h-4 w-4 rtl:-scale-x-100" />
          </button>
        ) : (
          <>
            <div className="min-w-0 leading-tight">
              <p className="truncate font-display text-xl tracking-[0.14em] text-sidebar-foreground">
                {t('app.name')}
              </p>
              <p className="truncate text-[11px] font-medium uppercase tracking-[0.14em] text-sidebar-muted">
                {t('app.company')}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setCollapsed(true)}
              className="ms-auto hidden rounded-md p-1.5 text-sidebar-muted transition-colors hover:bg-sidebar-active hover:text-sidebar-foreground lg:inline-flex"
              aria-label={t('nav.aria.collapseNavigation')}
              aria-controls="app-sidebar"
              aria-expanded="true"
              title={t('nav.aria.collapseNavigation')}
            >
              <PanelLeftClose className="h-4 w-4 rtl:-scale-x-100" />
            </button>
          </>
        )}
        {includeClose ? (
          <button
            type="button"
            className="ms-auto rounded-md p-1.5 text-sidebar-muted hover:bg-sidebar-active hover:text-sidebar-foreground lg:hidden"
            onClick={() => setMobileOpen(false)}
            aria-label={t('nav.aria.closeNavigation')}
          >
            <X className="h-5 w-5" />
          </button>
        ) : null}
      </div>

      <nav
        className={cn('sidebar-scroll flex-1 overflow-y-auto pb-4', compact ? 'px-2' : 'px-3')}
        aria-label={t('nav.aria.mainNavigation')}
      >
        {visibleGroups.map((group, index) => (
          <div
            key={group.labelKey}
            className={cn(
              index > 0 && (compact ? 'mt-2 border-t border-white/5 pt-2' : 'mt-5'),
            )}
          >
            {compact ? null : (
              <p className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-sidebar-muted/80">
                {t(group.labelKey)}
              </p>
            )}
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon;
                const active = page === item.key;
                const label = t(item.labelKey);
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => navigate(item.key)}
                    aria-current={active ? 'page' : undefined}
                    aria-label={compact ? label : undefined}
                    title={compact ? label : undefined}
                    className={cn(
                      'focus-ring relative flex w-full items-center rounded-lg text-[13px] font-medium transition-colors',
                      compact ? 'justify-center px-0 py-2.5' : 'gap-3 px-3 py-2',
                      active
                        ? 'bg-sidebar-active text-sidebar-foreground shadow-inner'
                        : 'text-sidebar-muted hover:bg-sidebar-active/70 hover:text-sidebar-foreground',
                    )}
                  >
                    <Icon
                      className={cn('h-[17px] w-[17px] shrink-0', active && 'text-brand-orange')}
                    />
                    {compact ? null : <span className="truncate">{label}</span>}
                    {active && !compact ? (
                      <span className="ms-auto h-1.5 w-1.5 rounded-full bg-brand-orange" />
                    ) : null}
                    {active && compact ? (
                      <span
                        aria-hidden="true"
                        className="absolute start-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-brand-orange"
                      />
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className={cn('space-y-3 border-t border-white/5 p-3', compact && 'px-2')}>
        <div
          title={
            compact
              ? `${onlineLabel}${
                  health.data?.latencyMs !== undefined ? ` · ${health.data.latencyMs}ms` : ''
                }`
              : undefined
          }
          className={cn(
            'flex items-center rounded-lg text-[11px] font-medium',
            compact ? 'justify-center px-0 py-2' : 'gap-2 px-3 py-2',
            online ? 'bg-emerald-400/10 text-emerald-300' : 'bg-red-400/10 text-red-300',
          )}
        >
          {online ? (
            <Wifi className="h-3.5 w-3.5 shrink-0" />
          ) : (
            <WifiOff className="h-3.5 w-3.5 shrink-0" />
          )}
          {compact ? null : <span>{onlineLabel}</span>}
          {!compact && health.data?.latencyMs !== undefined ? (
            <span className="numeric ms-auto opacity-70">{health.data.latencyMs}ms</span>
          ) : null}
        </div>

        {compact ? (
          <div className="flex flex-col items-center gap-2 py-1">
            <span
              title={user?.fullName}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs font-bold text-sidebar-foreground"
            >
              {initials(user?.fullName)}
            </span>
            <button
              type="button"
              onClick={() => void logout()}
              className="rounded-md p-1.5 text-sidebar-muted transition-colors hover:bg-sidebar-active hover:text-sidebar-foreground"
              aria-label={t('actions.signOut')}
              title={t('actions.signOut')}
            >
              <LogOut className="h-4 w-4 rtl:-scale-x-100" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-3 rounded-lg px-2 py-1.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs font-bold text-sidebar-foreground">
              {initials(user?.fullName)}
            </span>
            <div className="min-w-0 flex-1 leading-tight">
              <p className="truncate text-[13px] font-semibold text-sidebar-foreground">
                {user?.fullName}
              </p>
              <p className="text-[11px] text-sidebar-muted">
                {user ? roleLabel(user.role as Role) : ''}
              </p>
            </div>
            <button
              type="button"
              onClick={() => void logout()}
              className="rounded-md p-1.5 text-sidebar-muted transition-colors hover:bg-sidebar-active hover:text-sidebar-foreground"
              aria-label={t('actions.signOut')}
              title={t('actions.signOut')}
            >
              <LogOut className="h-4 w-4 rtl:-scale-x-100" />
            </button>
          </div>
        )}
      </div>
    </>
  );

  return (
    <div className="flex h-full min-h-screen bg-background">
      <aside
        id="app-sidebar"
        aria-label={t('nav.aria.primaryNavigation')}
        className={cn(
          'hidden shrink-0 flex-col overflow-hidden bg-sidebar transition-[width] duration-200 ease-out lg:flex',
          collapsed ? 'w-[76px]' : 'w-[248px]',
        )}
      >
        {renderNav(collapsed, false)}
      </aside>

      {mobileOpen ? (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div
            className="absolute inset-0 bg-black/50 animate-fade-in"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
          <aside className="relative flex h-full w-[268px] flex-col bg-sidebar shadow-pop animate-slide-up">
            {renderNav(false, true)}
          </aside>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex min-h-16 items-center gap-3 border-b border-border bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/80 md:px-6">
          <button
            type="button"
            className="rounded-md p-2 text-muted-foreground hover:bg-muted lg:hidden"
            onClick={() => setMobileOpen(true)}
            aria-label={t('nav.aria.openNavigation')}
          >
            <MenuIcon className="h-5 w-5" />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="truncate font-display text-xl tracking-[0.02em] md:text-2xl">
              {t(`nav.items.${page}`)}
            </h1>
            <p className="hidden truncate text-xs text-muted-foreground sm:block">
              {t(`nav.subtitles.${page}`)}
            </p>
          </div>
          <span className="hidden text-xs font-medium text-muted-foreground md:block">
            {formatDate(new Date())}
          </span>
          <LanguageToggle />
          <ThemeToggle />
          {can('orders:create') ? (
            <Button size="sm" onClick={() => navigate('pos')} className="shrink-0">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">{t('actions.newOrder')}</span>
            </Button>
          ) : null}
        </header>
        <main className="min-h-0 flex-1 overflow-auto">
          <div className="mx-auto w-full max-w-[1600px] p-4 md:p-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
