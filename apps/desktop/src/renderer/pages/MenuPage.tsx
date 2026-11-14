import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  BookOpen,
  Coffee,
  CupSoda,
  Pencil,
  Plus,
  Search,
  Tag,
  Trash2,
  X,
} from 'lucide-react';
import { useEffect, useState, type ReactElement } from 'react';
import {
  DISCOUNT_TYPES,
  type CategoryDto,
  type DiscountDto,
  type DiscountType,
  type IngredientDto,
  type MenuItemDto,
  type ToppingDto,
} from '@pharmacy/shared';
import { ItemEditorDialog } from '../components/menu/ItemEditorDialog';
import { RecipeEditorDialog } from '../components/menu/RecipeEditorDialog';
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
import { api } from '../lib/api';
import { resolveImageUrl } from '../lib/images';
import {
  formatDate,
  formatDecimal,
  formatMoney,
  menuKindLabel,
  unitLabel,
} from '../lib/format';
import { cn } from '../lib/utils';
import { useI18n, type TranslationKey } from '../i18n';

type Tab = 'items' | 'categories' | 'toppings' | 'discounts';

const PAGE_SIZE = 20;

const TABS: Array<{ key: Tab; labelKey: TranslationKey; icon: typeof Coffee }> = [
  { key: 'items', labelKey: 'menu.tabs.items', icon: Coffee },
  { key: 'categories', labelKey: 'menu.tabs.categories', icon: BookOpen },
  { key: 'toppings', labelKey: 'menu.tabs.toppings', icon: CupSoda },
  { key: 'discounts', labelKey: 'menu.tabs.discounts', icon: Tag },
];

const ADD_KEYS: Record<Tab, TranslationKey> = {
  items: 'menu.add.item',
  categories: 'menu.add.category',
  toppings: 'menu.add.topping',
  discounts: 'menu.add.discount',
};

interface PendingDelete {
  title: string;
  description: string;
  label: string;
  run: () => Promise<unknown>;
}

