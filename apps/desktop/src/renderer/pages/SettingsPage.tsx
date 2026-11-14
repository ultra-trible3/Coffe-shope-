import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Clock,
  Percent,
  ReceiptText,
  Save,
  Store,
  Truck,
  Undo2,
} from 'lucide-react';
import { useEffect, useState, type ReactElement } from 'react';
import { settingsUpdateSchema, type SettingsDto } from '@pharmacy/shared';
import { Button } from '../components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '../components/ui/card';
import { Input, Textarea } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { ErrorState } from '../components/ui/states';
import { SettingsSkeleton } from '../components/skeletons/SettingsSkeleton';
import { toast } from '../components/ui/toast';
import { useI18n, type TranslationKey } from '../i18n';
import { api } from '../lib/api';
import { formatDateTime, formatDecimal } from '../lib/format';

interface SettingsForm {
  nameEn: string;
  nameAr: string;
  taglineEn: string;
  taglineAr: string;
  addressEn: string;
  addressAr: string;
  phone: string;
  email: string;
  taxRate: string;
  deliveryFee: string;
  maxCashierDiscountPct: string;
  receiptFooterEn: string;
  receiptFooterAr: string;
  currency: string;
}

function toForm(settings: SettingsDto): SettingsForm {
  return {
    nameEn: settings.nameEn,
    nameAr: settings.nameAr ?? '',
    taglineEn: settings.taglineEn ?? '',
    taglineAr: settings.taglineAr ?? '',
    addressEn: settings.addressEn ?? '',
    addressAr: settings.addressAr ?? '',
    phone: settings.phone ?? '',
    email: settings.email ?? '',
    taxRate: settings.taxRate,
    deliveryFee: settings.deliveryFee,
    maxCashierDiscountPct: settings.maxCashierDiscountPct,
    receiptFooterEn: settings.receiptFooterEn ?? '',
    receiptFooterAr: settings.receiptFooterAr ?? '',
    currency: settings.currency,
  };
}

