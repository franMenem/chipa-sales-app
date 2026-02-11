import { Button } from '../../ui/Button';
import { Card } from '../../ui/Card';
import { formatCurrency } from '../../../utils/formatters';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { InsumoLote } from '../../../lib/types';
import type { RecipeItemWithLotes } from '../../../hooks/production/types';
import { UNIT_LABELS } from '../../../hooks/production/types';

interface LoteOrderAdvancedProps {
  show: boolean;
  onToggle: () => void;
  recipeWithLotes: RecipeItemWithLotes[];
  getOrderedLotes: (item: RecipeItemWithLotes) => InsumoLote[];
  onMoveLoteUp: (insumoId: string | null, loteIndex: number) => void;
  onMoveLoteDown: (insumoId: string | null, loteIndex: number) => void;
  quantity: number;
}

export function LoteOrderAdvanced({
  show,
  onToggle,
  recipeWithLotes,
  getOrderedLotes,
  onMoveLoteUp,
  onMoveLoteDown,
  quantity,
}: LoteOrderAdvancedProps) {
  return (
    <div>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={onToggle}
        className="w-full"
      >
        <div className="flex items-center justify-between w-full">
          <span className="text-sm">Orden de consumo de lotes (Avanzado)</span>
          <span className="material-symbols-outlined text-[18px]">
            {show ? 'expand_less' : 'expand_more'}
          </span>
        </div>
      </Button>

      {show && (
        <div className="mt-3 space-y-4">
          {recipeWithLotes.map((recipeItem) => {
            if (!recipeItem.insumo_id) return null;

            const orderedLotes = getOrderedLotes(recipeItem).filter(
              (lote) => lote.quantity_remaining >= 0.01
            );

            return (
              <Card key={recipeItem.recipe_item_id}>
                <div className="space-y-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium text-slate-900 dark:text-white">
                        {recipeItem.insumo_name}
                      </h4>
                      {recipeItem.use_categorias && (
                        <span className="px-2 py-0.5 text-xs font-medium bg-primary/20 text-primary rounded-full">
                          Categoría
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      Necesario: {recipeItem.quantity_needed * quantity} {UNIT_LABELS[recipeItem.unit_type] || recipeItem.unit_type}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs font-medium text-slate-700 dark:text-slate-300">
                      Orden de consumo (de arriba a abajo):
                    </p>
                    {orderedLotes.map((lote, index) => (
                      <div
                        key={lote.id}
                        className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/50 rounded-lg p-2"
                      >
                        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 w-6">
                          {index + 1}.
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-slate-900 dark:text-white">
                            {format(new Date(lote.purchase_date), 'dd/MM/yyyy', { locale: es })}
                          </p>
                          <p className="text-xs text-slate-600 dark:text-slate-400">
                            {lote.quantity_remaining} {UNIT_LABELS[lote.unit_type] || lote.unit_type} • {formatCurrency(lote.price_per_unit)}/{UNIT_LABELS[lote.unit_type] || lote.unit_type}
                          </p>
                        </div>
                        <div className="flex flex-col gap-1">
                          <button
                            type="button"
                            onClick={() => onMoveLoteUp(recipeItem.insumo_id, index)}
                            disabled={index === 0}
                            className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed"
                          >
                            <span className="material-symbols-outlined text-[16px]">
                              arrow_upward
                            </span>
                          </button>
                          <button
                            type="button"
                            onClick={() => onMoveLoteDown(recipeItem.insumo_id, index)}
                            disabled={index === orderedLotes.length - 1}
                            className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed"
                          >
                            <span className="material-symbols-outlined text-[16px]">
                              arrow_downward
                            </span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