export function MenuPage(): ReactElement {
  const queryClient = useQueryClient();
  const { t } = useI18n();
  const [tab, setTab] = useState<Tab>('items');
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [availability, setAvailability] = useState<'all' | 'available' | 'soldout'>('all');
  const [itemEditorOpen, setItemEditorOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItemDto | null>(null);
  const [recipeOpen, setRecipeOpen] = useState(false);
  const [recipeItem, setRecipeItem] = useState<MenuItemDto | null>(null);
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CategoryDto | null>(null);
  const [toppingDialogOpen, setToppingDialogOpen] = useState(false);
  const [editingTopping, setEditingTopping] = useState<ToppingDto | null>(null);
  const [discountDialogOpen, setDiscountDialogOpen] = useState(false);
  const [editingDiscount, setEditingDiscount] = useState<DiscountDto | null>(null);
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(null);

  useEffect(() => {
    setPage(1);
  }, [search, categoryFilter, availability]);

  const categories = useQuery({
    queryKey: ['menu', 'categories'],
    queryFn: () => api.categories.list(),
    staleTime: 30_000,
  });

  const items = useQuery({
    queryKey: ['menu', 'items', { page, search, categoryFilter, availability }],
    queryFn: () =>
      api.menu.items({
        page,
        pageSize: PAGE_SIZE,
        q: search || undefined,
        categoryId: categoryFilter || undefined,
        isAvailable: availability === 'all' ? undefined : availability === 'available',
      }),
    placeholderData: (previous) => previous,
    enabled: tab === 'items',
  });

  const toppings = useQuery({
    queryKey: ['menu', 'toppings'],
    queryFn: () => api.menu.toppings(),
    staleTime: 30_000,
  });

  const discounts = useQuery({
    queryKey: ['discounts'],
    queryFn: () => api.discounts.list(),
    staleTime: 30_000,
  });

  const ingredients = useQuery({
    queryKey: ['inventory', 'ingredients', 'menu-options'],
    queryFn: () => api.inventory.ingredients({ page: 1, pageSize: 200, isActive: true }),
    staleTime: 60_000,
  });

  const invalidateMenu = (): void => {
    void queryClient.invalidateQueries({ queryKey: ['menu'] });
    void queryClient.invalidateQueries({ queryKey: ['discounts'] });
    void queryClient.invalidateQueries({ queryKey: ['pos', 'catalog'] });
  };

  const toggleItem = useMutation({
    mutationFn: (item: MenuItemDto) => api.menu.update(item.id, { isAvailable: !item.isAvailable }),
    onSuccess: (updated) => {
      toast.success(
        t('menu.item.toggleMessage', {
          name: updated.name,
          state: updated.isAvailable ? t('menu.item.available') : t('menu.item.soldOut'),
        }),
      );
      invalidateMenu();
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : t('menu.toasts.itemFailed')),
  });

  const toggleTopping = useMutation({
    mutationFn: (topping: ToppingDto) =>
      api.menu.updateTopping(topping.id, { isAvailable: !topping.isAvailable }),
    onSuccess: () => {
      toast.success(t('menu.toasts.toppingUpdated'));
      invalidateMenu();
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : t('menu.toasts.toppingFailed')),
  });

  const toggleDiscount = useMutation({
    mutationFn: (discount: DiscountDto) => api.discounts.update(discount.id, { isActive: !discount.isActive }),
    onSuccess: () => {
      toast.success(t('menu.toasts.discountUpdated'));
      invalidateMenu();
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : t('menu.toasts.discountFailed')),
  });

  const toggleCategory = useMutation({
    mutationFn: (category: CategoryDto) =>
      api.categories.update(category.id, { isActive: !category.isActive }),
    onSuccess: () => {
      toast.success(t('menu.toasts.categoryUpdated'));
      invalidateMenu();
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : t('menu.toasts.categoryFailed')),
  });

  const remove = useMutation({
    mutationFn: (task: PendingDelete) => task.run(),
    onSuccess: () => {
      toast.success(t('menu.toasts.deleted'));
      setPendingDelete(null);
      invalidateMenu();
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : t('menu.toasts.deleteFailed'));
      setPendingDelete(null);
    },
  });

  const addLabel = t(ADD_KEYS[tab]);

  const openAdd = (): void => {
    if (tab === 'items') {
      setEditingItem(null);
      setItemEditorOpen(true);
    } else if (tab === 'categories') {
      setEditingCategory(null);
      setCategoryDialogOpen(true);
    } else if (tab === 'toppings') {
      setEditingTopping(null);
      setToppingDialogOpen(true);
    } else {
      setEditingDiscount(null);
      setDiscountDialogOpen(true);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex flex-wrap gap-1 rounded-xl border border-border bg-card p-1 shadow-sm">
          {TABS.map((entry) => {
            const Icon = entry.icon;
            const count =
              entry.key === 'items'
                ? items.data?.total
                : entry.key === 'categories'
                  ? categories.data?.length
                  : entry.key === 'toppings'
                    ? toppings.data?.length
                    : discounts.data?.length;
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
                {count !== undefined ? (
                  <span className={cn('numeric text-[10px]', tab === entry.key ? 'opacity-70' : 'opacity-60')}>
                    {count}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
        <Button onClick={openAdd}>
          <Plus className="h-4 w-4" />
          {addLabel}
        </Button>
      </div>

      {tab === 'items' ? (
        <div className="rounded-xl border border-border bg-card shadow-sm">
          <div className="flex flex-wrap items-center gap-2 border-b border-border p-3">
            <div className="relative min-w-[220px] flex-1">
              <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={t('menu.search.placeholder')}
                className="h-9 ps-9"
                aria-label={t('menu.search.aria')}
              />
              {search ? (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute end-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:bg-muted"
                  aria-label={t('menu.search.clear')}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              ) : null}
            </div>
            <Select
              value={categoryFilter}
              onChange={(event) => setCategoryFilter(event.target.value)}
              aria-label={t('menu.filters.categoryAria')}
              className="h-9 w-[170px]"
            >
              <option value="">{t('menu.filters.allCategories')}</option>
              {(categories.data ?? []).map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </Select>
            <Select
              value={availability}
              onChange={(event) => setAvailability(event.target.value as typeof availability)}
              aria-label={t('menu.filters.availabilityAria')}
              className="h-9 w-[150px]"
            >
              <option value="all">{t('menu.filters.allAvailability')}</option>
              <option value="available">{t('menu.filters.available')}</option>
              <option value="soldout">{t('menu.filters.soldOut')}</option>
            </Select>
          </div>

          {items.isLoading ? (
            <SkeletonTable
              label={t('menu.loading.items')}
              rows={8}
              columns={[
                { kind: 'image', label: t('menu.columns.item') },
                { kind: 'text', label: t('menu.columns.category') },
                { kind: 'text', label: t('menu.columns.kind') },
                { kind: 'amount', label: t('menu.columns.price') },
                { kind: 'amount', label: t('menu.columns.foodCost') },
                { kind: 'muted', label: t('menu.columns.sizes') },
                { kind: 'toggle', label: t('menu.columns.status') },
                { kind: 'actions' },
              ]}
            />
          ) : items.isError ? (
            <div className="p-4">
              <ErrorState
                title={t('menu.errors.items')}
                message={items.error instanceof Error ? items.error.message : undefined}
                onRetry={() => void items.refetch()}
              />
            </div>
          ) : items.data && items.data.items.length === 0 ? (
            <EmptyPanel
              title={t('menu.empty.items')}
              message={t('menu.empty.itemsMessage')}
              action={
                <Button size="sm" onClick={openAdd}>
                  <Plus className="h-3.5 w-3.5" />
                  {t('menu.add.item')}
                </Button>
              }
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40 text-start text-[11px] uppercase tracking-wide text-muted-foreground">
                    <th className="px-3 py-2.5 font-semibold">{t('menu.columns.item')}</th>
                    <th className="px-3 py-2.5 font-semibold">{t('menu.columns.category')}</th>
                    <th className="px-3 py-2.5 font-semibold">{t('menu.columns.kind')}</th>
                    <th className="px-3 py-2.5 text-end font-semibold">{t('menu.columns.price')}</th>
                    <th className="px-3 py-2.5 text-end font-semibold">{t('menu.columns.foodCost')}</th>
                    <th className="px-3 py-2.5 font-semibold">{t('menu.columns.sizes')}</th>
                    <th className="px-3 py-2.5 font-semibold">{t('menu.columns.status')}</th>
                    <th className="px-3 py-2.5" />
                  </tr>
                </thead>
                <tbody>
                  {items.data!.items.map((item) => (
                    <tr key={item.id} className="border-b border-border/70 last:border-0 hover:bg-muted/30">
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-2.5">
                          {resolveImageUrl(item.imageUrl) ? (
                            <img
                              src={resolveImageUrl(item.imageUrl)!}
                              alt=""
                              className="h-9 w-9 rounded-lg object-cover"
                              loading="lazy"
                            />
                          ) : (
                            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary/10 text-secondary">
                              <Coffee className="h-4 w-4" />
                            </span>
                          )}
                          <div>
                            <p className="font-semibold">{item.name}</p>
                            <p className="numeric text-[11px] text-muted-foreground">
                              {item.sku}
                              {item.isFeatured ? ` · ${t('menu.item.featured')}` : ''}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-xs">{item.categoryName ?? '—'}</td>
                      <td className="px-3 py-2.5 text-xs">{menuKindLabel(item.kind)}</td>
                      <td className="numeric px-3 py-2.5 text-end">
                        {item.hasSizes && item.sizes.length > 0 ? (
                          <div>
                            <p className="font-semibold">
                              {formatMoney(Math.min(...item.sizes.map((size) => Number(size.price))))}
                            </p>
                            <p className="text-[10px] text-muted-foreground">
                              {t('menu.item.priceRange', {
                                price: formatMoney(Math.max(...item.sizes.map((size) => Number(size.price)))),
                              })}
                            </p>
                          </div>
                        ) : (
                          <span className="font-semibold">{formatMoney(item.basePrice)}</span>
                        )}
                      </td>
                      <td className="numeric px-3 py-2.5 text-end text-xs text-muted-foreground">
                        {formatMoney(item.costPrice)}
                      </td>
                      <td className="px-3 py-2.5 text-xs text-muted-foreground">
                        {item.hasSizes
                          ? item.sizes.map((size) => size.name).join(' · ')
                          : t('menu.item.single')}
                      </td>
                      <td className="px-3 py-2.5">
                        <Toggle
                          checked={item.isAvailable}
                          onChange={() => toggleItem.mutate(item)}
                          label={item.isAvailable ? t('menu.item.available') : t('menu.item.soldOut')}
                          disabled={toggleItem.isPending}
                        />
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setRecipeItem(item);
                              setRecipeOpen(true);
                            }}
                            title={t('menu.item.recipe')}
                          >
                            <Coffee className="h-3.5 w-3.5" />
                            {t('menu.item.recipe')}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setEditingItem(item);
                              setItemEditorOpen(true);
                            }}
                            aria-label={t('menu.item.edit', { name: item.name })}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:bg-destructive/10"
                            onClick={() =>
                              setPendingDelete({
                                title: t('menu.item.deleteTitle', { name: item.name }),
                                description: t('menu.item.deleteDescription'),
                                label: t('menu.item.deleteLabel'),
                                run: () => api.menu.remove(item.id),
                              })
                            }
                            aria-label={t('menu.item.delete', { name: item.name })}
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

          {items.data && items.data.total > 0 ? (
            <Pagination
              page={items.data.page}
              pageSize={items.data.pageSize}
              total={items.data.total}
              totalPages={items.data.totalPages}
              onPageChange={setPage}
            />
          ) : null}
        </div>
      ) : null}

      {tab === 'categories' ? (
        categories.isLoading ? (
          <div
            role="status"
            aria-live="polite"
            aria-busy="true"
            aria-label={t('menu.loading.categories')}
            className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3"
          >
            {Array.from({ length: 6 }).map((_, index) => (
              <div
                key={index}
                className="flex flex-col rounded-xl border border-border bg-card p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1 space-y-2">
                    <Skeleton className="h-3.5 w-32" />
                    <Skeleton className="h-2.5 w-full" />
                  </div>
                  <Skeleton radius="full" className="h-5 w-14 shrink-0" />
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <Skeleton className="h-2.5 w-14" />
                  <Skeleton className="h-2.5 w-10" />
                </div>
                <div className="mt-4 flex items-center gap-2 border-t border-border pt-3">
                  <Skeleton radius="full" className="h-5 w-9" />
                  <Skeleton radius="lg" className="ms-auto h-8 w-16" />
                  <Skeleton radius="lg" className="h-8 w-8" />
                </div>
              </div>
            ))}
          </div>
        ) : categories.isError ? (
          <ErrorState
            title={t('menu.errors.categories')}
            message={categories.error instanceof Error ? categories.error.message : undefined}
            onRetry={() => void categories.refetch()}
          />
        ) : (categories.data ?? []).length === 0 ? (
          <EmptyPanel
            title={t('menu.empty.categories')}
            action={<Button size="sm" onClick={openAdd}>{t('menu.add.category')}</Button>}
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {categories.data!.map((category) => (
              <div key={category.id} className="flex flex-col rounded-xl border border-border bg-card p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{category.name}</p>
                    <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                      {category.description ?? t('menu.category.noDescription')}
                    </p>
                  </div>
                  <StatusBadge
                    tone={category.isActive ? 'green' : 'neutral'}
                    label={category.isActive ? t('menu.category.active') : t('menu.category.hidden')}
                  />
                </div>
                <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="numeric">{t('menu.category.itemsCount', { count: category.itemCount })}</span>
                  <span>·</span>
                  <span className="numeric">{t('menu.category.sortOrder', { order: category.sortOrder })}</span>
                </div>
                <div className="mt-4 flex items-center gap-2 border-t border-border pt-3">
                  <Toggle
                    checked={category.isActive}
                    onChange={() => toggleCategory.mutate(category)}
                    label={category.isActive ? t('menu.category.visible') : t('menu.category.hidden')}
                    disabled={toggleCategory.isPending}
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    className="ms-auto"
                    onClick={() => {
                      setEditingCategory(category);
                      setCategoryDialogOpen(true);
                    }}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    {t('actions.edit')}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:bg-destructive/10"
                    onClick={() =>
                      setPendingDelete({
                        title: t('menu.category.deleteTitle', { name: category.name }),
                        description: t('menu.category.deleteDescription'),
                        label: t('menu.category.deleteLabel'),
                        run: () => api.categories.remove(category.id),
                      })
                    }
                    aria-label={t('menu.item.delete', { name: category.name })}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )
      ) : null}

      {tab === 'toppings' ? (
        <div className="rounded-xl border border-border bg-card shadow-sm">
          {toppings.isLoading ? (
            <SkeletonTable
              label={t('menu.loading.toppings')}
              rows={6}
              columns={[
                { kind: 'text', label: t('menu.columns.topping') },
                { kind: 'amount', label: t('menu.columns.price') },
                { kind: 'muted', label: t('menu.columns.ingredientLink') },
                { kind: 'muted', label: t('menu.columns.deduction') },
                { kind: 'toggle', label: t('menu.columns.status') },
                { kind: 'actions' },
              ]}
            />
          ) : toppings.isError ? (
            <ErrorState
              title={t('menu.errors.toppings')}
              message={toppings.error instanceof Error ? toppings.error.message : undefined}
              onRetry={() => void toppings.refetch()}
            />
          ) : (toppings.data ?? []).length === 0 ? (
            <EmptyPanel
              title={t('menu.empty.toppings')}
              action={<Button size="sm" onClick={openAdd}>{t('menu.add.topping')}</Button>}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40 text-start text-[11px] uppercase tracking-wide text-muted-foreground">
                    <th className="px-3 py-2.5 font-semibold">{t('menu.columns.topping')}</th>
                    <th className="px-3 py-2.5 text-end font-semibold">{t('menu.columns.price')}</th>
                    <th className="px-3 py-2.5 font-semibold">{t('menu.columns.ingredientLink')}</th>
                    <th className="px-3 py-2.5 font-semibold">{t('menu.columns.deduction')}</th>
                    <th className="px-3 py-2.5 font-semibold">{t('menu.columns.status')}</th>
                    <th className="px-3 py-2.5" />
                  </tr>
                </thead>
                <tbody>
                  {toppings.data!.map((topping) => {
                    const ingredient = ingredients.data?.items.find((row) => row.id === topping.ingredientId);
                    return (
                      <tr key={topping.id} className="border-b border-border/70 last:border-0 hover:bg-muted/30">
                        <td className="px-3 py-2.5 font-semibold">{topping.name}</td>
                        <td className="numeric px-3 py-2.5 text-end">{formatMoney(topping.price)}</td>
                        <td className="px-3 py-2.5 text-xs text-muted-foreground">
                          {ingredient
                            ? `${ingredient.name} (${unitLabel(ingredient.unit)})`
                            : t('menu.topping.notLinked')}
                        </td>
                        <td className="numeric px-3 py-2.5 text-xs">
                          {ingredient && topping.ingredientQuantity > 0
                            ? `${formatDecimal(topping.ingredientQuantity, 3)} ${unitLabel(ingredient.unit)}`
                            : '—'}
                        </td>
                        <td className="px-3 py-2.5">
                          <Toggle
                            checked={topping.isAvailable}
                            onChange={() => toggleTopping.mutate(topping)}
                            label={topping.isAvailable ? t('menu.topping.availableBadge') : t('menu.topping.hidden')}
                            disabled={toggleTopping.isPending}
                          />
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setEditingTopping(topping);
                                setToppingDialogOpen(true);
                              }}
                              aria-label={t('menu.item.edit', { name: topping.name })}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive hover:bg-destructive/10"
                              onClick={() =>
                                setPendingDelete({
                                  title: t('menu.topping.deleteTitle', { name: topping.name }),
                                  description: t('menu.topping.deleteDescription'),
                                  label: t('menu.topping.deleteLabel'),
                                  run: () => api.menu.removeTopping(topping.id),
                                })
                              }
                              aria-label={t('menu.item.delete', { name: topping.name })}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : null}

      {tab === 'discounts' ? (
        <div className="rounded-xl border border-border bg-card shadow-sm">
          {discounts.isLoading ? (
            <SkeletonTable
              label={t('menu.loading.discounts')}
              rows={5}
              columns={[
                { kind: 'text', label: t('menu.columns.discount') },
                { kind: 'text', label: t('menu.columns.type') },
                { kind: 'amount', label: t('menu.columns.value') },
                { kind: 'muted', label: t('menu.columns.created') },
                { kind: 'toggle', label: t('menu.columns.status') },
                { kind: 'actions' },
              ]}
            />
          ) : discounts.isError ? (
            <ErrorState
              title={t('menu.errors.discounts')}
              message={discounts.error instanceof Error ? discounts.error.message : undefined}
              onRetry={() => void discounts.refetch()}
            />
          ) : (discounts.data ?? []).length === 0 ? (
            <EmptyPanel
              title={t('menu.empty.discounts')}
              action={<Button size="sm" onClick={openAdd}>{t('menu.add.discount')}</Button>}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40 text-start text-[11px] uppercase tracking-wide text-muted-foreground">
                    <th className="px-3 py-2.5 font-semibold">{t('menu.columns.discount')}</th>
                    <th className="px-3 py-2.5 font-semibold">{t('menu.columns.type')}</th>
                    <th className="px-3 py-2.5 text-end font-semibold">{t('menu.columns.value')}</th>
                    <th className="px-3 py-2.5 font-semibold">{t('menu.columns.created')}</th>
                    <th className="px-3 py-2.5 font-semibold">{t('menu.columns.status')}</th>
                    <th className="px-3 py-2.5" />
                  </tr>
                </thead>
                <tbody>
                  {discounts.data!.map((discount) => (
                    <tr key={discount.id} className="border-b border-border/70 last:border-0 hover:bg-muted/30">
                      <td className="px-3 py-2.5 font-semibold">{discount.name}</td>
                      <td className="px-3 py-2.5 text-xs">
                        {discount.type === 'PERCENT' ? t('menu.discount.percentage') : t('menu.discount.fixed')}
                      </td>
                      <td className="numeric px-3 py-2.5 text-end">
                        {discount.type === 'PERCENT'
                          ? `${formatDecimal(Number(discount.value))}%`
                          : formatMoney(discount.value)}
                      </td>
                      <td className="px-3 py-2.5 text-xs text-muted-foreground">{formatDate(discount.createdAt)}</td>
                      <td className="px-3 py-2.5">
                        <Toggle
                          checked={discount.isActive}
                          onChange={() => toggleDiscount.mutate(discount)}
                          label={discount.isActive ? t('menu.discount.active') : t('menu.discount.inactive')}
                          disabled={toggleDiscount.isPending}
                        />
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setEditingDiscount(discount);
                              setDiscountDialogOpen(true);
                            }}
                            aria-label={t('menu.item.edit', { name: discount.name })}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:bg-destructive/10"
                            onClick={() =>
                              setPendingDelete({
                                title: t('menu.discount.deleteTitle', { name: discount.name }),
                                description: t('menu.discount.deleteDescription'),
                                label: t('menu.discount.deleteLabel'),
                                run: () => api.discounts.remove(discount.id),
                              })
                            }
                            aria-label={t('menu.item.delete', { name: discount.name })}
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

      <p className="text-[11px] text-muted-foreground">{t('menu.footer')}</p>

      <ItemEditorDialog
        open={itemEditorOpen}
        onOpenChange={setItemEditorOpen}
        item={editingItem}
        categories={categories.data ?? []}
        onSaved={invalidateMenu}
      />

      <RecipeEditorDialog
        open={recipeOpen}
        onOpenChange={setRecipeOpen}
        item={recipeItem}
        onSaved={invalidateMenu}
      />

      <CategoryDialog
        open={categoryDialogOpen}
        onOpenChange={setCategoryDialogOpen}
        category={editingCategory}
        onSaved={invalidateMenu}
      />

      <ToppingDialog
        open={toppingDialogOpen}
        onOpenChange={setToppingDialogOpen}
        topping={editingTopping}
        ingredients={ingredients.data?.items ?? []}
        onSaved={invalidateMenu}
      />

      <DiscountDialog
        open={discountDialogOpen}
        onOpenChange={setDiscountDialogOpen}
        discount={editingDiscount}
        onSaved={invalidateMenu}
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
          if (pendingDelete) remove.mutate(pendingDelete);
        }}
      />
    </div>
  );
}

function Toggle({
  checked,
  onChange,
  label,
  disabled,
}: {
  checked: boolean;
  onChange: () => void;
  label: string;
  disabled?: boolean;
}): ReactElement {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      disabled={disabled}
      className="inline-flex items-center gap-2 text-xs font-medium disabled:opacity-50"
    >
      <span
        className={cn(
          'relative h-4 w-7 rounded-full transition-colors',
          checked ? 'bg-success' : 'bg-muted-foreground/30',
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 h-3 w-3 rounded-full bg-white shadow transition-transform',
            checked ? 'start-0.5 translate-x-3.5 rtl:-translate-x-3.5' : 'start-0.5',
          )}
        />
      </span>
      <span className={checked ? 'text-foreground' : 'text-muted-foreground'}>{label}</span>
    </button>
  );
}

function CategoryDialog({
  open,
  onOpenChange,
  category,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category: CategoryDto | null;
  onSaved: () => void;
}): ReactElement {
  const { t } = useI18n();
  const [nameEn, setNameEn] = useState('');
  const [nameAr, setNameAr] = useState('');
  const [descriptionEn, setDescriptionEn] = useState('');
  const [descriptionAr, setDescriptionAr] = useState('');
  const [sortOrder, setSortOrder] = useState('0');
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (!open) return;
    setNameEn(category?.nameEn ?? category?.name ?? '');
    setNameAr(category?.nameAr ?? '');
    setDescriptionEn(category?.descriptionEn ?? category?.description ?? '');
    setDescriptionAr(category?.descriptionAr ?? '');
    setSortOrder(String(category?.sortOrder ?? 0));
    setIsActive(category?.isActive ?? true);
  }, [open, category]);

  const mutation = useMutation({
    mutationFn: () => {
      if (nameEn.trim().length < 2) throw new Error(t('menu.category.nameRequired'));
      if (!nameAr.trim()) throw new Error(t('menu.category.arabicRequired'));
      const body = {
        name: nameEn.trim(),
        nameAr: nameAr.trim(),
        description: descriptionEn.trim() || undefined,
        descriptionAr: descriptionAr.trim() || undefined,
        sortOrder: Number(sortOrder || 0),
        isActive,
      };
      return category ? api.categories.update(category.id, body) : api.categories.create(body);
    },
    onSuccess: () => {
      toast.success(category ? t('menu.category.updated') : t('menu.category.created'));
      onSaved();
      onOpenChange(false);
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : t('menu.category.saveFailed')),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        title={category ? t('menu.category.editTitle') : t('menu.category.newTitle')}
        className="max-w-lg"
      >
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="category-name" className="text-xs">{t('menu.category.nameEn')}</Label>
              <Input
                id="category-name"
                value={nameEn}
                onChange={(event) => setNameEn(event.target.value)}
                placeholder={t('menu.category.namePlaceholderEn')}
                className="mt-1.5"
                dir="ltr"
              />
            </div>
            <div>
              <Label htmlFor="category-name-ar" className="text-xs">{t('menu.category.nameAr')}</Label>
              <Input
                id="category-name-ar"
                value={nameAr}
                onChange={(event) => setNameAr(event.target.value)}
                placeholder={t('menu.category.namePlaceholderAr')}
                className="mt-1.5"
                dir="rtl"
                lang="ar"
              />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="category-description" className="text-xs">{t('menu.category.descriptionEn')}</Label>
              <Textarea
                id="category-description"
                value={descriptionEn}
                onChange={(event) => setDescriptionEn(event.target.value)}
                placeholder={t('menu.category.descriptionPlaceholderEn')}
                maxLength={300}
                className="mt-1.5"
                dir="ltr"
              />
            </div>
            <div>
              <Label htmlFor="category-description-ar" className="text-xs">{t('menu.category.descriptionAr')}</Label>
              <Textarea
                id="category-description-ar"
                value={descriptionAr}
                onChange={(event) => setDescriptionAr(event.target.value)}
                placeholder={t('menu.category.descriptionPlaceholderAr')}
                maxLength={300}
                className="mt-1.5"
                dir="rtl"
                lang="ar"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="category-sort" className="text-xs">{t('menu.category.sort')}</Label>
              <Input
                id="category-sort"
                type="number"
                min={0}
                max={999}
                value={sortOrder}
                onChange={(event) => setSortOrder(event.target.value)}
                className="mt-1.5"
                dir="ltr"
              />
            </div>
            <label className="mt-6 flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-input"
                checked={isActive}
                onChange={(event) => setIsActive(event.target.checked)}
              />
              {t('menu.category.visibleInPos')}
            </label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={mutation.isPending}>
            {t('actions.cancel')}
          </Button>
          <Button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending || nameEn.trim().length < 2 || !nameAr.trim()}
          >
            {mutation.isPending
              ? t('actions.saving')
              : category
                ? t('menu.category.save')
                : t('menu.category.create')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ToppingDialog({
  open,
  onOpenChange,
  topping,
  ingredients,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  topping: ToppingDto | null;
  ingredients: IngredientDto[];
  onSaved: () => void;
}): ReactElement {
  const { t } = useI18n();
  const [nameEn, setNameEn] = useState('');
  const [nameAr, setNameAr] = useState('');
  const [price, setPrice] = useState('');
  const [ingredientId, setIngredientId] = useState('');
  const [ingredientQuantity, setIngredientQuantity] = useState('0');
  const [isAvailable, setIsAvailable] = useState(true);
  const [sortOrder, setSortOrder] = useState('0');

  useEffect(() => {
    if (!open) return;
    setNameEn(topping?.nameEn ?? topping?.name ?? '');
    setNameAr(topping?.nameAr ?? '');
    setPrice(topping?.price ?? '');
    setIngredientId(topping?.ingredientId ?? '');
    setIngredientQuantity(String(topping?.ingredientQuantity ?? 0));
    setIsAvailable(topping?.isAvailable ?? true);
    setSortOrder(String(topping?.sortOrder ?? 0));
  }, [open, topping]);

  const mutation = useMutation({
    mutationFn: () => {
      if (nameEn.trim().length < 2) throw new Error(t('menu.topping.nameRequired'));
      if (!nameAr.trim()) throw new Error(t('menu.topping.arabicRequired'));
      if (!(Number(price) > 0)) throw new Error(t('menu.topping.priceRequired'));
      const body = {
        name: nameEn.trim(),
        nameAr: nameAr.trim(),
        price: price.trim(),
        ingredientId: ingredientId || null,
        ingredientQuantity: Number(ingredientQuantity || 0),
        isAvailable,
        sortOrder: Number(sortOrder || 0),
      };
      return topping
        ? api.menu.updateTopping(topping.id, body)
        : api.menu.createTopping({ ...body, ingredientId: ingredientId || undefined });
    },
    onSuccess: () => {
      toast.success(topping ? t('menu.topping.updated') : t('menu.topping.created'));
      onSaved();
      onOpenChange(false);
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : t('menu.topping.saveFailed')),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        title={topping ? t('menu.topping.editTitle') : t('menu.topping.newTitle')}
        className="max-w-lg"
      >
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="topping-name" className="text-xs">{t('menu.topping.nameEn')}</Label>
              <Input
                id="topping-name"
                value={nameEn}
                onChange={(event) => setNameEn(event.target.value)}
                placeholder={t('menu.topping.namePlaceholderEn')}
                className="mt-1.5"
                dir="ltr"
              />
            </div>
            <div>
              <Label htmlFor="topping-name-ar" className="text-xs">{t('menu.topping.nameAr')}</Label>
              <Input
                id="topping-name-ar"
                value={nameAr}
                onChange={(event) => setNameAr(event.target.value)}
                placeholder={t('menu.topping.namePlaceholderAr')}
                className="mt-1.5"
                dir="rtl"
                lang="ar"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="topping-price" className="text-xs">{t('menu.topping.price')}</Label>
              <Input
                id="topping-price"
                type="number"
                min="0"
                step="0.01"
                value={price}
                onChange={(event) => setPrice(event.target.value)}
                placeholder="0.00"
                className="mt-1.5"
                dir="ltr"
              />
            </div>
            <div>
              <Label htmlFor="topping-sort" className="text-xs">{t('menu.topping.sort')}</Label>
              <Input
                id="topping-sort"
                type="number"
                min={0}
                value={sortOrder}
                onChange={(event) => setSortOrder(event.target.value)}
                className="mt-1.5"
                dir="ltr"
              />
            </div>
          </div>
          <div>
            <Label htmlFor="topping-ingredient" className="text-xs">{t('menu.topping.ingredient')}</Label>
            <Select
              id="topping-ingredient"
              value={ingredientId}
              onChange={(event) => setIngredientId(event.target.value)}
              className="mt-1.5"
            >
              <option value="">{t('menu.topping.noDeduction')}</option>
              {ingredients.map((ingredient) => (
                <option key={ingredient.id} value={ingredient.id}>
                  {ingredient.name} ({unitLabel(ingredient.unit)})
                </option>
              ))}
            </Select>
          </div>
          {ingredientId ? (
            <div>
              <Label htmlFor="topping-quantity" className="text-xs">
                {t('menu.topping.quantity', {
                  unit: unitLabel(ingredients.find((row) => row.id === ingredientId)?.unit ?? 'KG'),
                })}
              </Label>
              <Input
                id="topping-quantity"
                type="number"
                min="0"
                step="0.001"
                value={ingredientQuantity}
                onChange={(event) => setIngredientQuantity(event.target.value)}
                className="mt-1.5"
                dir="ltr"
              />
            </div>
          ) : null}
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-input"
              checked={isAvailable}
              onChange={(event) => setIsAvailable(event.target.checked)}
            />
            {t('menu.topping.available')}
          </label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={mutation.isPending}>
            {t('actions.cancel')}
          </Button>
          <Button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending || nameEn.trim().length < 2 || !nameAr.trim() || !(Number(price) > 0)}
          >
            {mutation.isPending
              ? t('actions.saving')
              : topping
                ? t('menu.topping.save')
                : t('menu.topping.create')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DiscountDialog({
  open,
  onOpenChange,
  discount,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  discount: DiscountDto | null;
  onSaved: () => void;
}): ReactElement {
  const { t } = useI18n();
  const [nameEn, setNameEn] = useState('');
  const [nameAr, setNameAr] = useState('');
  const [type, setType] = useState<DiscountType>('PERCENT');
  const [value, setValue] = useState('');
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (!open) return;
    setNameEn(discount?.nameEn ?? discount?.name ?? '');
    setNameAr(discount?.nameAr ?? '');
    setType(discount?.type ?? 'PERCENT');
    setValue(discount?.value ?? '');
    setIsActive(discount?.isActive ?? true);
  }, [open, discount]);

  const invalidValue = !(Number(value) > 0) || (type === 'PERCENT' && Number(value) > 100);

  const mutation = useMutation({
    mutationFn: () => {
      if (nameEn.trim().length < 2) throw new Error(t('menu.discount.nameRequired'));
      if (!nameAr.trim()) throw new Error(t('menu.discount.arabicRequired'));
      if (invalidValue) throw new Error(t('menu.discount.valueRequired'));
      const body = {
        name: nameEn.trim(),
        nameAr: nameAr.trim(),
        type,
        value: Number(value).toFixed(2),
        isActive,
      };
      return discount ? api.discounts.update(discount.id, body) : api.discounts.create(body);
    },
    onSuccess: () => {
      toast.success(discount ? t('menu.discount.updated') : t('menu.discount.created'));
      onSaved();
      onOpenChange(false);
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : t('menu.discount.saveFailed')),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        title={discount ? t('menu.discount.editTitle') : t('menu.discount.newTitle')}
        className="max-w-lg"
      >
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="discount-name" className="text-xs">{t('menu.discount.nameEn')}</Label>
              <Input
                id="discount-name"
                value={nameEn}
                onChange={(event) => setNameEn(event.target.value)}
                placeholder={t('menu.discount.namePlaceholderEn')}
                className="mt-1.5"
                dir="ltr"
              />
            </div>
            <div>
              <Label htmlFor="discount-name-ar" className="text-xs">{t('menu.discount.nameAr')}</Label>
              <Input
                id="discount-name-ar"
                value={nameAr}
                onChange={(event) => setNameAr(event.target.value)}
                placeholder={t('menu.discount.namePlaceholderAr')}
                className="mt-1.5"
                dir="rtl"
                lang="ar"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="discount-type" className="text-xs">{t('menu.discount.type')}</Label>
              <Select
                id="discount-type"
                value={type}
                onChange={(event) => setType(event.target.value as DiscountType)}
                className="mt-1.5"
              >
                {DISCOUNT_TYPES.map((option) => (
                  <option key={option} value={option}>
                    {option === 'PERCENT' ? t('menu.discount.percentage') : t('menu.discount.fixed')}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="discount-value" className="text-xs">
                {t('menu.discount.valueLabel', { unit: type === 'PERCENT' ? '%' : t('labels.currency') })}
              </Label>
              <Input
                id="discount-value"
                type="number"
                min="0"
                step="0.01"
                max={type === 'PERCENT' ? 100 : undefined}
                value={value}
                onChange={(event) => setValue(event.target.value)}
                className="mt-1.5"
                dir="ltr"
              />
            </div>
          </div>
          {type === 'PERCENT' ? (
            <p className="text-[11px] text-muted-foreground">{t('menu.discount.cashierCapNote')}</p>
          ) : null}
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-input"
              checked={isActive}
              onChange={(event) => setIsActive(event.target.checked)}
            />
            {t('menu.discount.checkout')}
          </label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={mutation.isPending}>
            {t('actions.cancel')}
          </Button>
          <Button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending || nameEn.trim().length < 2 || !nameAr.trim() || invalidValue}
          >
            {mutation.isPending
              ? t('actions.saving')
              : discount
                ? t('menu.discount.save')
                : t('menu.discount.create')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
