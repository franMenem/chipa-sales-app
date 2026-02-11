import { Button } from '../../ui/Button';
import { Card } from '../../ui/Card';
import { QuantityStepper } from '../../ui/QuantityStepper';
import { formatCurrency } from '../../../utils/formatters';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { DISPLAY_PRECISION } from '../../../lib/constants';
import type { InsumoLote } from '../../../lib/types';
import type { RecipeItemWithLotes, SelectionStatusItem } from '../../../hooks/production/types';
import { UNIT_LABELS } from '../../../hooks/production/types';

interface LoteRowProps {
  lote: InsumoLote;
  currentValue: number;
  stepValue: number;
  recipeItemId: string;
  requiredQuantity: number;
  onLotQuantityChange: (recipeItemId: string, lotId: string, value: number) => void;
  onUseAllFromLot: (recipeItemId: string, lotId: string, qtyRemaining: number, reqQty: number) => void;
}

function LoteRow({
  lote,
  currentValue,
  stepValue,
  recipeItemId,
  requiredQuantity,
  onLotQuantityChange,
  onUseAllFromLot,
}: LoteRowProps) {
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-slate-100 dark:border-slate-700 p-2.5 sm:p-3 bg-slate-50 dark:bg-slate-800/40">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-slate-900 dark:text-white">
            Lote del {format(new Date(lote.purchase_date), 'dd/MM/yyyy', { locale: es })}
          </p>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            Disponible: {lote.quantity_remaining.toFixed(3)} {UNIT_LABELS[lote.unit_type] || lote.unit_type} • {formatCurrency(lote.price_per_unit)}/{UNIT_LABELS[lote.unit_type] || lote.unit_type}
          </p>
        </div>
        <div className="flex items-center gap-2 justify-between sm:justify-end">
          <QuantityStepper
            value={currentValue}
            onChange={(val) => onLotQuantityChange(recipeItemId, lote.id, val)}
            min={0}
            max={lote.quantity_remaining}
            step={stepValue}
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onUseAllFromLot(recipeItemId, lote.id, lote.quantity_remaining, requiredQuantity)}
            className="flex-shrink-0"
          >
            <span className="hidden xs:inline">Completar</span>
            <span className="xs:hidden">Max</span>
          </Button>
        </div>
      </div>
    </div>
  );
}

interface ProgressBarProps {
  status: SelectionStatusItem | undefined;
  unitType: string;
  lotCount: number;
  activeLotCount: number;
  isCategoryBased?: boolean;
  selectedInsumoCount?: number;
}

