import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Coffee,
  KeyRound,
  Pencil,
  Plus,
  Search,
  ShieldCheck,
  UserMinus,
  UserRound,
  X,
} from 'lucide-react';
import { useEffect, useState, type ReactElement } from 'react';
import {
  createUserSchema,
  resetPasswordSchema,
  type Role,
  type UserDto,
} from '@pharmacy/shared';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { ConfirmDialog } from '../components/ui/confirm-dialog';
import { Dialog, DialogContent, DialogFooter } from '../components/ui/dialog';
import { Input, Select } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Pagination } from '../components/ui/pagination';
import { EmptyPanel, ErrorState } from '../components/ui/states';
import { Skeleton, SkeletonTable } from '../components/ui/skeleton';
import { toast } from '../components/ui/toast';
import { useI18n } from '../i18n';
import { api, type CreateUserBody } from '../lib/api';
import { formatDateTime, formatNumber, initials, roleLabel } from '../lib/format';
import { useAuthStore } from '../store/auth';

const PAGE_SIZE = 20;

interface CreateFormState {
  username: string;
  fullName: string;
  email: string;
  role: Role;
  password: string;
}

const EMPTY_CREATE: CreateFormState = {
  username: '',
  fullName: '',
  email: '',
  role: 'CASHIER',
  password: '',
};

interface EditFormState {
  fullName: string;
  email: string;
  role: Role;
  isActive: boolean;
}

