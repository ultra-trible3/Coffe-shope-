import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Eye,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Plus,
  ReceiptText,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { useEffect, useState, type ReactElement } from 'react';
import { customerCreateSchema, customerUpdateSchema, type CustomerDto, type OrderDto } from '@pharmacy/shared';
import { OrderDetailDialog } from '../components/orders/OrderDetailDialog';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { ConfirmDialog } from '../components/ui/confirm-dialog';
import { Dialog, DialogContent, DialogFooter } from '../components/ui/dialog';
import { Input, Textarea } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Pagination } from '../components/ui/pagination';
import { EmptyPanel, ErrorState } from '../components/ui/states';
import { Skeleton, SkeletonTable } from '../components/ui/skeleton';
import { OrderStatusBadge, PaymentBadge } from '../components/ui/status-badge';
import { toast } from '../components/ui/toast';
import { useI18n } from '../i18n';
import { api } from '../lib/api';
import {
  formatDateTime,
  formatMoney,
  formatNumber,
  initials,
  orderTypeLabel,
} from '../lib/format';

const PAGE_SIZE = 20;

interface FormState {
  name: string;
  phone: string;
  address: string;
  notes: string;
}

const EMPTY_FORM: FormState = { name: '', phone: '', address: '', notes: '' };

export function CustomersPage(): ReactElement {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<CustomerDto | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);

  const [detailId, setDetailId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<OrderDto | null>(null);
  const [orderOpen, setOrderOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<CustomerDto | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  const customers = useQuery({
    queryKey: ['customers', 'list', { page, debouncedSearch }],
    queryFn: () =>
      api.customers.list({
        page,
        pageSize: PAGE_SIZE,
        q: debouncedSearch || undefined,
      }),
    placeholderData: (previous) => previous,
  });

  const detail = useQuery({
    queryKey: ['customers', 'detail', detailId],
    queryFn: () => api.customers.get(detailId!),
    enabled: Boolean(detailId),
  });

  const save = useMutation({
    mutationFn: async (input: FormState) => {
      if (editing) {
        const parsed = customerUpdateSchema.safeParse({
          name: input.name,
          phone: input.phone.trim() || null,
          address: input.address.trim() || null,
          notes: input.notes.trim() || null,
        });
        if (!parsed.success) {
          throw new Error(parsed.error.issues[0]?.message ?? t('customers.errors.details'));
        }
        return api.customers.update(editing.id, parsed.data);
      }
      const parsed = customerCreateSchema.safeParse(input);
      if (!parsed.success) {
        throw new Error(parsed.error.issues[0]?.message ?? t('customers.errors.details'));
      }
      return api.customers.create(parsed.data);
    },
    onSuccess: (customer) => {
      void queryClient.invalidateQueries({ queryKey: ['customers'] });
      toast.success(
        t(editing ? 'customers.toasts.updated' : 'customers.toasts.created'),
        customer.name,
      );
      setFormOpen(false);
      setFormError(null);
    },
    onError: (error) => {
      setFormError(error instanceof Error ? error.message : t('customers.errors.save'));
    },
  });

  const remove = useMutation({
    mutationFn: (customer: CustomerDto) => api.customers.remove(customer.id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['customers'] });
      toast.success(t('customers.toasts.deleted'));
      setPendingDelete(null);
      if (detailId === pendingDelete?.id) {
        setDetailOpen(false);
        setDetailId(null);
      }
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : t('customers.errors.delete'));
      setPendingDelete(null);
    },
  });

  const openCreate = (): void => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormError(null);
    setFormOpen(true);
  };

  const openEdit = (customer: CustomerDto): void => {
    setEditing(customer);
    setForm({
      name: customer.name,
      phone: customer.phone ?? '',
      address: customer.address ?? '',
      notes: customer.notes ?? '',
    });
    setFormError(null);
    setFormOpen(true);
  };

  const openDetail = (id: string): void => {
    setDetailId(id);
    setDetailOpen(true);
  };

  const activeDetail = detail.data;

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-card shadow-sm">
        <div className="flex flex-wrap items-center gap-2 border-b border-border p-3">
          <div className="relative min-w-[220px] flex-1">
            <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={t('customers.searchPlaceholder')}
              className="h-9 ps-9"
              aria-label={t('customers.searchAria')}
            />
            {search ? (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute end-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:bg-muted"
                aria-label={t('customers.clearSearch')}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            ) : null}
          </div>
          {customers.data ? (
            <span className="text-xs text-muted-foreground">
              {t('customers.count', { count: formatNumber(customers.data.total) })}
            </span>
          ) : (
            <Skeleton className="h-3 w-14" />
          )}
          <Button size="sm" onClick={openCreate}>
            <Plus className="h-4 w-4" />
            {t('customers.new')}
          </Button>
        </div>

        {customers.isLoading ? (
          <SkeletonTable
            label={t('customers.loading')}
            rows={8}
            columns={[
              { kind: 'avatar', label: t('customers.columns.guest') },
              { kind: 'text', label: t('customers.columns.contact') },
              { kind: 'muted', label: t('customers.columns.address') },
              { kind: 'amount', label: t('customers.columns.orders') },
              { kind: 'amount', label: t('customers.columns.totalSpent') },
              { kind: 'muted', label: t('customers.columns.lastOrder') },
              { kind: 'actions' },
            ]}
          />
        ) : customers.isError ? (
          <div className="p-4">
            <ErrorState
              title={t('customers.errors.load')}
              message={customers.error instanceof Error ? customers.error.message : undefined}
              onRetry={() => void customers.refetch()}
            />
          </div>
        ) : customers.data && customers.data.items.length === 0 ? (
          <EmptyPanel
            title={
              debouncedSearch ? t('customers.empty.searchTitle') : t('customers.empty.title')
            }
            message={
              debouncedSearch ? t('customers.empty.searchMessage') : t('customers.empty.message')
            }
            action={
              debouncedSearch ? (
                <Button variant="outline" size="sm" onClick={() => setSearch('')}>
                  {t('customers.clearSearch')}
                </Button>
              ) : (
                <Button size="sm" onClick={openCreate}>
                  <Plus className="h-4 w-4" />
                  {t('customers.new')}
                </Button>
              )
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-start text-[11px] uppercase tracking-wide text-muted-foreground">
                  <th className="px-3 py-2.5 font-semibold">{t('customers.columns.guest')}</th>
                  <th className="px-3 py-2.5 font-semibold">{t('customers.columns.contact')}</th>
                  <th className="px-3 py-2.5 font-semibold">{t('customers.columns.address')}</th>
                  <th className="px-3 py-2.5 text-end font-semibold">{t('customers.columns.orders')}</th>
                  <th className="px-3 py-2.5 text-end font-semibold">{t('customers.columns.totalSpent')}</th>
                  <th className="px-3 py-2.5 font-semibold">{t('customers.columns.lastOrder')}</th>
                  <th className="px-3 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {customers.data!.items.map((customer) => (
                  <tr key={customer.id} className="border-b border-border/70 last:border-0 hover:bg-muted/40">
                    <td className="px-3 py-2.5">
                      <button
                        type="button"
                        onClick={() => openDetail(customer.id)}
                        className="flex items-center gap-2.5 text-start"
                      >
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-bold text-primary">
                          {initials(customer.name)}
                        </span>
                        <span className="min-w-0">
                          <span className="block max-w-[180px] truncate font-semibold">{customer.name}</span>
                          <span className="block text-[11px] text-muted-foreground">
                            {customer.ordersCount > 0
                              ? t('customers.returning')
                              : t('customers.newGuest')}
                          </span>
                        </span>
                      </button>
                    </td>
                    <td className="px-3 py-2.5">
                      <p className="numeric text-xs">{customer.phone ?? '—'}</p>
                    </td>
                    <td className="px-3 py-2.5">
                      <p className="max-w-[200px] truncate text-xs text-muted-foreground">
                        {customer.address ?? '—'}
                      </p>
                    </td>
                    <td className="numeric px-3 py-2.5 text-end">
                      {customer.ordersCount > 0 ? (
                        <Badge variant="outline">{formatNumber(customer.ordersCount)}</Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">0</span>
                      )}
                    </td>
                    <td className="numeric px-3 py-2.5 text-end font-semibold">
                      {formatMoney(customer.totalSpent)}
                    </td>
                    <td className="px-3 py-2.5 text-xs text-muted-foreground">
                      {customer.lastOrderAt
                        ? formatDateTime(customer.lastOrderAt)
                        : t('customers.noOrders')}
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openDetail(customer.id)}
                          aria-label={t('customers.viewAria', { name: customer.name })}
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEdit(customer)}
                          aria-label={t('customers.editAria', { name: customer.name })}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:bg-destructive/10"
                          onClick={() => setPendingDelete(customer)}
                          aria-label={t('customers.deleteAria', { name: customer.name })}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {customers.data && customers.data.total > 0 ? (
          <Pagination
            page={customers.data.page}
            pageSize={customers.data.pageSize}
            total={customers.data.total}
            totalPages={customers.data.totalPages}
            onPageChange={setPage}
          />
        ) : null}
      </div>

      <Dialog
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) setFormError(null);
        }}
      >
        <DialogContent
          title={editing ? t('customers.form.editTitle') : t('customers.form.createTitle')}
          description={
            editing ? t('customers.form.editDescription') : t('customers.form.createDescription')
          }
          className="max-w-lg"
        >
          <form
            className="space-y-3"
            onSubmit={(event) => {
              event.preventDefault();
              save.mutate(form);
            }}
          >
            <div className="space-y-1.5">
              <Label htmlFor="customer-name">{t('customers.form.name')}</Label>
              <Input
                id="customer-name"
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
                placeholder={t('customers.form.namePlaceholder')}
                maxLength={120}
                required
                autoFocus
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="customer-phone">{t('customers.form.phone')}</Label>
                <Input
                  id="customer-phone"
                  type="tel"
                  value={form.phone}
                  onChange={(event) => setForm({ ...form, phone: event.target.value })}
                  placeholder={t('customers.form.phonePlaceholder')}
                  maxLength={30}
                  dir="ltr"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="customer-address">{t('customers.form.address')}</Label>
                <Input
                  id="customer-address"
                  value={form.address}
                  onChange={(event) => setForm({ ...form, address: event.target.value })}
                  placeholder={t('customers.form.addressPlaceholder')}
                  maxLength={300}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="customer-notes">{t('customers.form.notes')}</Label>
              <Textarea
                id="customer-notes"
                value={form.notes}
                onChange={(event) => setForm({ ...form, notes: event.target.value })}
                placeholder={t('customers.form.notesPlaceholder')}
                maxLength={500}
                rows={3}
              />
            </div>

            {formError ? (
              <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive" role="alert">
                {formError}
              </p>
            ) : null}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>
                {t('actions.cancel')}
              </Button>
              <Button type="submit" disabled={save.isPending || form.name.trim().length < 2}>
                {save.isPending
                  ? t('actions.saving')
                  : editing
                    ? t('customers.form.save')
                    : t('customers.form.create')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={detailOpen}
        onOpenChange={(open) => {
          setDetailOpen(open);
          if (!open) setDetailId(null);
        }}
      >
        <DialogContent
          title={activeDetail?.customer.name ?? t('customers.detail.title')}
          description={t('customers.detail.description')}
          className="max-w-3xl"
        >
          {detail.isLoading ? (
            <div
              role="status"
              aria-live="polite"
              aria-busy="true"
              aria-label={t('customers.detail.loadingAria')}
              className="space-y-4"
            >
              <div className="flex flex-wrap items-center gap-4 rounded-lg border border-border bg-muted/30 p-4">
                <Skeleton radius="full" className="h-12 w-12 shrink-0" />
                <div className="min-w-0 flex-1 space-y-2">
                  <Skeleton className="h-4 w-40" />
                  <div className="flex flex-wrap gap-4">
                    <Skeleton className="h-2.5 w-32" />
                    <Skeleton className="h-2.5 w-44" />
                    <Skeleton className="h-2.5 w-36" />
                  </div>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                {Array.from({ length: 3 }).map((_, index) => (
                  <div key={index} className="rounded-lg border border-border p-3">
                    <Skeleton className="h-2.5 w-16" />
                    <Skeleton className="mt-2 h-5 w-24" />
                  </div>
                ))}
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <Skeleton className="h-3.5 w-32" />
                  <Skeleton className="h-2.5 w-14" />
                </div>
                <div className="overflow-hidden rounded-lg border border-border">
                  <SkeletonTable
                    rows={4}
                    columns={[
                      { kind: 'double', label: t('customers.detail.columns.order') },
                      { kind: 'text', label: t('customers.detail.columns.service') },
                      { kind: 'badge', label: t('customers.detail.columns.status') },
                      { kind: 'amount', label: t('customers.detail.columns.total') },
                      { kind: 'muted', label: t('customers.detail.columns.placed') },
                    ]}
                  />
                </div>
              </div>
            </div>
          ) : detail.isError ? (
            <ErrorState
              title={t('customers.errors.detail')}
              message={detail.error instanceof Error ? detail.error.message : undefined}
              onRetry={() => void detail.refetch()}
            />
          ) : activeDetail ? (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-4 rounded-lg border border-border bg-muted/30 p-4">
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                  {initials(activeDetail.customer.name)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-base font-semibold">{activeDetail.customer.name}</p>
                  <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1.5">
                      <Phone className="h-3.5 w-3.5" />
                      {activeDetail.customer.phone ?? t('customers.detail.noPhone')}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5" />
                      {activeDetail.customer.address ?? t('customers.detail.noAddress')}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <Mail className="h-3.5 w-3.5" />
                      {t('customers.detail.registered', {
                        date: formatDateTime(activeDetail.customer.createdAt),
                      })}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-lg border border-border p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    {t('customers.detail.orders')}
                  </p>
                  <p className="numeric mt-1 text-xl font-bold">
                    {formatNumber(activeDetail.customer.ordersCount)}
                  </p>
                </div>
                <div className="rounded-lg border border-border p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    {t('customers.detail.totalSpent')}
                  </p>
                  <p className="numeric mt-1 text-xl font-bold">
                    {formatMoney(activeDetail.customer.totalSpent)}
                  </p>
                </div>
                <div className="rounded-lg border border-border p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    {t('customers.detail.lastOrder')}
                  </p>
                  <p className="mt-1 text-sm font-semibold">
                    {activeDetail.customer.lastOrderAt
                      ? formatDateTime(activeDetail.customer.lastOrderAt)
                      : t('customers.noOrders')}
                  </p>
                </div>
              </div>

              {activeDetail.customer.notes ? (
                <div className="rounded-lg border border-border bg-muted/20 p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    {t('customers.detail.notes')}
                  </p>
                  <p className="mt-1 whitespace-pre-line text-sm">{activeDetail.customer.notes}</p>
                </div>
              ) : null}

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="flex items-center gap-1.5 text-sm font-semibold">
                    <ReceiptText className="h-4 w-4" />
                    {t('customers.detail.recentOrders')}
                  </h3>
                  <span className="text-[11px] text-muted-foreground">
                    {t('customers.detail.shown', {
                      count: formatNumber(activeDetail.orders.length),
                    })}
                  </span>
                </div>
                {activeDetail.orders.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                    {t('customers.detail.noOrders')}
                  </div>
                ) : (
                  <div className="overflow-hidden rounded-lg border border-border">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border bg-muted/40 text-start text-[11px] uppercase tracking-wide text-muted-foreground">
                          <th className="px-3 py-2 font-semibold">{t('customers.detail.columns.order')}</th>
                          <th className="px-3 py-2 font-semibold">{t('customers.detail.columns.service')}</th>
                          <th className="px-3 py-2 font-semibold">{t('customers.detail.columns.status')}</th>
                          <th className="px-3 py-2 font-semibold">{t('customers.detail.columns.payment')}</th>
                          <th className="px-3 py-2 text-end font-semibold">{t('customers.detail.columns.total')}</th>
                          <th className="px-3 py-2 font-semibold">{t('customers.detail.columns.placed')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {activeDetail.orders.map((order) => (
                          <tr
                            key={order.id}
                            className="cursor-pointer border-b border-border/70 last:border-0 hover:bg-muted/40"
                            onClick={() => {
                              setSelectedOrder(order);
                              setOrderOpen(true);
                            }}
                          >
                            <td className="numeric px-3 py-2 font-semibold">{order.orderNumber}</td>
                            <td className="px-3 py-2 text-xs">{orderTypeLabel(order.type)}</td>
                            <td className="px-3 py-2">
                              <OrderStatusBadge status={order.status} />
                            </td>
                            <td className="px-3 py-2">
                              <PaymentBadge status={order.paymentStatus} />
                            </td>
                            <td className="numeric px-3 py-2 text-end font-semibold">
                              {formatMoney(order.total)}
                            </td>
                            <td className="px-3 py-2 text-xs text-muted-foreground">
                              {formatDateTime(order.createdAt)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setDetailOpen(false)}>
                  {t('customers.detail.close')}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    const customer = activeDetail.customer;
                    setDetailOpen(false);
                    openEdit(customer);
                  }}
                >
                  <Pencil className="h-4 w-4" />
                  {t('customers.detail.editProfile')}
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <EmptyPanel
              title={t('customers.detail.notFoundTitle')}
              message={t('customers.detail.notFoundMessage')}
            />
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null);
        }}
        title={t('customers.deleteDialog.title')}
        description={
          <span>
            <strong className="text-foreground">{pendingDelete?.name}</strong>{' '}
            {t('customers.deleteDialog.description')}
          </span>
        }
        confirmLabel={t('customers.deleteDialog.confirm')}
        destructive
        busy={remove.isPending}
        onConfirm={() => {
          if (pendingDelete) remove.mutate(pendingDelete);
        }}
      />

      <OrderDetailDialog
        open={orderOpen}
        onOpenChange={(open) => {
          setOrderOpen(open);
          if (!open) setSelectedOrder(null);
        }}
        order={selectedOrder}
        onChanged={(updated) => {
          setSelectedOrder(updated);
          void queryClient.invalidateQueries({ queryKey: ['customers'] });
        }}
      />
    </div>
  );
}
