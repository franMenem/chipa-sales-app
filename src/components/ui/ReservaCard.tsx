import { useState } from 'react';
import { Card } from './Card';
import { Button } from './Button';
import { useDineroDisponible } from '../../hooks/domain/useDineroDisponible';
import { useUpsertAppConfig } from '../../hooks/mutations/useAppConfigMutation';
import { formatCurrency } from '../../utils/formatters';

export function ReservaCard() {
  const dinero = useDineroDisponible();
  const upsert = useUpsertAppConfig();

  const [isEditing, setIsEditing] = useState(false);
  const [mpValue, setMpValue] = useState('');
  const [bufferValue, setBufferValue] = useState('');

  function openEdit() {
    setMpValue(String(dinero.tengoEnMp || ''));
    setBufferValue(String(dinero.bufferPercentage));
    setIsEditing(true);
  }

  async function handleSave() {
    const mp = parseFloat(mpValue);
    const buf = parseFloat(bufferValue);
    if (isNaN(mp) || isNaN(buf) || buf < 0 || buf > 100) return;
    await upsert.mutateAsync({ mp_reserva_amount: mp, buffer_percentage: buf });
    setIsEditing(false);
  }

  if (dinero.isLoading) {
    return (
      <Card>
        <div className="animate-pulse space-y-2">
          <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/2" />
          <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded w-3/4" />
          <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-2/3" />
        </div>
      </Card>
    );
  }

  const diferenciaColor = dinero.isPositiveMp
    ? 'text-green-600 dark:text-green-400'
    : 'text-red-600 dark:text-red-400';

  return (
    <Card>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-blue-500 text-[20px]">savings</span>
          <h3 className="text-sm font-medium text-slate-900 dark:text-white">Reserva de costos</h3>
        </div>
        {!isEditing && (
          <button
            onClick={openEdit}
            className="text-xs text-slate-400 hover:text-primary transition-colors touch-manipulation flex items-center gap-1"
            aria-label="Editar reserva"
          >
            <span className="material-symbols-outlined text-[16px]">edit</span>
            Editar
          </button>
        )}
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-slate-500 dark:text-slate-400">Costo de insumos</span>
          <span className="font-semibold text-slate-900 dark:text-white">
            {formatCurrency(dinero.totalCostosInsumos)}
          </span>
        </div>

        <div className="flex justify-between text-sm">
          <span className="text-slate-500 dark:text-slate-400">
            Buffer inflación ({dinero.bufferPercentage}%)
          </span>
          <span className="font-semibold text-amber-600 dark:text-amber-400">
            +{formatCurrency(dinero.deberiaTener - dinero.totalCostosInsumos)}
          </span>
        </div>

        <div className="flex justify-between text-sm border-t border-slate-200 dark:border-slate-700 pt-2">
          <span className="font-medium text-slate-700 dark:text-slate-300">Debería tener</span>
          <span className="font-semibold text-slate-900 dark:text-white">
            {formatCurrency(dinero.deberiaTener)}
          </span>
        </div>

        <div className="flex justify-between text-sm">
          <span className="text-slate-500 dark:text-slate-400">Tengo en MP</span>
          <span className="font-semibold text-slate-900 dark:text-white">
            {formatCurrency(dinero.tengoEnMp)}
          </span>
        </div>

        <div className="border-t border-slate-200 dark:border-slate-700 pt-2 mt-2 flex justify-between items-center">
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Diferencia</span>
          <span className={`text-lg font-bold ${diferenciaColor}`}>
            {dinero.isPositiveMp ? '+' : ''}{formatCurrency(dinero.diferenciaMp)}
          </span>
        </div>
      </div>

      {isEditing && (
        <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700 space-y-3">
          <div>
            <label className="text-xs text-slate-500 dark:text-slate-400 mb-1 block">
              Tengo en MP ($)
            </label>
            <input
              type="number"
              value={mpValue}
              onChange={(e) => setMpValue(e.target.value)}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="0"
              min="0"
            />
          </div>
          <div>
            <label className="text-xs text-slate-500 dark:text-slate-400 mb-1 block">
              Buffer inflación (%)
            </label>
            <input
              type="number"
              value={bufferValue}
              onChange={(e) => setBufferValue(e.target.value)}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="15"
              min="0"
              max="100"
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant="primary"
              size="sm"
              onClick={handleSave}
              disabled={upsert.isPending}
              className="flex-1"
            >
              {upsert.isPending ? 'Guardando...' : 'Guardar'}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsEditing(false)}
              className="flex-1"
            >
              Cancelar
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