export function UsersPage(): ReactElement {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((state) => state.user);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [role, setRole] = useState<Role | ''>('');
  const [active, setActive] = useState<'all' | 'active' | 'inactive'>('all');

  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<CreateFormState>(EMPTY_CREATE);
  const [createError, setCreateError] = useState<string | null>(null);

  const [editing, setEditing] = useState<UserDto | null>(null);
  const [editForm, setEditForm] = useState<EditFormState>({
    fullName: '',
    email: '',
    role: 'CASHIER',
    isActive: true,
  });
  const [editOpen, setEditOpen] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const [resetTarget, setResetTarget] = useState<UserDto | null>(null);
  const [resetPassword, setResetPassword] = useState('');
  const [resetConfirm, setResetConfirm] = useState('');
  const [resetError, setResetError] = useState<string | null>(null);

  const [deactivateTarget, setDeactivateTarget] = useState<UserDto | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, role, active]);

  const users = useQuery({
    queryKey: ['users', 'list', { page, debouncedSearch, role, active }],
    queryFn: () =>
      api.users.list({
        page,
        pageSize: PAGE_SIZE,
        search: debouncedSearch || undefined,
        role: role || undefined,
        isActive: active === 'all' ? undefined : active === 'active',
      }),
    placeholderData: (previous) => previous,
  });

  const invalidateUsers = (): void => {
    void queryClient.invalidateQueries({ queryKey: ['users'] });
  };

  const createUser = useMutation({
    mutationFn: (form: CreateFormState) => {
      const parsed = createUserSchema.safeParse({
        username: form.username,
        fullName: form.fullName,
        email: form.email.trim() ? form.email : undefined,
        role: form.role,
        password: form.password,
      });
      if (!parsed.success) {
        throw new Error(parsed.error.issues[0]?.message ?? t('users.errors.details'));
      }
      const body: CreateUserBody = {
        username: parsed.data.username,
        fullName: parsed.data.fullName,
        role: parsed.data.role,
        password: parsed.data.password,
        ...(parsed.data.email ? { email: parsed.data.email } : {}),
      };
      return api.users.create(body);
    },
    onSuccess: (user) => {
      invalidateUsers();
      toast.success(t('users.toasts.created'), user.fullName);
      setCreateOpen(false);
      setCreateForm(EMPTY_CREATE);
      setCreateError(null);
    },
    onError: (error) => {
      setCreateError(error instanceof Error ? error.message : t('users.errors.create'));
    },
  });

  const updateUser = useMutation({
    mutationFn: (args: { user: UserDto; form: EditFormState }) =>
      api.users.update(args.user.id, {
        fullName: args.form.fullName.trim(),
        email: args.form.email.trim() ? args.form.email.trim() : null,
        ...(args.user.id === currentUser?.id ? {} : { role: args.form.role }),
        ...(args.user.id === currentUser?.id ? {} : { isActive: args.form.isActive }),
      }),
    onSuccess: (user) => {
      invalidateUsers();
      toast.success(t('users.toasts.updated'), user.fullName);
      setEditOpen(false);
      setEditError(null);
    },
    onError: (error) => {
      setEditError(error instanceof Error ? error.message : t('users.errors.update'));
    },
  });

  const resetUserPassword = useMutation({
    mutationFn: (args: { user: UserDto; password: string }) => {
      const parsed = resetPasswordSchema.safeParse({
        newPassword: args.password,
        mustChangePassword: true,
      });
      if (!parsed.success) {
        throw new Error(parsed.error.issues[0]?.message ?? t('users.errors.password'));
      }
      return api.users.resetPassword(args.user.id, parsed.data.newPassword);
    },
    onSuccess: () => {
      toast.success(
        t('users.toasts.resetTitle'),
        t('users.toasts.resetMessage', {
          name: resetTarget?.fullName ?? t('users.toasts.resetDefaultName'),
        }),
      );
      setResetTarget(null);
      setResetPassword('');
      setResetConfirm('');
      setResetError(null);
    },
    onError: (error) => {
      setResetError(error instanceof Error ? error.message : t('users.errors.reset'));
    },
  });

  const deactivate = useMutation({
    mutationFn: (user: UserDto) => api.users.deactivate(user.id),
    onSuccess: () => {
      invalidateUsers();
      toast.success(t('users.toasts.deactivated'));
      setDeactivateTarget(null);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : t('users.errors.deactivate'));
      setDeactivateTarget(null);
    },
  });

  const openEdit = (user: UserDto): void => {
    setEditing(user);
    setEditForm({
      fullName: user.fullName,
      email: user.email ?? '',
      role: user.role,
      isActive: user.isActive,
    });
    setEditError(null);
    setEditOpen(true);
  };

  const openReset = (user: UserDto): void => {
    setResetTarget(user);
    setResetPassword('');
    setResetConfirm('');
    setResetError(null);
  };

  const activeFilterApplied = Boolean(debouncedSearch) || Boolean(role) || active !== 'all';
  const editIsSelf = editing?.id === currentUser?.id;

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-card shadow-sm">
        <div className="flex flex-wrap items-center gap-2 border-b border-border p-3">
          <div className="relative min-w-[220px] flex-1">
            <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={t('users.searchPlaceholder')}
              className="h-9 ps-9"
              aria-label={t('users.searchAria')}
            />
            {search ? (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute end-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:bg-muted"
                aria-label={t('users.clearSearch')}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            ) : null}
          </div>

          <Select
            aria-label={t('users.filterRoleAria')}
            className="h-9 w-[150px]"
            value={role}
            onChange={(event) => setRole(event.target.value as Role | '')}
          >
            <option value="">{t('users.allRoles')}</option>
            <option value="ADMIN">{t('users.roles.ADMIN')}</option>
            <option value="CASHIER">{t('users.roles.CASHIER')}</option>
            <option value="KITCHEN_STAFF">{t('users.roles.KITCHEN_STAFF')}</option>
          </Select>

          <Select
            aria-label={t('users.filterStatusAria')}
            className="h-9 w-[140px]"
            value={active}
            onChange={(event) => setActive(event.target.value as 'all' | 'active' | 'inactive')}
          >
            <option value="all">{t('users.allStatuses')}</option>
            <option value="active">{t('users.activeOnly')}</option>
            <option value="inactive">{t('users.inactiveOnly')}</option>
          </Select>

          {users.data ? (
            <span className="text-xs text-muted-foreground">
              {t('users.count', { count: formatNumber(users.data.total) })}
            </span>
          ) : (
            <Skeleton className="h-3 w-16" />
          )}

          <Button
            size="sm"
            onClick={() => {
              setCreateForm(EMPTY_CREATE);
              setCreateError(null);
              setCreateOpen(true);
            }}
          >
            <Plus className="h-4 w-4" />
            {t('users.new')}
          </Button>
        </div>

        {users.isLoading ? (
          <SkeletonTable
            label={t('users.loading')}
            rows={7}
            columns={[
              { kind: 'avatar', label: t('users.columns.staff') },
              { kind: 'muted', label: t('users.columns.email') },
              { kind: 'badge', label: t('users.columns.role') },
              { kind: 'badge', label: t('users.columns.status') },
              { kind: 'muted', label: t('users.columns.lastSignIn') },
              { kind: 'muted', label: t('users.columns.created') },
              { kind: 'actions' },
            ]}
          />
        ) : users.isError ? (
          <div className="p-4">
            <ErrorState
              title={t('users.errors.load')}
              message={users.error instanceof Error ? users.error.message : undefined}
              onRetry={() => void users.refetch()}
            />
          </div>
        ) : users.data && users.data.items.length === 0 ? (
          <EmptyPanel
            title={activeFilterApplied ? t('users.empty.filtered') : t('users.empty.title')}
            message={t('users.empty.message')}
            action={
              <Button size="sm" onClick={() => setCreateOpen(true)}>
                <Plus className="h-4 w-4" />
                {t('users.new')}
              </Button>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-start text-[11px] uppercase tracking-wide text-muted-foreground">
                  <th className="px-3 py-2.5 font-semibold">{t('users.columns.staff')}</th>
                  <th className="px-3 py-2.5 font-semibold">{t('users.columns.email')}</th>
                  <th className="px-3 py-2.5 font-semibold">{t('users.columns.role')}</th>
                  <th className="px-3 py-2.5 font-semibold">{t('users.columns.status')}</th>
                  <th className="px-3 py-2.5 font-semibold">{t('users.columns.lastSignIn')}</th>
                  <th className="px-3 py-2.5 font-semibold">{t('users.columns.created')}</th>
                  <th className="px-3 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {users.data!.items.map((user) => {
                  const isSelf = user.id === currentUser?.id;
                  return (
                    <tr key={user.id} className="border-b border-border/70 last:border-0 hover:bg-muted/40">
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-2.5">
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-bold text-primary">
                            {initials(user.fullName)}
                          </span>
                          <div className="min-w-0">
                            <p className="flex items-center gap-1.5 truncate font-semibold">
                              {user.fullName}
                              {isSelf ? (
                                <span className="rounded-full bg-info/10 px-1.5 py-0.5 text-[10px] font-semibold text-info">
                                  {t('users.you')}
                                </span>
                              ) : null}
                            </p>
                            <p className="numeric text-[11px] text-muted-foreground">@{user.username}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-xs text-muted-foreground">{user.email ?? '—'}</td>
                      <td className="px-3 py-2.5">
                        <Badge variant={user.role === 'ADMIN' ? 'default' : 'outline'}>
                          {user.role === 'ADMIN' ? (
                            <ShieldCheck className="me-1 h-3 w-3" />
                          ) : user.role === 'KITCHEN_STAFF' ? (
                            <Coffee className="me-1 h-3 w-3" />
                          ) : (
                            <UserRound className="me-1 h-3 w-3" />
                          )}
                          {roleLabel(user.role)}
                        </Badge>
                      </td>
                      <td className="px-3 py-2.5">
                        <Badge variant={user.isActive ? 'success' : 'destructive'}>
                          {user.isActive ? t('users.status.active') : t('users.status.inactive')}
                        </Badge>
                      </td>
                      <td className="px-3 py-2.5 text-xs text-muted-foreground">
                        {user.lastLoginAt
                          ? formatDateTime(user.lastLoginAt)
                          : t('users.never')}
                      </td>
                      <td className="px-3 py-2.5 text-xs text-muted-foreground">
                        {formatDateTime(user.createdAt)}
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEdit(user)}
                            aria-label={t('users.editAria', { name: user.fullName })}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          {!isSelf ? (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openReset(user)}
                                aria-label={t('users.resetAria', { name: user.fullName })}
                                title={t('users.resetAction')}
                              >
                                <KeyRound className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-destructive hover:bg-destructive/10"
                                onClick={() => setDeactivateTarget(user)}
                                aria-label={t('users.deactivateAria', { name: user.fullName })}
                                title={t('users.deactivateAction')}
                                disabled={!user.isActive}
                              >
                                <UserMinus className="h-3.5 w-3.5" />
                              </Button>
                            </>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {users.data && users.data.total > 0 ? (
          <Pagination
            page={users.data.page}
            pageSize={users.data.pageSize}
            total={users.data.total}
            totalPages={users.data.totalPages}
            onPageChange={setPage}
          />
        ) : null}
      </div>

      <p className="text-[11px] text-muted-foreground">{t('users.footer')}</p>

      <Dialog
        open={createOpen}
        onOpenChange={(open) => {
          setCreateOpen(open);
          if (!open) setCreateError(null);
        }}
      >
        <DialogContent
          title={t('users.create.title')}
          description={t('users.create.description')}
          className="max-w-lg"
        >
          <form
            className="space-y-3"
            onSubmit={(event) => {
              event.preventDefault();
              createUser.mutate(createForm);
            }}
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="staff-fullname">{t('users.create.fullName')}</Label>
                <Input
                  id="staff-fullname"
                  value={createForm.fullName}
                  onChange={(event) => setCreateForm({ ...createForm, fullName: event.target.value })}
                  placeholder={t('users.create.fullNamePlaceholder')}
                  maxLength={128}
                  required
                  autoFocus
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="staff-username">{t('users.create.username')}</Label>
                <Input
                  id="staff-username"
                  value={createForm.username}
                  onChange={(event) =>
                    setCreateForm({ ...createForm, username: event.target.value.toLowerCase() })
                  }
                  placeholder={t('users.create.usernamePlaceholder')}
                  maxLength={64}
                  autoComplete="off"
                  dir="ltr"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="staff-email">{t('users.create.email')}</Label>
              <Input
                id="staff-email"
                type="email"
                value={createForm.email}
                onChange={(event) => setCreateForm({ ...createForm, email: event.target.value })}
                placeholder={t('users.create.emailPlaceholder')}
                maxLength={255}
                dir="ltr"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="staff-role">{t('users.create.role')}</Label>
              <Select
                id="staff-role"
                value={createForm.role}
                onChange={(event) => setCreateForm({ ...createForm, role: event.target.value as Role })}
              >
                <option value="CASHIER">{t('users.create.roleOptions.CASHIER')}</option>
                <option value="KITCHEN_STAFF">{t('users.create.roleOptions.KITCHEN_STAFF')}</option>
                <option value="ADMIN">{t('users.create.roleOptions.ADMIN')}</option>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="staff-password">{t('users.create.password')}</Label>
              <Input
                id="staff-password"
                type="password"
                value={createForm.password}
                onChange={(event) => setCreateForm({ ...createForm, password: event.target.value })}
                placeholder={t('users.create.passwordPlaceholder')}
                autoComplete="new-password"
                minLength={8}
                required
              />
              <p className="text-[11px] text-muted-foreground">{t('users.create.passwordHint')}</p>
            </div>

            {createError ? (
              <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive" role="alert">
                {createError}
              </p>
            ) : null}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                {t('actions.cancel')}
              </Button>
              <Button type="submit" disabled={createUser.isPending}>
                {createUser.isPending ? t('users.create.submitting') : t('users.create.submit')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={editOpen}
        onOpenChange={(open) => {
          setEditOpen(open);
          if (!open) {
            setEditError(null);
            setEditing(null);
          }
        }}
      >
        <DialogContent
          title={
            editing
              ? t('users.edit.title', { name: editing.fullName })
              : t('users.edit.fallbackTitle')
          }
          description={t('users.edit.description')}
          className="max-w-lg"
        >
          {editing ? (
            <form
              className="space-y-3"
              onSubmit={(event) => {
                event.preventDefault();
                updateUser.mutate({ user: editing, form: editForm });
              }}
            >
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="edit-fullname">{t('users.edit.fullName')}</Label>
                  <Input
                    id="edit-fullname"
                    value={editForm.fullName}
                    onChange={(event) => setEditForm({ ...editForm, fullName: event.target.value })}
                    maxLength={128}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="edit-username">{t('users.edit.username')}</Label>
                  <Input id="edit-username" value={editing.username} readOnly disabled dir="ltr" />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="edit-email">{t('users.edit.email')}</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={editForm.email}
                  onChange={(event) => setEditForm({ ...editForm, email: event.target.value })}
                  placeholder={t('users.edit.emailPlaceholder')}
                  maxLength={255}
                  dir="ltr"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="edit-role">{t('users.edit.role')}</Label>
                <Select
                  id="edit-role"
                  value={editForm.role}
                  disabled={editIsSelf}
                  onChange={(event) => setEditForm({ ...editForm, role: event.target.value as Role })}
                >
                  <option value="CASHIER">{roleLabel('CASHIER')}</option>
                  <option value="KITCHEN_STAFF">{roleLabel('KITCHEN_STAFF')}</option>
                  <option value="ADMIN">{roleLabel('ADMIN')}</option>
                </Select>
                {editIsSelf ? (
                  <p className="text-[11px] text-muted-foreground">{t('users.edit.selfRoleHint')}</p>
                ) : null}
              </div>

              <label
                className={`flex items-center gap-3 rounded-lg border border-border px-3 py-2.5 ${
                  editIsSelf ? 'opacity-60' : 'cursor-pointer'
                }`}
              >
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-[hsl(var(--primary))]"
                  checked={editForm.isActive}
                  disabled={editIsSelf}
                  onChange={(event) => setEditForm({ ...editForm, isActive: event.target.checked })}
                />
                <span className="text-sm">
                  <span className="block font-medium">{t('users.edit.active')}</span>
                  <span className="block text-[11px] text-muted-foreground">
                    {t('users.edit.activeHint')}
                  </span>
                </span>
              </label>

              {editError ? (
                <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive" role="alert">
                  {editError}
                </p>
              ) : null}

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>
                  {t('actions.cancel')}
                </Button>
                <Button type="submit" disabled={updateUser.isPending || editForm.fullName.trim().length < 2}>
                  {updateUser.isPending ? t('actions.saving') : t('users.edit.submit')}
                </Button>
              </DialogFooter>
            </form>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(resetTarget)}
        onOpenChange={(open) => {
          if (!open) setResetTarget(null);
        }}
      >
        <DialogContent
          title={t('users.reset.title')}
          description={
            resetTarget
              ? t('users.reset.description', { name: resetTarget.fullName })
              : undefined
          }
          className="max-w-md"
        >
          <form
            className="space-y-3"
            onSubmit={(event) => {
              event.preventDefault();
              if (resetPassword !== resetConfirm) {
                setResetError(t('users.errors.mismatch'));
                return;
              }
              if (resetTarget) resetUserPassword.mutate({ user: resetTarget, password: resetPassword });
            }}
          >
            <div className="space-y-1.5">
              <Label htmlFor="reset-password">{t('users.reset.newPassword')}</Label>
              <Input
                id="reset-password"
                type="password"
                value={resetPassword}
                onChange={(event) => setResetPassword(event.target.value)}
                autoComplete="new-password"
                minLength={8}
                required
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="reset-confirm">{t('users.reset.confirm')}</Label>
              <Input
                id="reset-confirm"
                type="password"
                value={resetConfirm}
                onChange={(event) => setResetConfirm(event.target.value)}
                autoComplete="new-password"
                minLength={8}
                required
              />
            </div>
            <p className="text-[11px] text-muted-foreground">{t('users.reset.hint')}</p>

            {resetError ? (
              <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive" role="alert">
                {resetError}
              </p>
            ) : null}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setResetTarget(null)}>
                {t('actions.cancel')}
              </Button>
              <Button type="submit" disabled={resetUserPassword.isPending}>
                {resetUserPassword.isPending
                  ? t('users.reset.submitting')
                  : t('users.reset.submit')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={Boolean(deactivateTarget)}
        onOpenChange={(open) => {
          if (!open) setDeactivateTarget(null);
        }}
        title={t('users.deactivateDialog.title')}
        description={
          <span>
            <strong className="text-foreground">{deactivateTarget?.fullName}</strong>{' '}
            {t('users.deactivateDialog.description')}
          </span>
        }
        confirmLabel={t('users.deactivateDialog.confirm')}
        destructive
        busy={deactivate.isPending}
        onConfirm={() => {
          if (deactivateTarget) deactivate.mutate(deactivateTarget);
        }}
      />
    </div>
  );
}
