import { formatCurrency } from '../../../utils/formatters';

interface ProductionCostSummaryProps {
  costPerUnit: number;
  totalCost: number;
  priceSale: number;
  marginPercentage: number;
  quantity: number;
}

export function ProductionCostSummary({
  costPerUnit,
  totalCost,
  priceSale,
  marginPercentage,
  quantity,
}: ProductionCostSummaryProps) {
  return (
    <div className="bg-primary-50 dark:bg-primary-950/30 rounded-xl p-4 border border-primary-200 dark:border-primary-900">
      <div className="space-y-2">
        <div className="flex items-center gap-2 mb-2">
          <span className="material-symbols-outlined text-primary-600 dark:text-primary-400 text-[18px]">
            calculate
          </span>
          <h4 className="text-sm font-semibold text-primary-700 dark:text-primary-300">
            Costos de Producción
          </h4>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-primary-600 dark:text-primary-400">
            Costo por unidad:
          </span>
          <span className="font-semibold text-primary-700 dark:text-primary-300">
            {formatCurrency(costPerUnit)}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-primary-600 dark:text-primary-400">
            Costo total:
          </span>
          <span className="text-lg font-bold text-primary-700 dark:text-primary-300">
            {formatCurrency(totalCost)}
          </span>
        </div>
        {costPerUnit > 0 && (
          <p className="text-xs text-primary-600 dark:text-primary-400 italic">
            * Calculado en base a los lotes seleccionados
          </p>
        )}
        {priceSale > 0 && costPerUnit > 0 && (
          <>
            <div className="border-t border-primary-200 dark:border-primary-900 my-2" />
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600 dark:text-slate-400">
                Precio de venta:
              </span>
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                {formatCurrency(priceSale)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600 dark:text-slate-400">
                Margen:
              </span>
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                {marginPercentage.toFixed(1)}%
              </span>
            </div>
            <div className="border-t border-green-200 dark:border-green-900 my-2" />
            <div className="flex items-center justify-between">
              <span className="text-sm text-green-600 dark:text-green-400">
                Ganancia por unidad:
              </span>
              <span className="font-semibold text-green-700 dark:text-green-300">
                {formatCurrency(priceSale - costPerUnit)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-green-600 dark:text-green-400">
                Ganancia total:
              </span>
              <span className="text-lg font-bold text-green-700 dark:text-green-300">
                {formatCurrency((priceSale - costPerUnit) * quantity)}
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