export function SettingsPage(): ReactElement {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const settings = useQuery({
    queryKey: ['settings'],
    queryFn: () => api.settings.get(),
    staleTime: 60_000,
  });

  const [form, setForm] = useState<SettingsForm | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (settings.data) setForm(toForm(settings.data));
  }, [settings.data]);

  const save = useMutation({
    mutationFn: (input: SettingsForm) => {
      if (input.nameEn.trim().length < 2 || !input.nameAr.trim()) {
        throw new Error(t('settings.identity.nameRequired'));
      }
      const numericFields: Array<[keyof SettingsForm, TranslationKey, TranslationKey]> = [
        ['taxRate', 'settings.charges.tax', 'settings.errors.taxRequired'],
        [
          'maxCashierDiscountPct',
          'settings.charges.discount',
          'settings.errors.discountRequired',
        ],
      ];
      for (const [field, labelKey, requiredKey] of numericFields) {
        if (!input[field].trim()) throw new Error(t(requiredKey));
        const value = Number(input[field]);
        if (!Number.isFinite(value) || value < 0 || value > 100) {
          throw new Error(
            t('settings.errors.percentRange', { label: t(labelKey) }),
          );
        }
      }
      if (!input.deliveryFee.trim()) throw new Error(t('settings.errors.deliveryRequired'));
      if (!/^\d+(\.\d{1,2})?$/u.test(input.deliveryFee.trim())) {
        throw new Error(t('settings.errors.deliveryInvalid'));
      }
      if (!input.currency.trim()) throw new Error(t('settings.errors.currencyRequired'));

      const parsed = settingsUpdateSchema.safeParse({
        name: input.nameEn.trim(),
        nameAr: input.nameAr.trim(),
        tagline: input.taglineEn.trim() || null,
        taglineAr: input.taglineAr.trim() || null,
        address: input.addressEn.trim() || null,
        addressAr: input.addressAr.trim() || null,
        phone: input.phone.trim() || null,
        email: input.email.trim() || null,
        taxRate: Number(input.taxRate),
        deliveryFee: input.deliveryFee.trim(),
        maxCashierDiscountPct: Number(input.maxCashierDiscountPct),
        receiptFooter: input.receiptFooterEn.trim() || null,
        receiptFooterAr: input.receiptFooterAr.trim() || null,
        currency: input.currency.trim().toUpperCase(),
      });
      if (!parsed.success) {
        throw new Error(parsed.error.issues[0]?.message ?? t('settings.errors.check'));
      }
      return api.settings.update(parsed.data);
    },
    onSuccess: (updated) => {
      setForm(toForm(updated));
      setError(null);
      void queryClient.invalidateQueries({ queryKey: ['settings'] });
      void queryClient.invalidateQueries({ queryKey: ['menu', 'catalog'] });
      toast.success(t('settings.toast.saved'), t('settings.toast.savedMessage'));
    },
    onError: (mutationError) => {
      setError(mutationError instanceof Error ? mutationError.message : t('settings.errors.save'));
    },
  });

  if (settings.isLoading && !settings.data) {
    return <SettingsSkeleton />;
  }

  if (settings.isError) {
    return (
      <ErrorState
        title={t('settings.errors.load')}
        message={settings.error instanceof Error ? settings.error.message : undefined}
        onRetry={() => void settings.refetch()}
      />
    );
  }

  if (!form || !settings.data) return <SettingsSkeleton />;

  const update = (patch: Partial<SettingsForm>): void => {
    setForm((current) => (current ? { ...current, ...patch } : current));
    setError(null);
  };

  const dirty = JSON.stringify(form) !== JSON.stringify(toForm(settings.data));

  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        save.mutate(form);
      }}
    >
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Store className="h-4 w-4 text-secondary" />
              {t('settings.identity.title')}
            </CardTitle>
            <CardDescription>{t('settings.identity.description')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="settings-name-en">{t('settings.identity.nameEn')}</Label>
                <Input
                  id="settings-name-en"
                  value={form.nameEn}
                  onChange={(event) => update({ nameEn: event.target.value })}
                  placeholder={t('settings.identity.namePlaceholderEn')}
                  maxLength={120}
                  dir="ltr"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="settings-name-ar">{t('settings.identity.nameAr')}</Label>
                <Input
                  id="settings-name-ar"
                  value={form.nameAr}
                  onChange={(event) => update({ nameAr: event.target.value })}
                  placeholder={t('settings.identity.namePlaceholderAr')}
                  maxLength={120}
                  dir="rtl"
                  lang="ar"
                  required
                />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="settings-tagline-en">{t('settings.identity.taglineEn')}</Label>
                <Input
                  id="settings-tagline-en"
                  value={form.taglineEn}
                  onChange={(event) => update({ taglineEn: event.target.value })}
                  placeholder={t('settings.identity.taglinePlaceholderEn')}
                  maxLength={160}
                  dir="ltr"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="settings-tagline-ar">{t('settings.identity.taglineAr')}</Label>
                <Input
                  id="settings-tagline-ar"
                  value={form.taglineAr}
                  onChange={(event) => update({ taglineAr: event.target.value })}
                  placeholder={t('settings.identity.taglinePlaceholderAr')}
                  maxLength={160}
                  dir="rtl"
                  lang="ar"
                />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="settings-phone">{t('settings.identity.phone')}</Label>
                <Input
                  id="settings-phone"
                  type="tel"
                  value={form.phone}
                  onChange={(event) => update({ phone: event.target.value })}
                  placeholder={t('settings.identity.phonePlaceholder')}
                  maxLength={30}
                  dir="ltr"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="settings-email">{t('settings.identity.email')}</Label>
                <Input
                  id="settings-email"
                  type="email"
                  value={form.email}
                  onChange={(event) => update({ email: event.target.value })}
                  placeholder={t('settings.identity.emailPlaceholder')}
                  maxLength={160}
                  dir="ltr"
                />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="settings-address-en">{t('settings.identity.addressEn')}</Label>
                <Textarea
                  id="settings-address-en"
                  value={form.addressEn}
                  onChange={(event) => update({ addressEn: event.target.value })}
                  placeholder={t('settings.identity.addressPlaceholderEn')}
                  maxLength={300}
                  rows={2}
                  dir="ltr"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="settings-address-ar">{t('settings.identity.addressAr')}</Label>
                <Textarea
                  id="settings-address-ar"
                  value={form.addressAr}
                  onChange={(event) => update({ addressAr: event.target.value })}
                  placeholder={t('settings.identity.addressPlaceholderAr')}
                  maxLength={300}
                  rows={2}
                  dir="rtl"
                  lang="ar"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="settings-currency">{t('settings.identity.currency')}</Label>
              <Input
                id="settings-currency"
                value={form.currency}
                onChange={(event) => update({ currency: event.target.value.toUpperCase() })}
                maxLength={8}
                className="w-32 uppercase"
                dir="ltr"
                required
              />
              <p className="text-[11px] text-muted-foreground">
                {t('settings.identity.currencyHint')}
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Percent className="h-4 w-4 text-secondary" />
                {t('settings.charges.title')}
              </CardTitle>
              <CardDescription>{t('settings.charges.description')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="settings-tax">{t('settings.charges.tax')}</Label>
                <Input
                  id="settings-tax"
                  type="number"
                  min={0}
                  max={100}
                  step="0.01"
                  value={form.taxRate}
                  onChange={(event) => update({ taxRate: event.target.value })}
                  dir="ltr"
                  required
                />
                <p className="text-[11px] text-muted-foreground">
                  {t('settings.charges.taxHint', {
                    rate: formatDecimal(Number(settings.data.taxRate), 2),
                  })}
                </p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="settings-delivery" className="flex items-center gap-1.5">
                  <Truck className="h-3.5 w-3.5" />
                  {t('settings.charges.delivery')}
                </Label>
                <Input
                  id="settings-delivery"
                  inputMode="decimal"
                  value={form.deliveryFee}
                  onChange={(event) => update({ deliveryFee: event.target.value })}
                  dir="ltr"
                  required
                />
                <p className="text-[11px] text-muted-foreground">
                  {t('settings.charges.deliveryHint')}
                </p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="settings-discount">{t('settings.charges.discount')}</Label>
                <Input
                  id="settings-discount"
                  type="number"
                  min={0}
                  max={100}
                  step="0.01"
                  value={form.maxCashierDiscountPct}
                  onChange={(event) => update({ maxCashierDiscountPct: event.target.value })}
                  dir="ltr"
                  required
                />
                <p className="text-[11px] text-muted-foreground">
                  {t('settings.charges.discountHint')}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ReceiptText className="h-4 w-4 text-secondary" />
                {t('settings.receipt.title')}
              </CardTitle>
              <CardDescription>{t('settings.receipt.description')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="settings-footer-en">{t('settings.receipt.footerEn')}</Label>
                <Textarea
                  id="settings-footer-en"
                  value={form.receiptFooterEn}
                  onChange={(event) => update({ receiptFooterEn: event.target.value })}
                  placeholder={t('settings.receipt.placeholderEn')}
                  maxLength={300}
                  rows={2}
                  dir="ltr"
                  aria-label={t('settings.receipt.ariaEn')}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="settings-footer-ar">{t('settings.receipt.footerAr')}</Label>
                <Textarea
                  id="settings-footer-ar"
                  value={form.receiptFooterAr}
                  onChange={(event) => update({ receiptFooterAr: event.target.value })}
                  placeholder={t('settings.receipt.placeholderAr')}
                  maxLength={300}
                  rows={2}
                  dir="rtl"
                  lang="ar"
                  aria-label={t('settings.receipt.ariaAr')}
                />
              </div>
            </CardContent>
            <CardFooter className="text-[11px] text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />
              {t('settings.receipt.updated', {
                date: formatDateTime(settings.data.updatedAt),
              })}
            </CardFooter>
          </Card>
        </div>
      </div>

      {error ? (
        <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-3 py-3">
          <p className="text-xs text-muted-foreground">{t('settings.footer')}</p>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setForm(toForm(settings.data!));
                setError(null);
              }}
              disabled={!dirty || save.isPending}
            >
              <Undo2 className="h-4 w-4" />
              {t('settings.discard')}
            </Button>
            <Button type="submit" disabled={!dirty || save.isPending || form.nameEn.trim().length < 2}>
              <Save className="h-4 w-4" />
              {save.isPending ? t('actions.saving') : t('settings.save')}
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
