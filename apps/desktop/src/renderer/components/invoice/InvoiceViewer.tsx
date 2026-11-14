import { useQuery } from '@tanstack/react-query';
import { Download, FileText, Printer, ReceiptText } from 'lucide-react';
import { useRef, useState, type ReactElement } from 'react';
import type { OrderDto } from '@pharmacy/shared';
import { api } from '../../lib/api';
import { formatMoney } from '../../lib/format';
import { useI18n } from '../../i18n';
import { cn } from '../../lib/utils';
import { Button } from '../ui/button';
import { Dialog, DialogContent } from '../ui/dialog';
import { Skeleton } from '../ui/skeleton';
import { Spinner } from '../ui/badge';
import { toast } from '../ui/toast';
import { InvoiceDocument, type InvoiceFormat } from './InvoiceDocument';
import { KitchenCopy } from './KitchenCopy';

type KitchenPaper = 'match' | 'thermal';
const KITCHEN_PAPER_KEY = 'qahwa-kitchen-paper';

function resolveKitchenPaper(): KitchenPaper {
  try {
    return window.localStorage.getItem(KITCHEN_PAPER_KEY) === 'thermal' ? 'thermal' : 'match';
  } catch {
    return 'match';
  }
}

export function InvoiceViewer({
  open,
  onOpenChange,
  order,
  invoiceNumber,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: OrderDto | null;
  invoiceNumber: string | null;
}): ReactElement {
  const [format, setFormat] = useState<InvoiceFormat>('a4');
  const [kitchenPaper, setKitchenPaper] = useState<KitchenPaper>(resolveKitchenPaper);
  const [printing, setPrinting] = useState(false);
  const [saving, setSaving] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);
  const { t } = useI18n();
  const kitchenFormat: InvoiceFormat =
    format === 'thermal' || kitchenPaper === 'thermal' ? 'thermal' : 'a4';
  const kitchenStandalone = format === 'a4' && kitchenFormat === 'thermal';

  const chooseKitchenPaper = (value: KitchenPaper): void => {
    setKitchenPaper(value);
    try {
      window.localStorage.setItem(KITCHEN_PAPER_KEY, value);
    } catch {
      // The choice still applies for this session.
    }
  };

  const settings = useQuery({
    queryKey: ['settings'],
    queryFn: () => api.settings.get(),
    enabled: open,
    staleTime: 60_000,
  });

  const print = async (): Promise<void> => {
    setPrinting(true);
    try {
      const result = await api.print();
      if (!result.ok && !result.cancelled) {
        toast.error(result.error, t('invoices.viewer.printingFailed'));
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('invoices.viewer.printingFailed'));
    } finally {
      setPrinting(false);
    }
  };

  const savePdf = async (): Promise<void> => {
    if (!sheetRef.current || !order) return;
    setSaving(true);
    try {
      const { default: html2pdf } = await import('html2pdf.js');
      const thermal = format === 'thermal';
      const receiptHeightMm = Math.max(
        80,
        Math.ceil((sheetRef.current.scrollHeight * 25.4) / 96) + 4,
      );
      await html2pdf()
        .set({
          margin: thermal ? [2, 4, 2, 4] : 0,
          filename: `${invoiceNumber ?? order.orderNumber}.pdf`,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff' },
          jsPDF: thermal
            ? { unit: 'mm', format: [80, receiptHeightMm], orientation: 'portrait' }
            : { unit: 'mm', format: 'a4', orientation: 'portrait' },
        })
        .from(sheetRef.current)
        .save();
      toast.success(thermal ? t('invoices.viewer.receiptSaved') : t('invoices.viewer.invoiceSaved'));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('invoices.viewer.pdfFailed'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        title={format === 'a4' ? t('invoices.viewer.a4') : t('invoices.viewer.thermal')}
        description={order ? `${order.orderNumber} · ${formatMoney(order.total)}` : undefined}
        className="max-w-5xl"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="inline-flex rounded-lg border border-border bg-muted p-1">
            <button
              type="button"
              onClick={() => setFormat('a4')}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors',
                format === 'a4' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground',
              )}
            >
              <FileText className="h-3.5 w-3.5" />
              {t('invoices.viewer.a4')}
            </button>
            <button
              type="button"
              onClick={() => setFormat('thermal')}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors',
                format === 'thermal' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground',
              )}
            >
              <ReceiptText className="h-3.5 w-3.5" />
              {t('invoices.viewer.thermal')}
            </button>
          </div>
          {format === 'a4' ? (
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                {t('invoices.viewer.kitchenPaper')}
              </span>
              <div className="inline-flex rounded-lg border border-border bg-muted p-1">
                <button
                  type="button"
                  onClick={() => chooseKitchenPaper('match')}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors',
                    kitchenPaper === 'match' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground',
                  )}
                >
                  <FileText className="h-3.5 w-3.5" />
                  {t('invoices.viewer.kitchenMatch')}
                </button>
                <button
                  type="button"
                  onClick={() => chooseKitchenPaper('thermal')}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors',
                    kitchenPaper === 'thermal' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground',
                  )}
                >
                  <ReceiptText className="h-3.5 w-3.5" />
                  {t('invoices.viewer.kitchenThermal')}
                </button>
              </div>
            </div>
          ) : null}
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => void savePdf()} disabled={saving}>
              {saving ? <Spinner /> : <Download className="h-3.5 w-3.5" />}
              {t('invoices.viewer.savePdf')}
            </Button>
            <Button size="sm" onClick={() => void print()} disabled={printing}>
              {printing ? <Spinner className="border-white/40 border-t-white" /> : <Printer className="h-3.5 w-3.5" />}
              {t('invoices.viewer.print')}
            </Button>
          </div>
        </div>

        <div className="max-h-[62vh] overflow-auto rounded-xl border border-border bg-muted/40 p-4">
          {settings.isLoading ? (
            <div
              role="status"
              aria-live="polite"
              aria-busy="true"
              aria-label={t('invoices.viewer.loading')}
              className="skeleton-on-paper mx-auto w-[190mm] space-y-5 bg-white p-8"
            >
              <div className="flex items-start justify-between gap-6">
                <div className="flex items-center gap-3">
                  <Skeleton radius="lg" className="h-12 w-12" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-36" />
                    <Skeleton className="h-2.5 w-24" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Skeleton className="ms-auto h-2.5 w-20" />
                  <Skeleton className="ms-auto h-6 w-28" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-8 border-y border-border py-4">
                <div className="space-y-2">
                  <Skeleton className="h-2.5 w-16" />
                  <Skeleton className="h-3 w-32" />
                  <Skeleton className="h-3 w-40" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-2.5 w-16" />
                  <Skeleton className="h-3 w-28" />
                  <Skeleton className="h-3 w-36" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>

              <div className="space-y-3">
                <div className="grid grid-cols-[1fr_64px_80px_80px] gap-3 border-b border-border pb-2">
                  <Skeleton className="h-2.5 w-20" />
                  <Skeleton className="ms-auto h-2.5 w-12" />
                  <Skeleton className="ms-auto h-2.5 w-14" />
                  <Skeleton className="ms-auto h-2.5 w-14" />
                </div>
                {Array.from({ length: 8 }).map((_, index) => (
                  <div key={index} className="grid grid-cols-[1fr_64px_80px_80px] items-center gap-3">
                    <div className="space-y-1.5">
                      <Skeleton className="h-3 w-2/3" />
                      <Skeleton className="h-2.5 w-1/3" />
                    </div>
                    <Skeleton className="ms-auto h-3 w-8" />
                    <Skeleton className="ms-auto h-3 w-14" />
                    <Skeleton className="ms-auto h-3 w-14" />
                  </div>
                ))}
              </div>

              <div className="ms-auto w-64 space-y-2 border-t border-border pt-3">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-3 w-16" />
                </div>
                <div className="flex items-center justify-between">
                  <Skeleton className="h-3 w-14" />
                  <Skeleton className="h-3 w-16" />
                </div>
                <div className="flex items-center justify-between">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-3 w-16" />
                </div>
                <div className="flex items-center justify-between border-t border-border pt-2">
                  <Skeleton className="h-4 w-12" />
                  <Skeleton className="h-5 w-20" />
                </div>
              </div>
            </div>
          ) : settings.isError ? (
            <p className="p-6 text-center text-sm text-destructive">
              {t('invoices.viewer.settingsFailed')} {settings.error instanceof Error ? settings.error.message : ''}
            </p>
          ) : order && settings.data ? (
            <div className="print-area mx-auto w-fit">
              <div ref={sheetRef} className="mx-auto w-fit">
                <InvoiceDocument
                  order={order}
                  invoiceNumber={invoiceNumber ?? order.invoice?.invoiceNumber ?? order.orderNumber}
                  settings={settings.data}
                  format={format}
                />
              </div>
              <p className="no-print mb-3 mt-6 border-t border-border pt-4 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                {t('invoices.document.kitchenCopy')} · {t('invoices.document.kitchenCopyHint')}
              </p>
              <KitchenCopy
                order={order}
                settings={settings.data}
                format={kitchenFormat}
                standalone={kitchenStandalone}
              />
            </div>
          ) : (
            <p className="p-6 text-center text-sm text-muted-foreground">{t('invoices.viewer.noOrder')}</p>
          )}
        </div>

        <p className="text-[11px] text-muted-foreground">
          {t('invoices.viewer.hint')}
        </p>
      </DialogContent>
    </Dialog>
  );
}
