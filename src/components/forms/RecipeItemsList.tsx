import type { RecipeItemFormData, InsumoWithStock, Categoria, UnitType } from '../../lib/types';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { QuantityStepper } from '../ui/QuantityStepper';
import { formatCurrency } from '../../utils/formatters';

interface RecipeItemsListProps {
  items: RecipeItemFormData[];
  insumos: InsumoWithStock[];
  categorias: Categoria[];
  onUpdateQuantity: (index: number, quantity: number) => void;
  onRemove: (index: number) => void;
}

const unitLabels: Record<UnitType, string> = {
  kg: 'kg',
  l: 'L',
  g: 'g',
  ml: 'ml',
  unit: 'ud',
};

export function RecipeItemsList({
  items,
  insumos,
  categorias,
  onUpdateQuantity,
  onRemove,
}: RecipeItemsListProps) {
  if (items.length === 0) {
    return (
      <div className="text-center py-8 text-slate-500 dark:text-slate-400 text-sm">
        No hay ingredientes en la receta
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {items.map((item, index) => {
        // Category-based item
        if (item.use_categorias && item.required_categoria_ids) {
          const itemCategorias = categorias.filter(c =>
            item.required_categoria_ids?.includes(c.id)
          );

          // Determine unit label based on categories
          const categoryUnit = itemCategorias.length === 1
            ? unitLabels[itemCategorias[0].unit_type]
            : 'unidad(es)';

          return (
            <Card key={`cat-${index}`} className="border-2 border-primary/30">
              <div className="space-y-3">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="material-symbols-outlined text-primary text-[18px]">
                      category
                    </span>
                    <h4 className="font-medium text-slate-900 dark:text-white">
                      Ingrediente por categoría
                    </h4>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {itemCategorias.map(cat => (
                      <span
                        key={cat.id}
                        className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs bg-slate-100 dark:bg-slate-700"
                      >
                        <div
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: cat.color }}
                        />
                        {cat.name}
                      </span>
                    ))}
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-2">
                    Se elegirá el insumo al fabricar
                  </p>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                      Cantidad ({categoryUnit})
                    </label>
                    <QuantityStepper
                      value={item.quantity_in_base_units}
                      onChange={(val) => onUpdateQuantity(index, val)}
                      min={0.1}
                      step={itemCategorias.length === 1 && itemCategorias[0].unit_type === 'unit' ? 1 : 0.1}
                    />
                  </div>
                  <div className="pt-5">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      icon="delete"
                      onClick={() => onRemove(index)}
                      className="text-red-600 dark:text-red-400"
                    />
                  </div>
                </div>
              </div>
            </Card>
          );
        }

        // Specific insumo item
        const insumo = insumos.find((i) => i.id === item.insumo_id);
        if (!insumo) return null;

        const itemCost = item.quantity_in_base_units * (insumo.current_price_per_unit || 0);

        return (
          <Card key={`insumo-${item.insumo_id}`}>
            <div className="space-y-3">
              <div>
                <h4 className="font-medium text-slate-900 dark:text-white">
                  {insumo.name}
                </h4>
                <p className="text-sm text-slate-700 dark:text-slate-300 mt-1">
                  Costo: {formatCurrency(itemCost)} ({formatCurrency(insumo.current_price_per_unit || 0)}/
                  {unitLabels[insumo.unit_type]}
                  )
                </p>
              </div>
              <div className="flex items-center justify-between gap-3">
                <div className="flex-1">
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                    Cantidad
                  </label>
                  <QuantityStepper
                    value={item.quantity_in_base_units}
                    onChange={(val) => onUpdateQuantity(index, val)}
                    min={0.1}
                    step={0.1}
                  />
                </div>
                <div className="pt-5">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    icon="delete"
                    onClick={() => onRemove(index)}
                    className="text-red-600 dark:text-red-400"
                  />
                </div>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
