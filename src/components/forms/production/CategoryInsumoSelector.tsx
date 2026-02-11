import { Card } from '../../ui/Card';
import type { RecipeItemWithLotes } from '../../../hooks/production/types';
import { UNIT_LABELS } from '../../../hooks/production/types';

interface CategoryInsumoSelectorProps {
  recipeWithLotes: RecipeItemWithLotes[];
  selectedCategoryInsumos: Record<string, string[]>;
  onToggle: (recipeItemId: string, insumoId: string) => void;
  quantity: number;
}

export function CategoryInsumoSelector({
  recipeWithLotes,
  selectedCategoryInsumos,
  onToggle,
  quantity,
}: CategoryInsumoSelectorProps) {
  const categoryItems = recipeWithLotes.filter(
    item => item.use_categorias && item.compatible_insumos && item.compatible_insumos.length > 0
  );

  if (categoryItems.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="material-symbols-outlined text-primary-600 dark:text-primary-400 text-[20px]">
          category
        </span>
        <h4 className="text-sm font-medium text-slate-900 dark:text-white">
          Ingredientes por categoría
        </h4>
      </div>
      <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-lg p-3">
        <div className="flex gap-2">
          <span className="material-symbols-outlined text-amber-600 dark:text-amber-400 text-[18px]">
            lightbulb
          </span>
          <div className="text-xs text-amber-700 dark:text-amber-300 space-y-1">
            <p className="font-medium">Ingredientes flexibles - Selección múltiple</p>
            <p>1. <strong>Selecciona uno o más insumos</strong> que quieras combinar (checkboxes)</p>
            <p>2. Abajo verás los lotes de cada insumo seleccionado <strong>agrupados</strong></p>
            <p>3. Ajusta las cantidades de cada lote para completar lo necesario</p>
            <p className="font-medium mt-1">Ejemplo: Si necesitas 62.5g de queso, puedes usar:</p>
            <p className="ml-3">✓ 37.5g de Parmeggiano + 25g de Mar del Plata</p>
          </div>
        </div>
      </div>

      {categoryItems.map((recipeItem) => {
        const selectedInsumos = selectedCategoryInsumos[recipeItem.recipe_item_id] || [];
        return (
          <Card key={recipeItem.recipe_item_id}>
            <div className="space-y-3">
              <div>
                <p className="text-sm font-medium text-slate-900 dark:text-white mb-1">
                  Ingrediente basado en categoría
                </p>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Necesario: {recipeItem.quantity_needed * quantity} {UNIT_LABELS[recipeItem.unit_type] || recipeItem.unit_type}
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  Seleccionar insumos (puedes elegir varios):
                </label>
                <div className="space-y-1.5">
                  {(recipeItem.compatible_insumos || []).map((insumo) => {
                    const isChecked = selectedInsumos.includes(insumo.id);
                    return (
                      <label
                        key={insumo.id}
                        className={`flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 rounded-lg border cursor-pointer transition-colors touch-manipulation ${
                          isChecked
                            ? 'bg-primary-50 dark:bg-primary-950/30 border-primary-300 dark:border-primary-700'
                            : 'bg-white dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 hover:border-primary-200 dark:hover:border-primary-800'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => onToggle(recipeItem.recipe_item_id, insumo.id)}
                          className="w-5 h-5 sm:w-4 sm:h-4 text-primary-600 bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600 rounded focus:ring-2 focus:ring-primary-500 flex-shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                            {insumo.name}
                          </p>
                          <p className="text-xs text-slate-600 dark:text-slate-400">
                            {insumo.total_stock} {UNIT_LABELS[insumo.unit_type] || insumo.unit_type} disponibles
                          </p>
                        </div>
                        {isChecked && (
                          <span className="material-symbols-outlined text-primary-600 dark:text-primary-400 text-[20px] flex-shrink-0">
                            check_circle
                          </span>
                        )}
                      </label>
                    );
                  })}
                </div>
              </div>

              {selectedInsumos.length === 0 && (
                <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 rounded-lg p-3">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-blue-600 dark:text-blue-400 text-[16px]">
                      info
                    </span>
                    <p className="text-xs text-blue-700 dark:text-blue-300">
                      Selecciona al menos un insumo para continuar
                    </p>
                  </div>
                </div>
              )}

              {selectedInsumos.length > 0 && (
                <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900 rounded-lg p-3">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-green-600 dark:text-green-400 text-[16px]">
                      check_circle
                    </span>
                    <p className="text-xs text-green-700 dark:text-green-300 font-medium">
                      {selectedInsumos.length} insumo{selectedInsumos.length !== 1 ? 's' : ''} seleccionado{selectedInsumos.length !== 1 ? 's' : ''}
                      {selectedInsumos.length > 1 && ' - Puedes combinarlos para completar la cantidad necesaria'}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </Card>
        );
      })}
    </div>
  );
}
