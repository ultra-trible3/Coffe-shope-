import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState, type ReactElement } from 'react';
import type { IngredientDto, MenuItemDto } from '@pharmacy/shared';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogFooter } from '../ui/dialog';
import { Input, Select, Textarea } from '../ui/input';
import { Label } from '../ui/label';
import { Skeleton } from '../ui/skeleton';
import { toast } from '../ui/toast';
import { api } from '../../lib/api';
import { formatMoney, unitLabel } from '../../lib/format';
import { useI18n } from '../../i18n';

interface RecipeRow {
  key: string;
  ingredientId: string;
  quantity: string;
}

export function RecipeEditorDialog({
  open,
  onOpenChange,
  item,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: MenuItemDto | null;
  onSaved: () => void;
}): ReactElement {
  const queryClient = useQueryClient();
  const { t } = useI18n();
  const [rows, setRows] = useState<RecipeRow[]>([]);
  const [notes, setNotes] = useState('');

  const ingredients = useQuery({
    queryKey: ['inventory', 'ingredients', 'recipe-options'],
    queryFn: () => api.inventory.ingredients({ page: 1, pageSize: 200, isActive: true }),
    enabled: open,
    staleTime: 60_000,
  });

  const recipe = useQuery({
    queryKey: ['menu', 'recipe', item?.id],
    queryFn: () => api.menu.recipe(item!.id),
    enabled: open && Boolean(item),
  });

  useEffect(() => {
    if (!open) return;
    if (recipe.data) {
      setRows(
        recipe.data.items.map((line) => ({
          key: line.id,
          ingredientId: line.ingredientId,
          quantity: String(line.quantity),
        })),
      );
      setNotes(recipe.data.notes ?? '');
    } else if (recipe.isSuccess) {
      setRows([]);
      setNotes('');
    }
  }, [open, recipe.data, recipe.isSuccess]);

  const ingredientMap = useMemo(() => {
    const map = new Map<string, IngredientDto>();
    for (const ingredient of ingredients.data?.items ?? []) map.set(ingredient.id, ingredient);
    return map;
  }, [ingredients.data]);

  const invalid = useMemo(() => {
    const used = new Set<string>();
    for (const row of rows) {
      if (!row.ingredientId) return t('menu.recipe.chooseEvery');
      if (used.has(row.ingredientId)) return t('menu.recipe.duplicate');
      used.add(row.ingredientId);
      if (!(Number(row.quantity) > 0)) return t('menu.recipe.quantityError');
    }
    return null;
  }, [rows, t]);

  const cost = rows.reduce((sum, row) => {
    const ingredient = ingredientMap.get(row.ingredientId);
    return sum + Number(row.quantity || 0) * Number(ingredient?.costPerUnit ?? 0);
  }, 0);

  const mutation = useMutation({
    mutationFn: () =>
      api.menu.saveRecipe(item!.id, {
        notes: notes.trim() || undefined,
        items: rows.map((row) => ({
          ingredientId: row.ingredientId,
          quantity: Number(row.quantity),
        })),
      }),
    onSuccess: () => {
      toast.success(t('menu.recipe.savedMessage'), t('menu.recipe.saved'));
      void queryClient.invalidateQueries({ queryKey: ['menu'] });
      onSaved();
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : t('menu.recipe.saveFailed'));
    },
  });

  const addRow = (): void => {
    const firstFree = (ingredients.data?.items ?? []).find(
      (ingredient) => !rows.some((row) => row.ingredientId === ingredient.id),
    );
    setRows((current) => [
      ...current,
      { key: `row-${Date.now()}`, ingredientId: firstFree?.id ?? '', quantity: '0.1' },
    ]);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        title={item ? t('menu.recipe.titleWith', { name: item.name }) : t('menu.recipe.title')}
        description={t('menu.recipe.description')}
        className="max-w-2xl"
      >
        {recipe.isLoading ? (
          <div
            role="status"
            aria-live="polite"
            aria-busy="true"
            aria-label={t('menu.recipe.loading')}
            className="space-y-2"
          >
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="grid grid-cols-[1fr_96px_auto_auto] items-center gap-2">
                <Skeleton radius="lg" className="h-9 w-full" />
                <Skeleton radius="lg" className="h-9 w-full" />
                <Skeleton radius="lg" className="h-9 w-16" />
                <Skeleton radius="lg" className="h-9 w-9" />
              </div>
            ))}
          </div>
        ) : recipe.isError ? (
          <p className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
            {recipe.error instanceof Error ? recipe.error.message : t('menu.recipe.loadError')}
          </p>
        ) : (
          <>
            <div className="space-y-2">
              {rows.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border p-5 text-center text-sm text-muted-foreground">
                  {t('menu.recipe.empty')}
                </div>
              ) : (
                rows.map((row) => {
                  const ingredient = ingredientMap.get(row.ingredientId);
                  return (
                    <div key={row.key} className="grid grid-cols-[1fr_96px_auto_auto] items-center gap-2">
                      <Select
                        value={row.ingredientId}
                        onChange={(event) =>
                          setRows((current) =>
                            current.map((entry) =>
                              entry.key === row.key ? { ...entry, ingredientId: event.target.value } : entry,
                            ),
                          )
                        }
                        aria-label={t('menu.recipe.ingredient')}
                      >
                        <option value="">{t('menu.recipe.chooseIngredient')}</option>
                        {(ingredients.data?.items ?? []).map((option) => (
                          <option key={option.id} value={option.id}>
                            {option.name} ({unitLabel(option.unit)})
                          </option>
                        ))}
                      </Select>
                      <div className="relative">
                        <Input
                          type="number"
                          min="0.001"
                          step="0.001"
                          value={row.quantity}
                          onChange={(event) =>
                            setRows((current) =>
                              current.map((entry) =>
                                entry.key === row.key ? { ...entry, quantity: event.target.value } : entry,
                              ),
                            )
                          }
                          aria-label={t('menu.recipe.quantity')}
                          className="pe-9"
                        />
                        <span className="pointer-events-none absolute end-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">
                          {ingredient ? unitLabel(ingredient.unit) : ''}
                        </span>
                      </div>
                      <span className="numeric w-20 text-end text-xs text-muted-foreground">
                        {formatMoney(Number(row.quantity || 0) * Number(ingredient?.costPerUnit ?? 0))}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setRows((current) => current.filter((entry) => entry.key !== row.key))}
                        aria-label={t('menu.recipe.remove')}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  );
                })
              )}
              <Button variant="outline" size="sm" onClick={addRow} disabled={ingredientMap.size === 0}>
                <Plus className="h-3.5 w-3.5" />
                {t('menu.recipe.add')}
              </Button>
            </div>

            <div className="grid gap-3 sm:grid-cols-[1fr_160px]">
              <div>
                <Label htmlFor="recipe-notes" className="text-xs">
                  {t('menu.recipe.notes')}
                </Label>
                <Textarea
                  id="recipe-notes"
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder={t('menu.recipe.notesPlaceholder')}
                  maxLength={500}
                  className="mt-1.5 min-h-[60px]"
                />
              </div>
              <div className="rounded-lg border border-border bg-muted/30 p-3">
                <p className="th-label">{t('menu.recipe.baseCost')}</p>
                <p className="numeric mt-1 text-lg font-bold">{formatMoney(cost)}</p>
                <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">
                  {rows.length === 1
                    ? t('menu.recipe.perUnit')
                    : t('menu.recipe.perUnitOther', { count: rows.length })}
                </p>
              </div>
            </div>

            {ingredientMap.size === 0 ? (
              <p className="text-xs text-amber-700">
                {t('menu.recipe.noIngredients')}
              </p>
            ) : null}
            {invalid ? <p className="text-xs text-destructive">{invalid}</p> : null}
          </>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={mutation.isPending}>
            {t('actions.cancel')}
          </Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending || Boolean(invalid) || recipe.isLoading}>
            {mutation.isPending ? t('actions.saving') : t('menu.recipe.save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
