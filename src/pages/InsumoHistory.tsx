import { useState } from 'react';
import { Layout } from '../components/layout/Layout';
import { Select } from '../components/ui/Select';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { useAllInsumos } from '../hooks/useInsumos';
import { useInsumoLotes, useDeleteInsumoBatch } from '../hooks/useInsumoLotes';
import { formatCurrency } from '../utils/formatters';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const unitLabels = {
  kg: 'kg',
  l: 'L',
  g: 'g',
  ml: 'ml',
  unit: 'ud',
};

export function InsumoHistory() {
  const [selectedInsumoId, setSelectedInsumoId] = useState<string>('');
  const { data: insumos = [] } = useAllInsumos();
  const { data: lotes = [], isLoading: loadingLotes } = useInsumoLotes(selectedInsumoId || undefined);
  const deleteMutation = useDeleteInsumoBatch();

  const selectedInsumo = insumos.find(i => i.id === selectedInsumoId);

  const handleDelete = async (loteId: string, date: string) => {
    if (window.confirm(`¿Eliminar la compra del ${format(new Date(date), 'dd/MM/yyyy', { locale: es })}?`)) {
      try {
        await deleteMutation.mutateAsync(loteId);
      } catch (error) {
        // Error handled by mutation
      }
    }
  };

  const insumoOptions = [
    { value: '', label: 'Seleccionar insumo...' },
    ...insumos.map(i => ({
      value: i.id,
      label: `${i.name} (${i.total_stock} ${unitLabels[i.unit_type]})`,
    })),
  ];

  return (
    <Layout
      title="Historial de Compras"
      subtitle="Visualiza todas las compras de insumos"
    >
      <div className="p-4 space-y-6">
        {/* Selector de insumo */}
        <Card>
          <Select
            label="Seleccionar insumo"
            options={insumoOptions}
            value={selectedInsumoId}
            onChange={(e) => setSelectedInsumoId(e.target.value)}
          />
        </Card>

        {/* Resumen del insumo seleccionado */}
        {selectedInsumo && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <div className="space-y-1">
                <p className="text-sm text-slate-600 dark:text-slate-400">Stock Total</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">
                  {selectedInsumo.total_stock} {unitLabels[selectedInsumo.unit_type]}
                </p>
              </div>
            </Card>
            <Card>
              <div className="space-y-1">
                <p className="text-sm text-slate-600 dark:text-slate-400">Precio Actual (LIFO)</p>
                <p className="text-2xl font-bold text-primary-600 dark:text-primary-400">
                  {selectedInsumo.current_price_per_unit
                    ? formatCurrency(selectedInsumo.current_price_per_unit)
                    : 'Sin precio'}
                </p>
              </div>
            </Card>
            <Card>
              <div className="space-y-1">
                <p className="text-sm text-slate-600 dark:text-slate-400">Lotes Activos</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {selectedInsumo.active_batches}
                </p>
              </div>
            </Card>
          </div>
        )}

        {/* Lista de lotes */}
        {selectedInsumoId && (
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
              Historial de Compras
            </h2>

            {loadingLotes ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent mb-4" />
                <p className="text-slate-700 dark:text-slate-300">Cargando historial...</p>
              </div>
            ) : lotes.length === 0 ? (
              <Card>
                <div className="text-center py-8">
                  <span className="material-symbols-outlined text-slate-300 dark:text-slate-600 text-6xl mb-4">
                    receipt_long
                  </span>
                  <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300 mb-2">
                    Sin compras registradas
                  </h3>
                  <p className="text-slate-700 dark:text-slate-300">
                    No hay compras registradas para este insumo
                  </p>
                </div>
              </Card>
            ) : (
              <div className="space-y-3">
                {lotes.map((lote) => {
                  const isFullyConsumed = lote.quantity_remaining === 0;
                  const isPartiallyConsumed = lote.quantity_remaining < lote.quantity_purchased && lote.quantity_remaining > 0;
                  const consumedPercentage = ((lote.quantity_purchased - lote.quantity_remaining) / lote.quantity_purchased) * 100;

                  return (
                    <Card key={lote.id}>
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 space-y-3">
                          {/* Encabezado */}
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="material-symbols-outlined text-slate-600 dark:text-slate-400 text-[20px]">
                                  calendar_today
                                </span>
                                <p className="font-semibold text-slate-900 dark:text-white">
                                  {format(new Date(lote.purchase_date), "dd 'de' MMMM, yyyy", { locale: es })}
                                </p>
                              </div>
                              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                                Comprado: {format(new Date(lote.created_at), 'HH:mm', { locale: es })} hs
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-lg font-bold text-primary-600 dark:text-primary-400">
                                {formatCurrency(lote.price_per_unit)}
                              </p>
                              <p className="text-xs text-slate-600 dark:text-slate-400">
                                por {unitLabels[lote.unit_type]}
                              </p>
                            </div>
                          </div>

                          {/* Cantidades */}
                          <div className="grid grid-cols-2 gap-4">
                            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3">
                              <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">
                                Cantidad Comprada
                              </p>
                              <p className="text-lg font-semibold text-slate-900 dark:text-white">
                                {lote.quantity_purchased} {unitLabels[lote.unit_type]}
                              </p>
                            </div>
                            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3">
                              <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">
                                Cantidad Restante
                              </p>
                              <p className={`text-lg font-semibold ${
                                isFullyConsumed
                                  ? 'text-red-600 dark:text-red-400'
                                  : isPartiallyConsumed
                                  ? 'text-yellow-600 dark:text-yellow-400'
                                  : 'text-green-600 dark:text-green-400'
                              }`}>
                                {lote.quantity_remaining} {unitLabels[lote.unit_type]}
                              </p>
                            </div>
                          </div>

                          {/* Barra de progreso de consumo */}
                          {consumedPercentage > 0 && (
                            <div className="space-y-1">
                              <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
                                <span>Consumido</span>
                                <span>{consumedPercentage.toFixed(0)}%</span>
                              </div>
                              <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                                <div
                                  className={`h-2 rounded-full transition-all ${
                                    isFullyConsumed
                                      ? 'bg-red-500'
                                      : isPartiallyConsumed
                                      ? 'bg-yellow-500'
                                      : 'bg-green-500'
                                  }`}
                                  style={{ width: `${consumedPercentage}%` }}
                                />
                              </div>
                            </div>
                          )}

                          {/* Costo total */}
                          <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 rounded-lg p-3">
                            <p className="text-xs text-blue-700 dark:text-blue-300 mb-1">
                              Costo Total de la Compra
                            </p>
                            <p className="text-xl font-bold text-blue-900 dark:text-blue-100">
                              {formatCurrency(lote.quantity_purchased * lote.price_per_unit)}
                            </p>
                          </div>
                        </div>

                        {/* Botón eliminar */}
                        <div>
                          <Button
                            variant="ghost"
                            size="sm"
                            icon="delete"
                            onClick={() => handleDelete(lote.id, lote.purchase_date)}
                            disabled={deleteMutation.isPending || isPartiallyConsumed || isFullyConsumed}
                            aria-label="Eliminar compra"
                            className="text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 disabled:opacity-50"
                          />
                          {(isPartiallyConsumed || isFullyConsumed) && (
                            <p className="text-xs text-slate-600 dark:text-slate-400 mt-2 max-w-[80px]">
                              No se puede eliminar lote {isFullyConsumed ? 'consumido' : 'parcialmente usado'}
                            </p>
                          )}
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Empty state cuando no hay insumo seleccionado */}
        {!selectedInsumoId && (
          <Card>
            <div className="text-center py-12">
              <span className="material-symbols-outlined text-slate-300 dark:text-slate-600 text-6xl mb-4">
                receipt_long
              </span>
              <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Selecciona un insumo
              </h3>
              <p className="text-slate-700 dark:text-slate-300">
                Elige un insumo para ver su historial de compras
              </p>
            </div>
          </Card>
        )}
      </div>
    </Layout>
  );
}
