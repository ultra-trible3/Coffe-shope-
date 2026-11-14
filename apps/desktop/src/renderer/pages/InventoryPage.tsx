import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowDownUp,
  Boxes,
  History,
  PackagePlus,
  Pencil,
  Plus,
  Search,
  Trash2,
  Truck,
  X,
} from 'lucide-react';
import { useEffect, useState, type ReactElement } from 'react';
import {
  INGREDIENT_UNITS,
  INVENTORY_MOVEMENT_TYPES,
  type IngredientDto,
  type IngredientUnit,
  type InventoryMovementDto,
  type InventoryMovementType,
  type SupplierDto,
} from '@pharmacy/shared';
import { Button } from '../components/ui/button';
import { ConfirmDialog } from '../components/ui/confirm-dialog';
import { Dialog, DialogContent, DialogFooter } from '../components/ui/dialog';
import { Input, Select, Textarea } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Pagination } from '../components/ui/pagination';
import { EmptyPanel, ErrorState } from '../components/ui/states';
import { Skeleton, SkeletonTable } from '../components/ui/skeleton';
import { StatusBadge } from '../components/ui/status-badge';
import { toast } from '../components/ui/toast';
import { StatCard } from '../components/ui/stat-card';
import { useI18n, type TranslationKey } from '../i18n';
import { api } from '../lib/api';
import {
  formatDateTime,
  formatDecimal,
  formatMoney,
  movementLabel,
  unitLabel,
} from '../lib/format';
import { cn } from '../lib/utils';

type Tab = 'ingredients' | 'movements' | 'suppliers';

const PAGE_SIZE = 20;

const TABS: Array<{ key: Tab; labelKey: TranslationKey; icon: typeof Boxes }> = [
  { key: 'ingredients', labelKey: 'inventory.tabs.ingredients', icon: Boxes },
  { key: 'movements', labelKey: 'inventory.tabs.movements', icon: History },
  { key: 'suppliers', labelKey: 'inventory.tabs.suppliers', icon: Truck },
];

