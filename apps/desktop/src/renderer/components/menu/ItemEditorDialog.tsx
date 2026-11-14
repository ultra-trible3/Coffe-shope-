import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, X } from 'lucide-react';
import { useEffect, useState, type ReactElement } from 'react';
import {
  MENU_KINDS,
  menuItemCreateSchema,
  type CategoryDto,
  type MenuItemDto,
  type MenuKind,
} from '@pharmacy/shared';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogFooter } from '../ui/dialog';
import { Input, Select, Textarea } from '../ui/input';
import { Label } from '../ui/label';
import { toast } from '../ui/toast';
import { api } from '../../lib/api';
import { menuKindLabel } from '../../lib/format';
import { resolveImageUrl } from '../../lib/images';
import { useI18n } from '../../i18n';

interface SizeRow {
  key: string;
  nameEn: string;
  nameAr: string;
  price: string;
  ingredientMultiplier: string;
  isDefault: boolean;
}

interface FormState {
  nameEn: string;
  nameAr: string;
  descriptionEn: string;
  descriptionAr: string;
  imageUrl: string;
  categoryId: string;
  kind: MenuKind;
  sku: string;
  basePrice: string;
  costPrice: string;
  prepMinutes: string;
  isAvailable: boolean;
  isFeatured: boolean;
  hasSizes: boolean;
  sizes: SizeRow[];
}

function emptyForm(categories: CategoryDto[]): FormState {
  return {
    nameEn: '',
    nameAr: '',
    descriptionEn: '',
    descriptionAr: '',
    imageUrl: '',
    categoryId: categories[0]?.id ?? '',
    kind: 'HOT_DRINK',
    sku: '',
    basePrice: '',
    costPrice: '0.00',
    prepMinutes: '4',
    isAvailable: true,
    isFeatured: false,
    hasSizes: true,
    sizes: [
      { key: 'size-1', nameEn: 'Small', nameAr: 'صغير', price: '', ingredientMultiplier: '0.8', isDefault: false },
      { key: 'size-2', nameEn: 'Regular', nameAr: 'عادي', price: '', ingredientMultiplier: '1', isDefault: true },
      { key: 'size-3', nameEn: 'Large', nameAr: 'كبير', price: '', ingredientMultiplier: '1.25', isDefault: false },
    ],
  };
}

function fromItem(item: MenuItemDto): FormState {
  return {
    nameEn: item.nameEn,
    nameAr: item.nameAr ?? '',
    descriptionEn: item.descriptionEn ?? item.description ?? '',
    descriptionAr: item.descriptionAr ?? '',
    imageUrl: item.imageUrl ?? '',
    categoryId: item.categoryId,
    kind: item.kind,
    sku: item.sku,
    basePrice: item.basePrice,
    costPrice: item.costPrice,
    prepMinutes: String(item.prepMinutes),
    isAvailable: item.isAvailable,
    isFeatured: item.isFeatured,
    hasSizes: item.hasSizes,
    sizes: item.sizes.map((size) => ({
      key: size.id,
      nameEn: size.nameEn,
      nameAr: size.nameAr ?? '',
      price: size.price,
      ingredientMultiplier: String(size.ingredientMultiplier),
      isDefault: size.isDefault,
    })),
  };
}

