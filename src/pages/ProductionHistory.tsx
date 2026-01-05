import { useState } from 'react';
import { Layout } from '../components/layout/Layout';
import { Select } from '../components/ui/Select';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { useProductos } from '../hooks/useProductos';
import { useProductionHistory, useReverseProduction } from '../hooks/useProduction';
import { formatCurrency } from '../utils/formatters';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export function ProductionHistory() {
  const [selectedProductoId, setSelectedProductoId] = useState<string>('');
  const { data: productos = [] } = useProductos();
  const { data: history = [], isLoading: loadingHistory } = useProductionHistory(selectedProductoId || undefined);
  const reverseMutation = useReverseProduction();

  const selectedProducto = productos.find(p => p.id === selectedProductoId);

  const handleReverse = async (historyId: string, date: string, quantity: number, currentStock: number) => {
    const needsForce = currentStock < quantity;

    let confirmMessage = `¿Revertir la producción del ${format(new Date(date), 'dd/MM/yyyy HH:mm', { locale: es })}?\n\n`;
    confirmMessage += `Esto devolverá ${quantity} unidades del producto al stock de insumos y reducirá el stock de productos terminados.\n\n`;

    if (needsForce) {
      confirmMessage += `⚠️ ADVERTENCIA: Stock actual (${currentStock}) es menor que la cantidad a revertir (${quantity}).\n`;
      confirmMessage += `El stock quedará en ${currentStock - quantity} (negativo). Deberás ajustarlo manualmente después.`;
    }

    if (window.confirm(confirmMessage)) {
      try {
        await reverseMutation.mutateAsync({
          production_history_id: historyId,
          force: needsForce
        });
      } catch (error) {
        // Error handled by mutation
      }
    }
  };

  const productoOptions = [
    { value: '', label: 'Seleccionar producto...' },
    ...productos.map(p => ({
      value: p.id,
      label: `${p.name} (Stock: ${p.finished_stock} unidades)`,
    })),
  ];

  return (
    <Layout
      title="Historial de Producción"
      subtitle="Visualiza y revierte producciones"
    >
      <div className="p-4 space-y-6">
        {/* Selector de producto */}
        <Card>
          <Select
            label="Seleccionar producto"
            options={productoOptions}
            value={selectedProductoId}
            onChange={(e) => setSelectedProductoId(e.target.value)}
          />
        </Card>

        {/* Resumen del producto seleccionado */}
        {selectedProducto && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <div className="space-y-1">
                <p className="text-sm text-slate-600 dark:text-slate-400">Stock Actual</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">
                  {selectedProducto.finished_stock} unidades
                </p>
              </div>
            </Card>
            <Card>
              <div className="space-y-1">
                <p className="text-sm text-slate-600 dark:text-slate-400">Costo Unitario Actual</p>
                <p className="text-2xl font-bold text-primary-600 dark:text-primary-400">
                  {formatCurrency(selectedProducto.cost_unit)}
                </p>
              </div>
            </Card>
            <Card>
              <div className="space-y-1">
                <p className="text-sm text-slate-600 dark:text-slate-400">Precio de Venta</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {formatCurrency(selectedProducto.price_sale)}
                </p>
              </div>
            </Card>
          </div>
        )}

        {/* Lista de producciones */}
        {selectedProductoId && (
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
              Historial de Producción
            </h2>

            {loadingHistory ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent mb-4" />
                <p className="text-slate-700 dark:text-slate-300">Cargando historial...</p>
              </div>
            ) : history.length === 0 ? (
              <Card>
                <div className="text-center py-8">
                  <span className="material-symbols-outlined text-slate-300 dark:text-slate-600 text-6xl mb-4">
                    manufacturing
                  </span>
                  <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300 mb-2">
                    Sin producciones registradas
                  </h3>
                  <p className="text-slate-700 dark:text-slate-300">
                    No hay producciones registradas para este producto
                  </p>
                </div>
              </Card>
            ) : (
              <div className="space-y-3">
                {history.map((production) => (
                  <Card key={production.id}>
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
                                {format(new Date(production.production_date), "dd 'de' MMMM, yyyy", { locale: es })}
                              </p>
                            </div>
                            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                              Fabricado: {format(new Date(production.production_date), 'HH:mm', { locale: es })} hs
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-bold text-primary-600 dark:text-primary-400">
                              {formatCurrency(production.cost_unit_at_production)}
                            </p>
                            <p className="text-xs text-slate-600 dark:text-slate-400">
                              costo unitario
                            </p>
                          </div>
                        </div>

                        {/* Cantidades */}
                        <div className="grid grid-cols-2 gap-4">
                          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3">
                            <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">
                              Cantidad Producida
                            </p>
                            <p className="text-lg font-semibold text-slate-900 dark:text-white">
                              {production.quantity_produced} unidades
                            </p>
                          </div>
                          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3">
                            <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">
                              Costo Total
                            </p>
                            <p className="text-lg font-semibold text-slate-900 dark:text-white">
                              {formatCurrency(production.cost_unit_at_production * production.quantity_produced)}
                            </p>
                          </div>
                        </div>

                        {/* Info adicional */}
                        <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 rounded-lg p-3">
                          <div className="flex gap-2">
                            <span className="material-symbols-outlined text-blue-600 dark:text-blue-400 text-[20px]">
                              info
                            </span>
                            <div className="text-sm text-blue-700 dark:text-blue-300">
                              <p>Revertir esta producción devolverá los insumos consumidos al inventario.</p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Botón revertir */}
                      <div>
                        <Button
                          variant="ghost"
                          size="sm"
                          icon="undo"
                          onClick={() => handleReverse(
                            production.id,
                            production.production_date,
                            production.quantity_produced,
                            selectedProducto?.finished_stock || 0
                          )}
                          disabled={reverseMutation.isPending}
                          aria-label="Revertir producción"
                          className="text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-950/30"
                        />
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Empty state cuando no hay producto seleccionado */}
        {!selectedProductoId && (
          <Card>
            <div className="text-center py-12">
              <span className="material-symbols-outlined text-slate-300 dark:text-slate-600 text-6xl mb-4">
                manufacturing
              </span>
              <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Selecciona un producto
              </h3>
              <p className="text-slate-700 dark:text-slate-300">
                Elige un producto para ver su historial de producción
              </p>
            </div>
          </Card>
        )}
      </div>
    </Layout>
  );
}