export function InventoryPage(): ReactElement {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>('ingredients');
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [lowOnly, setLowOnly] = useState(false);

  const [ingredientDialogOpen, setIngredientDialogOpen] = useState(false);
  const [editingIngredient, setEditingIngredient] = useState<IngredientDto | null>(null);
  const [adjustTarget, setAdjustTarget] = useState<IngredientDto | null>(null);
  const [purchaseTarget, setPurchaseTarget] = useState<IngredientDto | null>(null);
  const [supplierDialogOpen, setSupplierDialogOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<SupplierDto | null>(null);
  const [pendingDelete, setPendingDelete] = useState<{
    title: string;
    description: string;
    label: string;
    run: () => Promise<unknown>;
  } | null>(null);

  const [movementIngredient, setMovementIngredient] = useState('');
  const [movementType, setMovementType] = useState<InventoryMovementType | ''>('');
  const [movementFrom, setMovementFrom] = useState('');
  const [movementTo, setMovementTo] = useState('');
  const [movementPage, setMovementPage] = useState(1);

  useEffect(() => {
    setPage(1);
  }, [search, lowOnly]);

  useEffect(() => {
    setMovementPage(1);
  }, [movementIngredient, movementType, movementFrom, movementTo]);

  const ingredients = useQuery({
    queryKey: ['inventory', 'ingredients', { page, search, lowOnly }],
    queryFn: () =>
      api.inventory.ingredients({
        page,
        pageSize: PAGE_SIZE,
        q: search || undefined,
        lowStock: lowOnly || undefined,
      }),
    placeholderData: (previous) => previous,
  });

  const allIngredients = useQuery({
    queryKey: ['inventory', 'ingredients', 'all'],
    queryFn: () => api.inventory.ingredients({ page: 1, pageSize: 200 }),
    staleTime: 60_000,
  });

  const suppliers = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => api.suppliers.list({ page: 1, pageSize: 200 }),
    staleTime: 60_000,
  });

  const movements = useQuery({
    queryKey: ['inventory', 'movements', { movementPage, movementIngredient, movementType, movementFrom, movementTo }],
    queryFn: () =>
      api.inventory.movements({
        page: movementPage,
        pageSize: PAGE_SIZE,
        ingredientId: movementIngredient || undefined,
        type: movementType || undefined,
        from: movementFrom || undefined,
        to: movementTo || undefined,
      }),
    enabled: tab === 'movements',
    placeholderData: (previous) => previous,
  });

  const invalidate = (): void => {
    void queryClient.invalidateQueries({ queryKey: ['inventory'] });
    void queryClient.invalidateQueries({ queryKey: ['suppliers'] });
    void queryClient.invalidateQueries({ queryKey: ['reports'] });
    void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
  };

  const remove = useMutation({
    mutationFn: (task: { run: () => Promise<unknown> }) => task.run(),
    onSuccess: () => {
      toast.success(t('feedback.deleted'));
      setPendingDelete(null);
      invalidate();
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : t('inventory.errors.deleteGeneric'));
      setPendingDelete(null);
    },
  });

  const stats = allIngredients.data?.items ?? [];
  const lowCount = stats.filter((row) => row.isLowStock).length;
  const stockValue = stats.reduce((sum, row) => sum + Number(row.stockValue), 0);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label={t('inventory.stats.ingredients')}
          value={formatDecimal(stats.length, 0)}
          icon={<Boxes className="h-4 w-4" />}
          hint={t('inventory.stats.ingredientsHint')}
          tone="neutral"
        />
        <StatCard
          label={t('inventory.stats.lowStock')}
          value={formatDecimal(lowCount, 0)}
          icon={<ArrowDownUp className="h-4 w-4" />}
          hint={t('inventory.stats.lowStockHint')}
          tone={lowCount > 0 ? 'orange' : 'green'}
        />
        <StatCard
          label={t('inventory.stats.stockValue')}
          value={formatMoney(stockValue)}
          icon={<PackagePlus className="h-4 w-4" />}
          hint={t('inventory.stats.stockValueHint')}
          tone="green"
        />
        <StatCard
          label={t('inventory.stats.suppliers')}
          value={formatDecimal(suppliers.data?.total ?? 0, 0)}
          icon={<Truck className="h-4 w-4" />}
          hint={t('inventory.stats.suppliersHint')}
          tone="amber"
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex flex-wrap gap-1 rounded-xl border border-border bg-card p-1 shadow-sm">
          {TABS.map((entry) => {
            const Icon = entry.icon;
            return (
              <button
                key={entry.key}
                type="button"
                onClick={() => setTab(entry.key)}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors',
                  tab === entry.key
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted',
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {t(entry.labelKey)}
              </button>
            );
          })}
        </div>
        {tab === 'ingredients' ? (
          <Button
            onClick={() => {
              setEditingIngredient(null);
              setIngredientDialogOpen(true);
            }}
          >
            <Plus className="h-4 w-4" />
            {t('inventory.actions.newIngredient')}
          </Button>
        ) : tab === 'suppliers' ? (
          <Button
            onClick={() => {
              setEditingSupplier(null);
              setSupplierDialogOpen(true);
            }}
          >
            <Plus className="h-4 w-4" />
            {t('inventory.actions.newSupplier')}
          </Button>
        ) : null}
      </div>

      {tab === 'ingredients' ? (
        <div className="rounded-xl border border-border bg-card shadow-sm">
          <div className="flex flex-wrap items-center gap-2 border-b border-border p-3">
            <div className="relative min-w-[220px] flex-1">
              <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={t('inventory.search.placeholder')}
                className="h-9 ps-9"
                aria-label={t('inventory.search.aria')}
              />
              {search ? (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute end-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:bg-muted"
                  aria-label={t('inventory.search.clear')}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              ) : null}
            </div>
            <Button
              variant={lowOnly ? 'default' : 'outline'}
              size="sm"
              onClick={() => setLowOnly((current) => !current)}
            >
              {t('inventory.actions.lowStockOnly')}
            </Button>
          </div>

          {ingredients.isLoading ? (
            <SkeletonTable
              label={t('inventory.loading.ingredients')}
              rows={8}
              columns={[
                { kind: 'double', label: t('inventory.columns.ingredient') },
                { kind: 'amount', label: t('inventory.columns.inStock') },
                { kind: 'amount', label: t('inventory.columns.minimum') },
                { kind: 'amount', label: t('inventory.columns.unitCost') },
                { kind: 'amount', label: t('inventory.columns.value') },
                { kind: 'muted', label: t('inventory.columns.supplier') },
                { kind: 'muted', label: t('inventory.columns.updated') },
                { kind: 'actions' },
              ]}
            />
          ) : ingredients.isError ? (
            <div className="p-4">
              <ErrorState
                title={t('inventory.errors.ingredients')}
                message={ingredients.error instanceof Error ? ingredients.error.message : undefined}
                onRetry={() => void ingredients.refetch()}
              />
            </div>
          ) : ingredients.data && ingredients.data.items.length === 0 ? (
            <EmptyPanel
              title={lowOnly ? t('inventory.empty.lowStock') : t('inventory.empty.ingredients')}
              message={lowOnly ? t('inventory.empty.lowStockMessage') : t('inventory.empty.ingredientsMessage')}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40 text-start text-[11px] uppercase tracking-wide text-muted-foreground">
                    <th className="px-3 py-2.5 font-semibold">{t('inventory.columns.ingredient')}</th>
                    <th className="px-3 py-2.5 text-end font-semibold">{t('inventory.columns.inStock')}</th>
                    <th className="px-3 py-2.5 text-end font-semibold">{t('inventory.columns.minimum')}</th>
                    <th className="px-3 py-2.5 text-end font-semibold">{t('inventory.columns.unitCost')}</th>
                    <th className="px-3 py-2.5 text-end font-semibold">{t('inventory.columns.value')}</th>
                    <th className="px-3 py-2.5 font-semibold">{t('inventory.columns.supplier')}</th>
                    <th className="px-3 py-2.5 font-semibold">{t('inventory.columns.updated')}</th>
                    <th className="px-3 py-2.5" />
                  </tr>
                </thead>
                <tbody>
                  {ingredients.data!.items.map((row) => (
                    <tr key={row.id} className="border-b border-border/70 last:border-0 hover:bg-muted/30">
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-2">
                          <div>
                            <p className="font-semibold">{row.name}</p>
                            <p className="numeric text-[11px] text-muted-foreground">{row.sku}</p>
                          </div>
                          {row.isLowStock ? (
                            <StatusBadge tone="red" label={t('inventory.badges.low')} />
                          ) : null}
                          {!row.isActive ? (
                            <StatusBadge tone="neutral" label={t('inventory.badges.inactive')} />
                          ) : null}
                        </div>
                      </td>
                      <td className="numeric px-3 py-2.5 text-end font-semibold">
                        {formatDecimal(row.currentStock, 3)}{' '}
                        <span className="text-[10px] font-normal text-muted-foreground">{unitLabel(row.unit)}</span>
                      </td>
                      <td className="numeric px-3 py-2.5 text-end text-xs text-muted-foreground">
                        {formatDecimal(row.minStock, 3)}
                      </td>
                      <td className="numeric px-3 py-2.5 text-end text-xs">{formatMoney(row.costPerUnit)}</td>
                      <td className="numeric px-3 py-2.5 text-end text-xs">{formatMoney(row.stockValue)}</td>
                      <td className="px-3 py-2.5 text-xs text-muted-foreground">{row.supplierName ?? '—'}</td>
                      <td className="px-3 py-2.5 text-[11px] text-muted-foreground">
                        {formatDateTime(row.updatedAt)}
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="sm" onClick={() => setAdjustTarget(row)}>
                            <ArrowDownUp className="h-3.5 w-3.5" />
                            {t('inventory.actions.adjust')}
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => setPurchaseTarget(row)}>
                            <PackagePlus className="h-3.5 w-3.5" />
                            {t('inventory.actions.restock')}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setEditingIngredient(row);
                              setIngredientDialogOpen(true);
                            }}
                            aria-label={t('inventory.actions.edit', { name: row.name })}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:bg-destructive/10"
                            onClick={() =>
                              setPendingDelete({
                                title: t('inventory.delete.ingredientTitle', { name: row.name }),
                                description: t('inventory.delete.ingredientDescription'),
                                label: t('inventory.delete.ingredientLabel'),
                                run: () => api.inventory.removeIngredient(row.id),
                              })
                            }
                            aria-label={t('inventory.actions.delete', { name: row.name })}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {ingredients.data && ingredients.data.total > 0 ? (
            <Pagination
              page={ingredients.data.page}
              pageSize={ingredients.data.pageSize}
              total={ingredients.data.total}
              totalPages={ingredients.data.totalPages}
              onPageChange={setPage}
            />
          ) : null}
        </div>
      ) : null}

      {tab === 'movements' ? (
        <div className="rounded-xl border border-border bg-card shadow-sm">
          <div className="flex flex-wrap items-end gap-2 border-b border-border p-3">
            <div>
              <Label htmlFor="movement-ingredient" className="text-[10px] uppercase tracking-wide text-muted-foreground">
                {t('inventory.filters.ingredient')}
              </Label>
              <Select
                id="movement-ingredient"
                value={movementIngredient}
                onChange={(event) => setMovementIngredient(event.target.value)}
                className="mt-1 h-9 w-[200px]"
              >
                <option value="">{t('inventory.filters.allIngredients')}</option>
                {(allIngredients.data?.items ?? []).map((row) => (
                  <option key={row.id} value={row.id}>
                    {row.name}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="movement-type" className="text-[10px] uppercase tracking-wide text-muted-foreground">
                {t('inventory.filters.movement')}
              </Label>
              <Select
                id="movement-type"
                value={movementType}
                onChange={(event) => setMovementType(event.target.value as InventoryMovementType | '')}
                className="mt-1 h-9 w-[190px]"
              >
                <option value="">{t('inventory.filters.allMovements')}</option>
                {INVENTORY_MOVEMENT_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {movementLabel(type)}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="movement-from" className="text-[10px] uppercase tracking-wide text-muted-foreground">
                {t('inventory.filters.from')}
              </Label>
              <Input
                id="movement-from"
                type="date"
                value={movementFrom}
                onChange={(event) => setMovementFrom(event.target.value)}
                className="mt-1 h-9 w-[150px]"
              />
            </div>
            <div>
              <Label htmlFor="movement-to" className="text-[10px] uppercase tracking-wide text-muted-foreground">
                {t('inventory.filters.to')}
              </Label>
              <Input
                id="movement-to"
                type="date"
                value={movementTo}
                onChange={(event) => setMovementTo(event.target.value)}
                className="mt-1 h-9 w-[150px]"
              />
            </div>
            {movements.data ? (
              <span className="mb-2 ms-auto text-xs text-muted-foreground">
                {t('inventory.filters.count', { count: formatDecimal(movements.data.total, 0) })}
              </span>
            ) : (
              <Skeleton className="mb-2 ms-auto h-3 w-24" />
            )}
          </div>

          {movements.isLoading ? (
            <SkeletonTable
              label={t('inventory.loading.movements')}
              rows={8}
              columns={[
                { kind: 'muted', label: t('inventory.columns.date') },
                { kind: 'text', label: t('inventory.columns.ingredient') },
                { kind: 'badge', label: t('inventory.columns.movement') },
                { kind: 'amount', label: t('inventory.columns.quantity') },
                { kind: 'muted', label: t('inventory.columns.reference') },
                { kind: 'muted', label: t('inventory.columns.by') },
                { kind: 'muted', label: t('inventory.columns.note') },
              ]}
            />
          ) : movements.isError ? (
            <div className="p-4">
              <ErrorState
                title={t('inventory.errors.movements')}
                message={movements.error instanceof Error ? movements.error.message : undefined}
                onRetry={() => void movements.refetch()}
              />
            </div>
          ) : movements.data && movements.data.items.length === 0 ? (
            <EmptyPanel title={t('inventory.empty.movements')} message={t('inventory.empty.movementsMessage')} />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40 text-start text-[11px] uppercase tracking-wide text-muted-foreground">
                    <th className="px-3 py-2.5 font-semibold">{t('inventory.columns.date')}</th>
                    <th className="px-3 py-2.5 font-semibold">{t('inventory.columns.ingredient')}</th>
                    <th className="px-3 py-2.5 font-semibold">{t('inventory.columns.movement')}</th>
                    <th className="px-3 py-2.5 text-end font-semibold">{t('inventory.columns.quantity')}</th>
                    <th className="px-3 py-2.5 font-semibold">{t('inventory.columns.reference')}</th>
                    <th className="px-3 py-2.5 font-semibold">{t('inventory.columns.by')}</th>
                    <th className="px-3 py-2.5 font-semibold">{t('inventory.columns.note')}</th>
                  </tr>
                </thead>
                <tbody>
                  {movements.data!.items.map((row: InventoryMovementDto) => (
                    <tr key={row.id} className="border-b border-border/70 last:border-0 hover:bg-muted/30">
                      <td className="px-3 py-2.5 text-[11px] text-muted-foreground">
                        {formatDateTime(row.createdAt)}
                      </td>
                      <td className="px-3 py-2.5 font-medium">{row.ingredientName}</td>
                      <td className="px-3 py-2.5">
                        <StatusBadge
                          tone={
                            row.type === 'SALE_DEDUCTION'
                              ? 'orange'
                              : row.type === 'PURCHASE'
                                ? 'green'
                                : row.type === 'WASTE'
                                  ? 'red'
                                  : 'neutral'
                          }
                          label={movementLabel(row.type)}
                          dot={false}
                        />
                      </td>
                      <td
                        className={cn(
                          'numeric px-3 py-2.5 text-end font-semibold',
                          row.quantity > 0 ? 'text-success' : 'text-destructive',
                        )}
                      >
                        {row.quantity > 0 ? '+' : ''}
                        {formatDecimal(row.quantity, 3)}{' '}
                        <span className="text-[10px] font-normal text-muted-foreground">{unitLabel(row.unit)}</span>
                      </td>
                      <td className="numeric px-3 py-2.5 text-[11px] text-muted-foreground">
                        {row.reference ?? '—'}
                      </td>
                      <td className="px-3 py-2.5 text-xs text-muted-foreground">
                        {row.userName ?? t('inventory.system')}
                      </td>
                      <td className="max-w-[220px] truncate px-3 py-2.5 text-xs text-muted-foreground">
                        {row.note ?? '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {movements.data && movements.data.total > 0 ? (
            <Pagination
              page={movements.data.page}
              pageSize={movements.data.pageSize}
              total={movements.data.total}
              totalPages={movements.data.totalPages}
              onPageChange={setMovementPage}
            />
          ) : null}
        </div>
      ) : null}

      {tab === 'suppliers' ? (
        <div className="rounded-xl border border-border bg-card shadow-sm">
          {suppliers.isLoading ? (
            <SkeletonTable
              label={t('inventory.loading.suppliers')}
              rows={6}
              columns={[
                { kind: 'double', label: t('inventory.columns.supplier') },
                { kind: 'muted', label: t('inventory.columns.phone') },
                { kind: 'muted', label: t('inventory.columns.email') },
                { kind: 'muted', label: t('inventory.columns.address') },
                { kind: 'badge', label: t('inventory.columns.status') },
                { kind: 'actions' },
              ]}
            />
          ) : suppliers.isError ? (
            <ErrorState
              title={t('inventory.errors.suppliers')}
              message={suppliers.error instanceof Error ? suppliers.error.message : undefined}
              onRetry={() => void suppliers.refetch()}
            />
          ) : (suppliers.data?.items ?? []).length === 0 ? (
            <EmptyPanel
              title={t('inventory.empty.suppliers')}
              message={t('inventory.empty.suppliersMessage')}
              action={
                <Button size="sm" onClick={() => setSupplierDialogOpen(true)}>
                  {t('inventory.actions.newSupplier')}
                </Button>
              }
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40 text-start text-[11px] uppercase tracking-wide text-muted-foreground">
                    <th className="px-3 py-2.5 font-semibold">{t('inventory.columns.supplier')}</th>
                    <th className="px-3 py-2.5 font-semibold">{t('inventory.columns.phone')}</th>
                    <th className="px-3 py-2.5 font-semibold">{t('inventory.columns.email')}</th>
                    <th className="px-3 py-2.5 font-semibold">{t('inventory.columns.address')}</th>
                    <th className="px-3 py-2.5 font-semibold">{t('inventory.columns.status')}</th>
                    <th className="px-3 py-2.5" />
                  </tr>
                </thead>
                <tbody>
                  {suppliers.data!.items.map((row: SupplierDto) => (
                    <tr key={row.id} className="border-b border-border/70 last:border-0 hover:bg-muted/30">
                      <td className="px-3 py-2.5">
                        <p className="font-semibold">{row.name}</p>
                        {row.notes ? (
                          <p className="max-w-[240px] truncate text-[11px] text-muted-foreground">{row.notes}</p>
                        ) : null}
                      </td>
                      <td className="numeric px-3 py-2.5 text-xs">{row.phone ?? '—'}</td>
                      <td className="px-3 py-2.5 text-xs">{row.email ?? '—'}</td>
                      <td className="max-w-[220px] truncate px-3 py-2.5 text-xs text-muted-foreground">
                        {row.address ?? '—'}
                      </td>
                      <td className="px-3 py-2.5">
                        <StatusBadge
                          tone={row.isActive ? 'green' : 'neutral'}
                          label={row.isActive ? t('inventory.badges.active') : t('inventory.badges.inactive')}
                        />
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setEditingSupplier(row);
                              setSupplierDialogOpen(true);
                            }}
                            aria-label={t('inventory.actions.edit', { name: row.name })}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:bg-destructive/10"
                            onClick={() =>
                              setPendingDelete({
                                title: t('inventory.delete.supplierTitle', { name: row.name }),
                                description: t('inventory.delete.supplierDescription'),
                                label: t('inventory.delete.supplierLabel'),
                                run: () => api.suppliers.remove(row.id),
                              })
                            }
                            aria-label={t('inventory.actions.delete', { name: row.name })}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : null}

      <p className="text-[11px] text-muted-foreground">{t('inventory.footer')}</p>

      <IngredientDialog
        open={ingredientDialogOpen}
        onOpenChange={setIngredientDialogOpen}
        ingredient={editingIngredient}
        suppliers={suppliers.data?.items ?? []}
        onSaved={invalidate}
      />

      <AdjustDialog
        open={adjustTarget !== null}
        onOpenChange={(open) => {
          if (!open) setAdjustTarget(null);
        }}
        ingredient={adjustTarget}
        onSaved={invalidate}
      />

      <PurchaseDialog
        open={purchaseTarget !== null}
        onOpenChange={(open) => {
          if (!open) setPurchaseTarget(null);
        }}
        ingredient={purchaseTarget}
        suppliers={suppliers.data?.items ?? []}
        onSaved={invalidate}
      />

      <SupplierDialog
        open={supplierDialogOpen}
        onOpenChange={setSupplierDialogOpen}
        supplier={editingSupplier}
        onSaved={invalidate}
      />

      <ConfirmDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null);
        }}
        title={pendingDelete?.title ?? t('actions.delete')}
        description={pendingDelete?.description ?? ''}
        confirmLabel={pendingDelete?.label ?? t('actions.delete')}
        destructive
        busy={remove.isPending}
        onConfirm={() => {
          if (pendingDelete) remove.mutate({ run: pendingDelete.run });
        }}
      />
    </div>
  );
}

function IngredientDialog({
  open,
  onOpenChange,
  ingredient,
  suppliers,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ingredient: IngredientDto | null;
  suppliers: SupplierDto[];
  onSaved: () => void;
}): ReactElement {
  const { t } = useI18n();
  const [nameEn, setNameEn] = useState('');
  const [nameAr, setNameAr] = useState('');
  const [sku, setSku] = useState('');
  const [unit, setUnit] = useState<IngredientUnit>('KG');
  const [currentStock, setCurrentStock] = useState('0');
  const [minStock, setMinStock] = useState('0');
  const [costPerUnit, setCostPerUnit] = useState('0.00');
  const [supplierId, setSupplierId] = useState('');
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (!open) return;
    setNameEn(ingredient?.nameEn ?? '');
    setNameAr(ingredient?.nameAr ?? '');
    setSku(ingredient?.sku ?? '');
    setUnit(ingredient?.unit ?? 'KG');
    setCurrentStock(String(ingredient?.currentStock ?? 0));
    setMinStock(String(ingredient?.minStock ?? 0));
    setCostPerUnit(ingredient?.costPerUnit ?? '0.00');
    setSupplierId(ingredient?.supplierId ?? '');
    setIsActive(ingredient?.isActive ?? true);
  }, [open, ingredient]);

  const namesValid = nameEn.trim().length >= 2 && nameAr.trim().length > 0;

  const mutation = useMutation({
    mutationFn: () => {
      if (nameEn.trim().length < 2) throw new Error(t('inventory.ingredient.nameRequired'));
      if (!nameAr.trim()) throw new Error(t('inventory.ingredient.arabicRequired'));
      const body = {
        name: nameEn.trim(),
        nameAr: nameAr.trim(),
        sku: sku.trim() || undefined,
        unit,
        minStock: Number(minStock || 0),
        costPerUnit: Number(costPerUnit || 0).toFixed(2),
        supplierId: supplierId || null,
        isActive,
      };
      return ingredient
        ? api.inventory.updateIngredient(ingredient.id, body)
        : api.inventory.createIngredient({ ...body, currentStock: Number(currentStock || 0) });
    },
    onSuccess: () => {
      toast.success(
        ingredient ? t('inventory.ingredient.updated') : t('inventory.ingredient.created'),
      );
      onSaved();
      onOpenChange(false);
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : t('inventory.ingredient.saveFailed')),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        title={ingredient ? t('inventory.ingredient.editTitle') : t('inventory.ingredient.newTitle')}
        className="max-w-lg"
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="ingredient-name-en" className="text-xs">
              {t('inventory.ingredient.nameEn')}
            </Label>
            <Input
              id="ingredient-name-en"
              value={nameEn}
              onChange={(event) => setNameEn(event.target.value)}
              placeholder={t('inventory.ingredient.namePlaceholderEn')}
              dir="ltr"
              className="mt-1.5"
            />
          </div>
          <div>
            <Label htmlFor="ingredient-name-ar" className="text-xs">
              {t('inventory.ingredient.nameAr')}
            </Label>
            <Input
              id="ingredient-name-ar"
              value={nameAr}
              onChange={(event) => setNameAr(event.target.value)}
              placeholder={t('inventory.ingredient.namePlaceholderAr')}
              dir="rtl"
              lang="ar"
              className="mt-1.5"
            />
          </div>
          <div>
            <Label htmlFor="ingredient-sku" className="text-xs">
              {t('inventory.ingredient.sku')}
            </Label>
            <Input
              id="ingredient-sku"
              value={sku}
              onChange={(event) => setSku(event.target.value.toUpperCase())}
              placeholder={t('inventory.ingredient.skuPlaceholder')}
              className="mt-1.5"
            />
          </div>
          <div>
            <Label htmlFor="ingredient-unit" className="text-xs">
              {t('inventory.ingredient.unit')}
            </Label>
            <Select
              id="ingredient-unit"
              value={unit}
              onChange={(event) => setUnit(event.target.value as IngredientUnit)}
              className="mt-1.5"
            >
              {INGREDIENT_UNITS.map((option) => (
                <option key={option} value={option}>
                  {unitLabel(option)}
                </option>
              ))}
            </Select>
          </div>
          {!ingredient ? (
            <div>
              <Label htmlFor="ingredient-stock" className="text-xs">
                {t('inventory.ingredient.openingStock')}
              </Label>
              <Input
                id="ingredient-stock"
                type="number"
                min="0"
                step="0.001"
                value={currentStock}
                onChange={(event) => setCurrentStock(event.target.value)}
                className="mt-1.5"
              />
            </div>
          ) : null}
          <div>
            <Label htmlFor="ingredient-min" className="text-xs">
              {t('inventory.ingredient.minimum')}
            </Label>
            <Input
              id="ingredient-min"
              type="number"
              min="0"
              step="0.001"
              value={minStock}
              onChange={(event) => setMinStock(event.target.value)}
              className="mt-1.5"
            />
          </div>
          <div>
            <Label htmlFor="ingredient-cost" className="text-xs">
              {t('inventory.ingredient.cost')}
            </Label>
            <Input
              id="ingredient-cost"
              type="number"
              min="0"
              step="0.01"
              value={costPerUnit}
              onChange={(event) => setCostPerUnit(event.target.value)}
              className="mt-1.5"
            />
          </div>
          <div>
            <Label htmlFor="ingredient-supplier" className="text-xs">
              {t('inventory.ingredient.supplier')}
            </Label>
            <Select
              id="ingredient-supplier"
              value={supplierId}
              onChange={(event) => setSupplierId(event.target.value)}
              className="mt-1.5"
            >
              <option value="">{t('inventory.ingredient.noSupplier')}</option>
              {suppliers.map((supplier) => (
                <option key={supplier.id} value={supplier.id}>
                  {supplier.name}
                </option>
              ))}
            </Select>
          </div>
          <label className="mt-5 flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-input"
              checked={isActive}
              onChange={(event) => setIsActive(event.target.checked)}
            />
            {t('inventory.ingredient.active')}
          </label>
        </div>
        {ingredient ? (
          <p className="text-[11px] text-muted-foreground">{t('inventory.ingredient.hint')}</p>
        ) : null}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={mutation.isPending}>
            {t('actions.cancel')}
          </Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending || !namesValid}>
            {mutation.isPending
              ? t('actions.saving')
              : ingredient
                ? t('inventory.ingredient.save')
                : t('inventory.ingredient.create')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AdjustDialog({
  open,
  onOpenChange,
  ingredient,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ingredient: IngredientDto | null;
  onSaved: () => void;
}): ReactElement {
  const { t } = useI18n();
  const [direction, setDirection] = useState<'add' | 'remove'>('add');
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setDirection('add');
    setQuantity('');
    setReason('');
    setError(null);
  }, [open]);

  const mutation = useMutation({
    mutationFn: () => {
      const amount = Number(quantity);
      if (!(amount > 0)) throw new Error(t('inventory.adjust.quantityError'));
      if (reason.trim().length < 3) throw new Error(t('inventory.adjust.reasonError'));
      if (direction === 'remove' && ingredient && amount > ingredient.currentStock) {
        throw new Error(t('inventory.adjust.tooMuch'));
      }
      return api.inventory.adjust(ingredient!.id, {
        quantity: direction === 'add' ? amount : -amount,
        reason: reason.trim(),
      });
    },
    onSuccess: () => {
      toast.success(t('inventory.adjust.success'));
      onSaved();
      onOpenChange(false);
    },
    onError: (error) =>
      setError(error instanceof Error ? error.message : t('inventory.adjust.failed')),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        title={
          ingredient
            ? t('inventory.adjust.titleWith', { name: ingredient.name })
            : t('inventory.adjust.title')
        }
        description={
          ingredient
            ? t('inventory.adjust.currentStock', {
                quantity: formatDecimal(ingredient.currentStock, 3),
                unit: unitLabel(ingredient.unit),
              })
            : undefined
        }
        className="max-w-md"
      >
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant={direction === 'add' ? 'default' : 'outline'}
            onClick={() => setDirection('add')}
          >
            {t('inventory.adjust.add')}
          </Button>
          <Button
            variant={direction === 'remove' ? 'destructive' : 'outline'}
            onClick={() => setDirection('remove')}
          >
            {t('inventory.adjust.remove')}
          </Button>
        </div>
        <div className="space-y-3">
          <div>
            <Label htmlFor="adjust-quantity" className="text-xs">
              {t('inventory.adjust.quantity', {
                unit: ingredient ? unitLabel(ingredient.unit) : t('inventory.adjust.units'),
              })}
            </Label>
            <Input
              id="adjust-quantity"
              type="number"
              min="0"
              step="0.001"
              value={quantity}
              onChange={(event) => setQuantity(event.target.value)}
              className="mt-1.5"
              placeholder="0.000"
            />
          </div>
          <div>
            <Label htmlFor="adjust-reason" className="text-xs">
              {t('inventory.adjust.reason')}
            </Label>
            <Input
              id="adjust-reason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder={t('inventory.adjust.reasonPlaceholder')}
              className="mt-1.5"
            />
          </div>
          {error ? <p className="text-xs text-destructive">{error}</p> : null}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={mutation.isPending}>
            {t('actions.cancel')}
          </Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending || !(Number(quantity) > 0)}>
            {mutation.isPending ? t('inventory.adjust.applying') : t('inventory.adjust.apply')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PurchaseDialog({
  open,
  onOpenChange,
  ingredient,
  suppliers,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ingredient: IngredientDto | null;
  suppliers: SupplierDto[];
  onSaved: () => void;
}): ReactElement {
  const { t } = useI18n();
  const [quantity, setQuantity] = useState('');
  const [unitCost, setUnitCost] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [reference, setReference] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setQuantity('');
    setUnitCost(ingredient?.costPerUnit ?? '');
    setSupplierId(ingredient?.supplierId ?? '');
    setReference('');
    setNote('');
    setError(null);
  }, [open, ingredient]);

  const mutation = useMutation({
    mutationFn: () => {
      if (!(Number(quantity) > 0)) throw new Error(t('inventory.purchase.quantityError'));
      return api.inventory.purchase(ingredient!.id, {
        quantity: Number(quantity),
        unitCost: unitCost.trim() ? Number(unitCost).toFixed(2) : undefined,
        supplierId: supplierId || null,
        reference: reference.trim() || undefined,
        note: note.trim() || undefined,
      });
    },
    onSuccess: () => {
      toast.success(t('inventory.purchase.success'));
      onSaved();
      onOpenChange(false);
    },
    onError: (error) =>
      setError(error instanceof Error ? error.message : t('inventory.purchase.failed')),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        title={
          ingredient
            ? t('inventory.purchase.titleWith', { name: ingredient.name })
            : t('inventory.purchase.title')
        }
        description={
          ingredient
            ? t('inventory.adjust.currentStock', {
                quantity: formatDecimal(ingredient.currentStock, 3),
                unit: unitLabel(ingredient.unit),
              })
            : undefined
        }
        className="max-w-md"
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="purchase-quantity" className="text-xs">
              {t('inventory.purchase.quantity', {
                unit: ingredient ? unitLabel(ingredient.unit) : t('inventory.purchase.units'),
              })}
            </Label>
            <Input
              id="purchase-quantity"
              type="number"
              min="0"
              step="0.001"
              value={quantity}
              onChange={(event) => setQuantity(event.target.value)}
              className="mt-1.5"
            />
          </div>
          <div>
            <Label htmlFor="purchase-cost" className="text-xs">
              {t('inventory.purchase.unitCost')}
            </Label>
            <Input
              id="purchase-cost"
              type="number"
              min="0"
              step="0.01"
              value={unitCost}
              onChange={(event) => setUnitCost(event.target.value)}
              className="mt-1.5"
            />
          </div>
          <div>
            <Label htmlFor="purchase-supplier" className="text-xs">
              {t('inventory.purchase.supplier')}
            </Label>
            <Select
              id="purchase-supplier"
              value={supplierId}
              onChange={(event) => setSupplierId(event.target.value)}
              className="mt-1.5"
            >
              <option value="">{t('inventory.purchase.noSupplier')}</option>
              {suppliers.map((supplier) => (
                <option key={supplier.id} value={supplier.id}>
                  {supplier.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="purchase-reference" className="text-xs">
              {t('inventory.purchase.reference')}
            </Label>
            <Input
              id="purchase-reference"
              value={reference}
              onChange={(event) => setReference(event.target.value)}
              className="mt-1.5"
            />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="purchase-note" className="text-xs">
              {t('inventory.purchase.note')}
            </Label>
            <Textarea
              id="purchase-note"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              className="mt-1.5 min-h-[60px]"
              maxLength={300}
            />
          </div>
        </div>
        {error ? <p className="text-xs text-destructive">{error}</p> : null}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={mutation.isPending}>
            {t('actions.cancel')}
          </Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending || !(Number(quantity) > 0)}>
            {mutation.isPending ? t('inventory.purchase.receiving') : t('inventory.purchase.receive')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SupplierDialog({
  open,
  onOpenChange,
  supplier,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  supplier: SupplierDto | null;
  onSaved: () => void;
}): ReactElement {
  const { t } = useI18n();
  const [nameEn, setNameEn] = useState('');
  const [nameAr, setNameAr] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (!open) return;
    setNameEn(supplier?.nameEn ?? '');
    setNameAr(supplier?.nameAr ?? '');
    setPhone(supplier?.phone ?? '');
    setEmail(supplier?.email ?? '');
    setAddress(supplier?.address ?? '');
    setNotes(supplier?.notes ?? '');
    setIsActive(supplier?.isActive ?? true);
  }, [open, supplier]);

  const namesValid = nameEn.trim().length >= 2 && nameAr.trim().length > 0;

  const mutation = useMutation({
    mutationFn: () => {
      if (nameEn.trim().length < 2) throw new Error(t('inventory.supplier.nameRequired'));
      if (!nameAr.trim()) throw new Error(t('inventory.supplier.arabicRequired'));
      const body = {
        name: nameEn.trim(),
        nameAr: nameAr.trim(),
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        address: address.trim() || undefined,
        notes: notes.trim() || undefined,
        isActive,
      };
      return supplier ? api.suppliers.update(supplier.id, body) : api.suppliers.create(body);
    },
    onSuccess: () => {
      toast.success(
        supplier ? t('inventory.supplier.updated') : t('inventory.supplier.created'),
      );
      onSaved();
      onOpenChange(false);
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : t('inventory.supplier.saveFailed')),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        title={supplier ? t('inventory.supplier.editTitle') : t('inventory.supplier.newTitle')}
        className="max-w-lg"
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="supplier-name-en" className="text-xs">
              {t('inventory.supplier.nameEn')}
            </Label>
            <Input
              id="supplier-name-en"
              value={nameEn}
              onChange={(event) => setNameEn(event.target.value)}
              placeholder={t('inventory.supplier.namePlaceholderEn')}
              dir="ltr"
              className="mt-1.5"
            />
          </div>
          <div>
            <Label htmlFor="supplier-name-ar" className="text-xs">
              {t('inventory.supplier.nameAr')}
            </Label>
            <Input
              id="supplier-name-ar"
              value={nameAr}
              onChange={(event) => setNameAr(event.target.value)}
              placeholder={t('inventory.supplier.namePlaceholderAr')}
              dir="rtl"
              lang="ar"
              className="mt-1.5"
            />
          </div>
          <div>
            <Label htmlFor="supplier-phone" className="text-xs">
              {t('inventory.supplier.phone')}
            </Label>
            <Input
              id="supplier-phone"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              className="mt-1.5"
            />
          </div>
          <div>
            <Label htmlFor="supplier-email" className="text-xs">
              {t('inventory.supplier.email')}
            </Label>
            <Input
              id="supplier-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-1.5"
            />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="supplier-address" className="text-xs">
              {t('inventory.supplier.address')}
            </Label>
            <Input
              id="supplier-address"
              value={address}
              onChange={(event) => setAddress(event.target.value)}
              className="mt-1.5"
            />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="supplier-notes" className="text-xs">
              {t('inventory.supplier.notes')}
            </Label>
            <Textarea
              id="supplier-notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              className="mt-1.5 min-h-[60px]"
              maxLength={500}
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-input"
              checked={isActive}
              onChange={(event) => setIsActive(event.target.checked)}
            />
            {t('inventory.supplier.active')}
          </label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={mutation.isPending}>
            {t('actions.cancel')}
          </Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending || !namesValid}>
            {mutation.isPending
              ? t('actions.saving')
              : supplier
                ? t('inventory.supplier.save')
                : t('inventory.supplier.create')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
