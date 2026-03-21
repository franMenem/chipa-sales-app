import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/layout/Layout';
import { Button } from '../components/ui/Button';
import { ProduceProductoForm } from '../components/forms/ProduceProductoForm';
import { AdjustFinishedStockForm } from '../components/forms/AdjustFinishedStockForm';
import { useProductos } from '../hooks/queries/useProductosQueries';
import { useInsumos } from '../hooks/queries/useInsumosQueries';
import { useStockFabricadoTotals } from '../hooks/useStockFabricado';
import { useAutoProduceAll } from '../hooks/mutations/useAutoProduceAll';
import { useProductionModals } from '../hooks/domain/useProductionModals';
import { formatCurrency } from '../utils/formatters';
import { calculateProducibleUnits } from '../utils/productionHelpers';

export function Stock() {
  const navigate = useNavigate();
  const { data: productos, isLoading: loadingProductos } = useProductos();
  const { data: insumos, isLoading: loadingInsumos } = useInsumos();
  const { data: stockFabricadoTotals } = useStockFabricadoTotals();
  const {
    isProduceModalOpen,
    isAdjustModalOpen,
    selectedProductoId,
    selectedProducto,
    handleProduce,
    handleAdjustStock,
    closeProduceModal,
    closeAdjustModal,
  } = useProductionModals();

  const autoProduceMutation = useAutoProduceAll();
  const isLoading = loadingProductos || loadingInsumos;

  // Candidatos para auto-fabricar: productos con insumos suficientes y sin categorías
  const autoCandidates = useMemo(() => {
    if (!productos || !insumos) return [];
    return productos
      .filter((p) => p.has_sufficient_ingredients)
      .map((p) => ({
        productoId: p.id,
        productoName: p.name,
        quantity: calculateProducibleUnits(p, insumos),
      }))
      .filter((c) => c.quantity > 0);
  }, [productos, insumos]);

  const handleAutoProduceAll = () => {
    if (autoCandidates.length === 0) return;
    autoProduceMutation.mutate(autoCandidates);
  };


  // Ordenar productos por stock terminado (menor a mayor)
  const productosSorted = [...(productos || [])].sort(
    (a, b) => a.finished_stock - b.finished_stock
  );

  // Calcular totales
  const totalProductosStock = productos?.reduce((sum, p) => p.finished_stock + sum, 0) || 0;
  const stockFabricadoByProducto = new Map(
    (stockFabricadoTotals || []).map((entry) => [entry.producto_id, entry])
  );

  return (
    <Layout
      title="Stock"
      subtitle="Inventario de productos e insumos"
    >
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Button
            icon="bolt"
            size="sm"
            onClick={handleAutoProduceAll}
            disabled={autoCandidates.length === 0 || autoProduceMutation.isPending}
          >
            {autoProduceMutation.isPending ? 'Fabricando...' : 'Auto-fabricar'}
          </Button>
          <Button
            variant="ghost"
            icon="manufacturing"
            size="sm"
            onClick={() => handleProduce()}
          >
            Manual
          </Button>
          <Button
            variant="ghost"
            icon="history"
            size="sm"
            onClick={() => navigate('/productos/historial')}
          >
            Historial
          </Button>
        </div>
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent mb-4" />
            <p className="text-slate-700 dark:text-slate-300">Cargando inventario...</p>
          </div>
        ) : (
          <>
            {/* Resumen compacto */}
            <div className="flex items-center gap-2 sm:gap-4 flex-wrap bg-slate-50 dark:bg-slate-800/50 rounded-lg px-3 sm:px-4 py-2.5 border border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-blue-600 dark:text-blue-400 text-[18px]">
                  bakery_dining
                </span>
                <span className="text-sm text-slate-600 dark:text-slate-400">Terminados:</span>
                <span className="text-sm font-bold text-slate-900 dark:text-white">{totalProductosStock} ud</span>
              </div>
              <div className="w-px h-5 bg-slate-300 dark:bg-slate-600 hidden sm:block" />
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-green-600 dark:text-green-400 text-[18px]">
                  inventory
                </span>
                <span className="text-sm text-slate-600 dark:text-slate-400">Insumos:</span>
                <span className="text-sm font-bold text-slate-900 dark:text-white">{insumos?.length || 0} tipos</span>
              </div>
            </div>

            {/* Lista de productos - tabla compacta */}
            {productosSorted.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                <span className="material-symbols-outlined text-slate-300 dark:text-slate-600 text-4xl mb-2">
                  inventory_2
                </span>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  No hay productos. Crea una receta para empezar.
                </p>
              </div>
            ) : (
              <div className="bg-white dark:bg-surface-dark rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                {productosSorted.map((producto, idx) => {
                  const isLowStock = producto.finished_stock <= 5;
                  const isOutOfStock = producto.finished_stock === 0;
                  const canProduce = producto.has_sufficient_ingredients;

                  const stockInfo = stockFabricadoByProducto.get(producto.id);
                  const costUnit =
                    stockInfo?.lifo_cost_unit ??
                    stockInfo?.avg_cost_unit ??
                    producto.cost_unit;
                  const margin =
                    stockInfo?.lifo_margin_percentage ??
                    stockInfo?.avg_margin_percentage ??
                    null;

                  return (
                    <div
                      key={producto.id}
                      className={`flex items-center gap-3 px-3 py-2.5 ${
                        idx > 0 ? 'border-t border-slate-100 dark:border-slate-800' : ''
                      }`}
                    >
                      {/* Status indicator */}
                      <div className={`w-2 h-2 rounded-full shrink-0 ${
                        isOutOfStock ? 'bg-red-500' : isLowStock ? 'bg-yellow-500' : 'bg-green-500'
                      }`} />

                      {/* Name + cost */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                          {producto.name}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                          <span>{formatCurrency(costUnit)}</span>
                          {margin !== null && (
                            <>
                              <span>·</span>
                              <span className={
                                margin < 20 ? 'text-red-600 dark:text-red-400'
                                  : margin >= 40 ? 'text-green-600 dark:text-green-400'
                                  : 'text-yellow-600 dark:text-yellow-400'
                              }>
                                {margin.toFixed(0)}%
                              </span>
                            </>
                          )}
                          {!canProduce && (
                            <>
                              <span>·</span>
                              <span className="text-red-500">Sin insumos</span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Stock count */}
                      <span className={`text-sm font-bold tabular-nums shrink-0 ${
                        isOutOfStock ? 'text-red-600 dark:text-red-400'
                          : isLowStock ? 'text-yellow-600 dark:text-yellow-400'
                          : 'text-green-600 dark:text-green-400'
                      }`}>
                        {producto.finished_stock}
                      </span>

                      {/* Actions */}
                      <div className="flex items-center gap-0.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleAdjustStock(producto)}
                          className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors active:scale-95"
                          style={{ touchAction: 'manipulation' }}
                          title="Ajustar stock"
                        >
                          <span className="material-symbols-outlined text-slate-500 dark:text-slate-400 text-[18px]">edit</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleProduce(producto.id)}
                          disabled={!canProduce}
                          className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-30 active:scale-95"
                          style={{ touchAction: 'manipulation' }}
                          title="Fabricar"
                        >
                          <span className="material-symbols-outlined text-slate-500 dark:text-slate-400 text-[18px]">manufacturing</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      <ProduceProductoForm
        isOpen={isProduceModalOpen}
        onClose={closeProduceModal}
        preselectedProductoId={selectedProductoId}
      />

      <AdjustFinishedStockForm
        isOpen={isAdjustModalOpen}
        onClose={closeAdjustModal}
        producto={selectedProducto}
      />
    </Layout>
  );
}