export function ItemEditorDialog({
  open,
  onOpenChange,
  item,
  categories,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: MenuItemDto | null;
  categories: CategoryDto[];
  onSaved: () => void;
}): ReactElement {
  const queryClient = useQueryClient();
  const { t } = useI18n();
  const [form, setForm] = useState<FormState>(() => emptyForm(categories));
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open) return;
    setForm(item ? fromItem(item) : emptyForm(categories));
    setErrors({});
  }, [open, item, categories]);

  const update = <K extends keyof FormState>(key: K, value: FormState[K]): void => {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => {
      if (!current[key as string]) return current;
      const next = { ...current };
      delete next[key as string];
      return next;
    });
  };

  const updateSize = (key: string, patch: Partial<SizeRow>): void => {
    setForm((current) => ({
      ...current,
      sizes: current.sizes.map((size) => (size.key === key ? { ...size, ...patch } : size)),
    }));
  };

  const setDefaultSize = (key: string): void => {
    setForm((current) => ({
      ...current,
      sizes: current.sizes.map((size) => ({ ...size, isDefault: size.key === key })),
    }));
  };

  const addSize = (): void => {
    setForm((current) => ({
      ...current,
      sizes: [
        ...current.sizes,
        {
          key: `size-${Date.now()}`,
          nameEn: '',
          nameAr: '',
          price: '',
          ingredientMultiplier: '1',
          isDefault: current.sizes.length === 0,
        },
      ],
    }));
  };

  const removeSize = (key: string): void => {
    setForm((current) => {
      const sizes = current.sizes.filter((size) => size.key !== key);
      if (sizes.length > 0 && !sizes.some((size) => size.isDefault)) sizes[0]!.isDefault = true;
      return { ...current, sizes };
    });
  };

  const buildPayload = (): Record<string, unknown> => ({
    name: form.nameEn.trim(),
    nameAr: form.nameAr.trim(),
    description: form.descriptionEn.trim() || undefined,
    descriptionAr: form.descriptionAr.trim() || undefined,
    imageUrl: form.imageUrl.trim() || undefined,
    categoryId: form.categoryId,
    kind: form.kind,
    sku: form.sku.trim() || undefined,
    basePrice: form.basePrice.trim(),
    costPrice: form.costPrice.trim() || '0.00',
    prepMinutes: Number(form.prepMinutes),
    isAvailable: form.isAvailable,
    isFeatured: form.isFeatured,
    hasSizes: form.hasSizes,
    sizes: form.hasSizes
      ? form.sizes.map((size, index) => ({
          name: size.nameEn.trim(),
          nameAr: size.nameAr.trim(),
          price: size.price.trim(),
          ingredientMultiplier: Number(size.ingredientMultiplier || 1),
          isDefault: size.isDefault,
          sortOrder: index,
        }))
      : [],
  });

  const mutation = useMutation({
    mutationFn: () => {
      const payload = buildPayload();
      return item
        ? api.menu.update(item.id, payload as never)
        : api.menu.create(payload as never);
    },
    onSuccess: () => {
      toast.success(item ? t('menu.editor.updated') : t('menu.editor.created'));
      void queryClient.invalidateQueries({ queryKey: ['menu'] });
      void queryClient.invalidateQueries({ queryKey: ['pos', 'catalog'] });
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      onSaved();
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : t('menu.editor.saveFailed'));
    },
  });

  const submit = (): void => {
    const payload = buildPayload();
    const next: Record<string, string> = {};
    if (form.nameEn.trim().length < 2) next.name = t('validation.required');
    if (!form.nameAr.trim()) next.nameAr = t('menu.editor.arabicRequired');
    if (form.hasSizes && form.sizes.some((size) => !size.nameEn.trim() || !size.nameAr.trim())) {
      next.sizes = t('menu.editor.sizeArabicRequired');
    }
    const parsed = menuItemCreateSchema.safeParse(payload);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const key = issue.path[0];
        if (typeof key === 'string' && !next[key] && !next.name) next[key] = issue.message;
      }
    }
    if (Object.keys(next).length > 0) {
      setErrors(next);
      toast.error(t('menu.editor.fixFields'));
      return;
    }
    setErrors({});
    mutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        title={item ? t('menu.editor.editTitle', { name: item.name }) : t('menu.editor.newTitle')}
        description={t('menu.editor.description')}
        className="max-w-3xl"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t('menu.editor.nameEn')} error={errors.name}>
            <Input
              value={form.nameEn}
              onChange={(event) => update('nameEn', event.target.value)}
              placeholder={t('menu.editor.namePlaceholderEn')}
              dir="ltr"
            />
          </Field>
          <Field label={t('menu.editor.nameAr')} error={errors.nameAr}>
            <Input
              value={form.nameAr}
              onChange={(event) => update('nameAr', event.target.value)}
              placeholder={t('menu.editor.namePlaceholderAr')}
              dir="rtl"
              lang="ar"
            />
          </Field>

          <Field label={t('menu.editor.descriptionEn')} className="sm:col-span-2">
            <Textarea
              value={form.descriptionEn}
              onChange={(event) => update('descriptionEn', event.target.value)}
              placeholder={t('menu.editor.descriptionPlaceholderEn')}
              maxLength={600}
              dir="ltr"
            />
          </Field>
          <Field label={t('menu.editor.descriptionAr')} className="sm:col-span-2">
            <Textarea
              value={form.descriptionAr}
              onChange={(event) => update('descriptionAr', event.target.value)}
              placeholder={t('menu.editor.descriptionPlaceholderAr')}
              maxLength={600}
              dir="rtl"
              lang="ar"
            />
          </Field>

          <Field label={t('menu.editor.category')} error={errors.categoryId}>
            <Select
              value={form.categoryId}
              onChange={(event) => update('categoryId', event.target.value)}
            >
              <option value="">{t('menu.editor.chooseCategory')}</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </Select>
          </Field>

          <Field label={t('menu.editor.kind')}>
            <Select value={form.kind} onChange={(event) => update('kind', event.target.value as MenuKind)}>
              {MENU_KINDS.map((kind) => (
                <option key={kind} value={kind}>
                  {menuKindLabel(kind)}
                </option>
              ))}
            </Select>
          </Field>

          <Field label={t('menu.editor.sku')} hint={t('menu.editor.skuHint')}>
            <Input
              value={form.sku}
              onChange={(event) => update('sku', event.target.value.toUpperCase())}
              placeholder={t('menu.editor.skuPlaceholder')}
              dir="ltr"
            />
          </Field>

          <Field label={t('menu.editor.prepTime')} error={errors.prepMinutes}>
            <Input
              type="number"
              min={1}
              max={180}
              value={form.prepMinutes}
              onChange={(event) => update('prepMinutes', event.target.value)}
              dir="ltr"
            />
          </Field>

          <Field label={t('menu.editor.basePrice')} error={errors.basePrice}>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={form.basePrice}
              onChange={(event) => update('basePrice', event.target.value)}
              placeholder="0.00"
              dir="ltr"
            />
          </Field>

          <Field label={t('menu.editor.foodCost')} error={errors.costPrice} hint={t('menu.editor.foodCostHint')}>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={form.costPrice}
              onChange={(event) => update('costPrice', event.target.value)}
              dir="ltr"
            />
          </Field>

          <Field label={t('menu.editor.imageUrl')} className="sm:col-span-2" hint={t('menu.editor.imageHint')}>
            <div className="flex items-center gap-2">
              {resolveImageUrl(form.imageUrl) ? (
                <img
                  src={resolveImageUrl(form.imageUrl)!}
                  alt=""
                  className="h-10 w-10 shrink-0 rounded-lg border border-border object-cover"
                />
              ) : null}
              <Input
                value={form.imageUrl}
                onChange={(event) => update('imageUrl', event.target.value)}
                placeholder="https://…"
                className="flex-1"
                dir="ltr"
              />
            </div>
          </Field>

          <div className="flex flex-wrap items-center gap-5 sm:col-span-2">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-input"
                checked={form.isAvailable}
                onChange={(event) => update('isAvailable', event.target.checked)}
              />
              {t('menu.editor.available')}
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-input"
                checked={form.isFeatured}
                onChange={(event) => update('isFeatured', event.target.checked)}
              />
              {t('menu.editor.featured')}
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-input"
                checked={form.hasSizes}
                onChange={(event) => {
                  const checked = event.target.checked;
                  update('hasSizes', checked);
                  if (checked && form.sizes.length === 0) addSize();
                }}
              />
              {t('menu.editor.bySize')}
            </label>
          </div>
        </div>

        {form.hasSizes ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold">{t('menu.editor.sizesTitle')}</p>
                <p className="text-xs text-muted-foreground">{t('menu.editor.sizesHint')}</p>
              </div>
              <Button variant="outline" size="sm" onClick={addSize}>
                <Plus className="h-3.5 w-3.5" />
                {t('menu.editor.addSize')}
              </Button>
            </div>
            {errors.sizes ? <p className="text-xs text-destructive">{errors.sizes}</p> : null}
            <div className="space-y-2">
              {form.sizes.map((size, index) => (
                <div key={size.key} className="rounded-lg border border-border bg-muted/20 p-2.5">
                  <div className="grid gap-2 sm:grid-cols-2">
                    <Input
                      value={size.nameEn}
                      onChange={(event) => updateSize(size.key, { nameEn: event.target.value })}
                      placeholder={t('menu.editor.sizeNamePlaceholderEn', { number: index + 1 })}
                      aria-label={t('menu.editor.sizeNameEn')}
                      dir="ltr"
                    />
                    <Input
                      value={size.nameAr}
                      onChange={(event) => updateSize(size.key, { nameAr: event.target.value })}
                      placeholder={t('menu.editor.sizeNamePlaceholderAr', { number: index + 1 })}
                      aria-label={t('menu.editor.sizeNameAr')}
                      dir="rtl"
                      lang="ar"
                    />
                  </div>
                  <div className="mt-2 grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto_auto] items-center gap-2">
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={size.price}
                      onChange={(event) => updateSize(size.key, { price: event.target.value })}
                      placeholder={t('menu.editor.sizePrice')}
                      aria-label={t('menu.editor.sizePrice')}
                      dir="ltr"
                    />
                    <Input
                      type="number"
                      min="0.1"
                      step="0.05"
                      value={size.ingredientMultiplier}
                      onChange={(event) => updateSize(size.key, { ingredientMultiplier: event.target.value })}
                      aria-label={t('menu.editor.multiplier')}
                      title={t('menu.editor.multiplier')}
                      dir="ltr"
                    />
                    <button
                      type="button"
                      onClick={() => setDefaultSize(size.key)}
                      className={`whitespace-nowrap rounded-full border px-2 py-1 text-[10px] font-bold ${
                        size.isDefault
                          ? 'border-success/40 bg-success/10 text-success'
                          : 'border-border text-muted-foreground'
                      }`}
                    >
                      {size.isDefault ? t('menu.editor.default') : t('menu.editor.setDefault')}
                    </button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeSize(size.key)}
                      aria-label={t('menu.editor.removeSize')}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
              {form.sizes.length === 0 ? (
                <p className="rounded-lg border border-dashed border-border p-3 text-center text-xs text-muted-foreground">
                  {t('menu.editor.sizesEmpty')}
                </p>
              ) : null}
            </div>
          </div>
        ) : null}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={mutation.isPending}>
            {t('menu.editor.cancel')}
          </Button>
          <Button onClick={submit} disabled={mutation.isPending}>
            {mutation.isPending
              ? t('actions.saving')
              : item
                ? t('menu.editor.save')
                : t('menu.editor.create')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  error,
  hint,
  children,
  className,
}: {
  label: string;
  error?: string;
  hint?: string;
  children: ReactElement;
  className?: string;
}): ReactElement {
  return (
    <div className={className}>
      <div className="mb-1.5 flex items-baseline justify-between gap-2">
        <Label className="text-xs">{label}</Label>
        {hint ? <span className="text-[10px] text-muted-foreground">{hint}</span> : null}
      </div>
      {children}
      {error ? <p className="mt-1 text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