function ProgressBar({ status, unitType, lotCount, activeLotCount, isCategoryBased, selectedInsumoCount }: ProgressBarProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs">
        <span className="text-slate-600 dark:text-slate-400">
          Seleccionado: {(status?.selected || 0).toFixed(3)} / {(status?.required || 0).toFixed(3)} {UNIT_LABELS[unitType] || unitType}
        </span>
        {status?.message && (
          <span className="text-red-600 dark:text-red-400 font-medium">
            {status.message}
          </span>
        )}
      </div>

      {status && status.required > 0 && (
        <div className="relative w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
          <div
            className={`absolute top-0 left-0 h-full transition-all duration-300 rounded-full ${
              status.hasError
                ? 'bg-red-500'
                : Math.abs(status.selected - status.required) < DISPLAY_PRECISION
                ? 'bg-green-500'
                : 'bg-yellow-500'
            }`}
            style={{
              width: `${Math.min((status.selected / status.required) * 100, 100)}%`,
            }}
          />
        </div>
      )}

      {/* Success indicator */}
      {!isCategoryBased && lotCount > 1 && status && !status.hasError && Math.abs(status.selected - status.required) < DISPLAY_PRECISION && (
        <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900 rounded-lg p-2">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-green-600 dark:text-green-400 text-[14px]">
              check_circle
            </span>
            <p className="text-xs text-green-700 dark:text-green-300 font-medium">
              ✓ Usando {activeLotCount} lotes combinados
            </p>
          </div>
        </div>
      )}

      {isCategoryBased && (selectedInsumoCount || 0) > 1 && status && !status.hasError && Math.abs(status.selected - status.required) < DISPLAY_PRECISION && (
        <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900 rounded-lg p-2">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-green-600 dark:text-green-400 text-[14px]">
              check_circle
            </span>
            <p className="text-xs text-green-700 dark:text-green-300 font-medium">
              ✓ Combinando {selectedInsumoCount} insumos diferentes
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// --- Regular ingredient lot selection card ---
interface RegularLotCardProps {
  recipeItem: RecipeItemWithLotes;
  lotSelections: Record<string, Record<string, number>>;
  status: SelectionStatusItem | undefined;
  quantity: number;
  getOrderedLotes: (item: RecipeItemWithLotes) => InsumoLote[];
  onLotQuantityChange: (recipeItemId: string, lotId: string, value: number) => void;
  onUseAllFromLot: (recipeItemId: string, lotId: string, qtyRemaining: number, reqQty: number) => void;
  onResetSelections: (item: RecipeItemWithLotes) => void;
}

export function RegularLotCard({
  recipeItem,
  lotSelections,
  status,
  quantity,
  getOrderedLotes,
  onLotQuantityChange,
  onUseAllFromLot,
  onResetSelections,
}: RegularLotCardProps) {
  const orderedLotes = getOrderedLotes(recipeItem).filter(lote => lote.quantity_remaining >= 0.01);
  const requiredQuantity = Number((recipeItem.quantity_needed * quantity).toFixed(4));
  const stepValue = recipeItem.unit_type === 'unit' ? 1 : 0.1;

  const activeLotCount = orderedLotes.filter(
    lote => (lotSelections[recipeItem.recipe_item_id]?.[lote.id] || 0) > 0
  ).length;

  return (
    <Card key={`lot-selection-${recipeItem.recipe_item_id}`}>
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-sm font-medium text-slate-900 dark:text-white">
              {recipeItem.insumo_name}
            </p>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Necesario: {(recipeItem.quantity_needed * quantity).toFixed(3)} {UNIT_LABELS[recipeItem.unit_type] || recipeItem.unit_type}
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            icon="refresh"
            onClick={() => onResetSelections(recipeItem)}
          >
            Auto
          </Button>
        </div>

        {orderedLotes.length === 0 ? (
          <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-lg p-3 text-xs text-amber-700 dark:text-amber-300">
            No hay lotes disponibles para este insumo.
          </div>
        ) : (
          <div className="space-y-2">
            {orderedLotes.map((lote) => (
              <LoteRow
                key={lote.id}
                lote={lote}
                currentValue={lotSelections[recipeItem.recipe_item_id]?.[lote.id] || 0}
                stepValue={stepValue}
                recipeItemId={recipeItem.recipe_item_id}
                requiredQuantity={requiredQuantity}
                onLotQuantityChange={onLotQuantityChange}
                onUseAllFromLot={onUseAllFromLot}
              />
            ))}
          </div>
        )}

        <ProgressBar
          status={status}
          unitType={recipeItem.unit_type}
          lotCount={orderedLotes.length}
          activeLotCount={activeLotCount}
        />
      </div>
    </Card>
  );
}

// --- Category-based ingredient lot selection card ---
interface CategoryLotCardProps {
  recipeItem: RecipeItemWithLotes;
  lotSelections: Record<string, Record<string, number>>;
  status: SelectionStatusItem | undefined;
  quantity: number;
  loteOrder: Record<string, string[]>;
  onLotQuantityChange: (recipeItemId: string, lotId: string, value: number) => void;
  onUseAllFromLot: (recipeItemId: string, lotId: string, qtyRemaining: number, reqQty: number) => void;
}

export function CategoryLotCard({
  recipeItem,
  lotSelections,
  status,
  quantity,
  loteOrder,
  onLotQuantityChange,
  onUseAllFromLot,
}: CategoryLotCardProps) {
  const stepValue = recipeItem.unit_type === 'unit' ? 1 : 0.1;
  const requiredQuantity = Number((recipeItem.quantity_needed * quantity).toFixed(4));

  return (
    <Card key={`category-lot-selection-${recipeItem.recipe_item_id}`}>
      <div className="space-y-3">
        <div>
          <p className="text-sm font-medium text-slate-900 dark:text-white flex items-center gap-2">
            <span className="material-symbols-outlined text-primary-600 dark:text-primary-400 text-[18px]">
              category
            </span>
            Ingrediente por categoría
          </p>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
            Necesario total: {(recipeItem.quantity_needed * quantity).toFixed(3)} {UNIT_LABELS[recipeItem.unit_type] || recipeItem.unit_type}
          </p>
        </div>

        <div className="space-y-3">
          {(recipeItem.selected_insumos || []).map((selectedInsumo) => {
            const insumoLotes = (selectedInsumo.lotes || []).filter(
              (lote) => lote.quantity_remaining >= 0.01
            );
            const orderedInsumoLotes = loteOrder[selectedInsumo.insumo_id]
              ? loteOrder[selectedInsumo.insumo_id]
                  .map(loteId => insumoLotes.find(l => l.id === loteId))
                  .filter(Boolean) as InsumoLote[]
              : insumoLotes;

            return (
              <div key={selectedInsumo.insumo_id} className="border border-primary-200 dark:border-primary-800 rounded-lg p-3 bg-primary-50/50 dark:bg-primary-950/20">
                <div className="mb-2">
                  <p className="text-sm font-semibold text-primary-900 dark:text-primary-100">
                    {selectedInsumo.insumo_name}
                  </p>
                  <p className="text-xs text-primary-700 dark:text-primary-300">
                    {orderedInsumoLotes.length} lote{orderedInsumoLotes.length !== 1 ? 's' : ''} disponible{orderedInsumoLotes.length !== 1 ? 's' : ''}
                  </p>
                </div>

                {orderedInsumoLotes.length === 0 ? (
                  <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-lg p-2 text-xs text-amber-700 dark:text-amber-300">
                    No hay lotes disponibles para este insumo.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {orderedInsumoLotes.map((lote) => (
                      <div
                        key={lote.id}
                        className="flex flex-col gap-2 rounded-lg border border-slate-200 dark:border-slate-600 p-2.5 bg-white dark:bg-slate-800"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-900 dark:text-white">
                              Lote del {format(new Date(lote.purchase_date), 'dd/MM/yyyy', { locale: es })}
                            </p>
                            <p className="text-xs text-slate-600 dark:text-slate-400">
                              Disponible: {lote.quantity_remaining.toFixed(3)} {UNIT_LABELS[lote.unit_type] || lote.unit_type} • {formatCurrency(lote.price_per_unit)}/{UNIT_LABELS[lote.unit_type] || lote.unit_type}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 justify-between sm:justify-end">
                            <QuantityStepper
                              value={lotSelections[recipeItem.recipe_item_id]?.[lote.id] || 0}
                              onChange={(val) => onLotQuantityChange(recipeItem.recipe_item_id, lote.id, val)}
                              min={0}
                              max={lote.quantity_remaining}
                              step={stepValue}
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => onUseAllFromLot(
                                recipeItem.recipe_item_id,
                                lote.id,
                                lote.quantity_remaining,
                                requiredQuantity
                              )}
                              className="flex-shrink-0"
                            >
                              <span className="hidden xs:inline">Completar</span>
                              <span className="xs:hidden">Max</span>
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <ProgressBar
          status={status}
          unitType={recipeItem.unit_type}
          lotCount={0}
          activeLotCount={0}
          isCategoryBased
          selectedInsumoCount={recipeItem.selected_insumos?.length || 0}
        />
      </div>
    </Card>
  );
}
