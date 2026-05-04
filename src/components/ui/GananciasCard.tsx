import { Card } from './Card';
import { useDineroDisponible } from '../../hooks/domain/useDineroDisponible';
import { formatCurrency } from '../../utils/formatters';

export function GananciasCard() {
  const dinero = useDineroDisponible();

  if (dinero.isLoading) {
    return (
      <Card>
        <div className="animate-pulse space-y-2">
          <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/2" />
          <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded w-3/4" />
          <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded w-1/2" />
        </div>
      </Card>
    );
  }

  const gananciaColor = dinero.isPositiveGanancia
    ? 'text-green-600 dark:text-green-400'
    : 'text-red-600 dark:text-red-400';

  return (
    <Card>
      <div className="flex items-center gap-2 mb-3">
        <span className="material-symbols-outlined text-green-500 text-[20px]">trending_up</span>
        <h3 className="text-sm font-medium text-slate-900 dark:text-white">Ganancias</h3>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-slate-500 dark:text-slate-400">Ingresos cobrados</span>
          <span className="font-semibold text-slate-900 dark:text-white">
            {formatCurrency(dinero.ingresosCobrados)}
          </span>
        </div>

        <div className="flex justify-between text-sm">
          <span className="text-slate-500 dark:text-slate-400">Costo de lo vendido</span>
          <span className="font-semibold text-red-600 dark:text-red-400">
            -{formatCurrency(dinero.totalCostoVentas)}
          </span>
        </div>

        <div className="border-t border-slate-200 dark:border-slate-700 pt-2 mt-2 flex justify-between items-center">
          <span className="font-semibold text-slate-900 dark:text-white">Ganancia</span>
          <span className={`text-xl font-bold ${gananciaColor}`}>
            {formatCurrency(dinero.ganancia)}
          </span>
        </div>
      </div>
    </Card>
  );
}
