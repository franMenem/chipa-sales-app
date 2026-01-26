import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/layout/Layout';
import { Button } from '../components/ui/Button';
import { ProduceProductoForm } from '../components/forms/ProduceProductoForm';
import { AdjustFinishedStockForm } from '../components/forms/AdjustFinishedStockForm';
import { useProductos } from '../hooks/queries/useProductosQueries';
import { useInsumos } from '../hooks/useInsumos';
import { useStockFabricadoTotals } from '../hooks/useStockFabricado';
import { formatCurrency } from '../utils/formatters';
import type { ProductoWithCost } from '../lib/types';

export function Stock() {
  const navigate = useNavigate();
  const { data: productos, isLoading: loadingProductos } = useProductos();
  const { data: insumos, isLoading: loadingInsumos } = useInsumos();
  const { data: stockFabricadoTotals } = useStockFabricadoTotals();
  const [isProduceModalOpen, setIsProduceModalOpen] = useState(false);
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [selectedProductoId, setSelectedProductoId] = useState<string | undefined>(undefined);
  const [selectedProducto, setSelectedProducto] = useState<ProductoWithCost | null>(null);

  const isLoading = loadingProductos || loadingInsumos;

  const handleProduce = (productoId?: string) => {
    setSelectedProductoId(productoId);
    setIsProduceModalOpen(true);
  };

  const handleAdjustStock = (producto: ProductoWithCost) => {
    setSelectedProducto(producto);
    setIsAdjustModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsProduceModalOpen(false);
    setSelectedProductoId(undefined);
  };

  const handleCloseAdjustModal = () => {
    setIsAdjustModalOpen(false);
    setSelectedProducto(null);
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
      headerAction={
        <div className="flex gap-1.5 sm:gap-2">
          <Button
            variant="ghost"
            icon="history"
            size="sm"
            onClick={() => navigate('/productos/historial')}
            aria-label="Historial de Producción"
          >
            <span className="hidden sm:inline">Historial</span>
          </Button>
          <Button icon="manufacturing" size="sm" onClick={() => handleProduce()}>
            Fabricar
          </Button>
        </div>
      }
    >
      <div className="p-4 space-y-6">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent mb-4" />
            <p className="text-slate-700 dark:text-slate-300">Cargando inventario...</p>
          </div>
        ) : (
          <>
            {/* Resumen de stock */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Productos terminados */}
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-900/20 rounded-xl p-6 border border-blue-200 dark:border-blue-900">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-blue-700 dark:text-blue-300 mb-1">
                      Productos Terminados
                    </p>
                    <p className="text-3xl font-bold text-blue-900 dark:text-blue-100">
                      {totalProductosStock}
                    </p>
                    <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                      unidades listas para vender
                    </p>
                  </div>
                  <span className="material-symbols-outlined text-blue-600 dark:text-blue-400 text-5xl">
                    bakery_dining
                  </span>
                </div>
              </div>

              {/* Insumos disponibles */}
              <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/30 dark:to-green-900/20 rounded-xl p-6 border border-green-200 dark:border-green-900">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-green-700 dark:text-green-300 mb-1">
                      Tipos de Insumos con Stock
                    </p>
                    <p className="text-3xl font-bold text-green-900 dark:text-green-100">
                      {insumos?.length || 0}
                    </p>
                    <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                      ingredientes disponibles
                    </p>
                  </div>
                  <span className="material-symbols-outlined text-green-600 dark:text-green-400 text-5xl">
                    inventory
                  </span>
                </div>
              </div>
            </div>

            {/* Lista de productos terminados */}
            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
                Stock de Productos Terminados
              </h2>

              {productosSorted.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                  <span className="material-symbols-outlined text-slate-300 dark:text-slate-600 text-6xl mb-4">
                    inventory_2
                  </span>
                  <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300 mb-2">
                    No hay productos
                  </h3>
                  <p className="text-slate-700 dark:text-slate-300 text-center">
                    Agrega productos para comenzar a fabricar
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {productosSorted.map((producto) => {
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
                        className={`bg-white dark:bg-surface-dark rounded-xl p-4 shadow-sm border-l-4 ${
                          isOutOfStock
                            ? 'border-red-500 dark:border-red-700'
                            : isLowStock
                            ? 'border-yellow-500 dark:border-yellow-700'
                            : 'border-green-500 dark:border-green-700'
                        }`}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-slate-900 dark:text-white truncate">
                              {producto.name}
                            </h3>
                            <div className="flex items-center gap-3 mt-1">
                              <p className="text-xs text-slate-600 dark:text-slate-400">
                                Costo: {formatCurrency(costUnit)}
                              </p>
                              {/* TODO: Show price from stock_fabricado batches */}
                            </div>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <Button
                              variant="ghost"
                              size="sm"
                              icon="edit"
                              onClick={() => handleAdjustStock(producto)}
                              aria-label={`Ajustar stock de ${producto.name}`}
                              className="text-slate-600 dark:text-slate-400"
                            />
                            <Button
                              variant="ghost"
                              size="sm"
                              icon="manufacturing"
                              onClick={() => handleProduce(producto.id)}
                              disabled={!canProduce}
                              aria-label={`Fabricar ${producto.name}`}
                            />
                          </div>
                        </div>

                        {/* Margen */}
                        <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-2 mb-3">
                          <p className="text-xs text-slate-600 dark:text-slate-400 mb-0.5">Margen</p>
                          <p className={`text-sm font-semibold ${
                            margin !== null && margin < 20
                              ? 'text-red-600 dark:text-red-400'
                              : margin !== null && margin >= 40
                              ? 'text-green-600 dark:text-green-400'
                              : margin !== null
                              ? 'text-yellow-600 dark:text-yellow-400'
                              : 'text-slate-600 dark:text-slate-400'
                          }`}>
                            {margin === null ? 'N/D' : `${margin.toFixed(1)}%`}
                          </p>
                        </div>

                        {/* Stock */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-slate-600 dark:text-slate-400">
                              Stock terminado:
                            </span>
                            <span className={`text-lg font-bold ${
                              isOutOfStock
                                ? 'text-red-600 dark:text-red-400'
                                : isLowStock
                                ? 'text-yellow-600 dark:text-yellow-400'
                                : 'text-green-600 dark:text-green-400'
                            }`}>
                              {producto.finished_stock}
                            </span>
                          </div>

                          {/* Estado de ingredientes */}
                          {!canProduce && (
                            <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-lg p-2 flex items-center gap-2">
                              <span className="material-symbols-outlined text-red-600 dark:text-red-400 text-[16px]">
                                warning
                              </span>
                              <p className="text-xs text-red-700 dark:text-red-300">
                                Insumos insuficientes
                              </p>
                            </div>
                          )}

                          {canProduce && isLowStock && (
                            <div className="bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-900 rounded-lg p-2 flex items-center gap-2">
                              <span className="material-symbols-outlined text-yellow-600 dark:text-yellow-400 text-[16px]">
                                inventory_2
                              </span>
                              <p className="text-xs text-yellow-700 dark:text-yellow-300">
                                Stock bajo - Fabricar más
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      <ProduceProductoForm
        isOpen={isProduceModalOpen}
        onClose={handleCloseModal}
        preselectedProductoId={selectedProductoId}
      />

      <AdjustFinishedStockForm
        isOpen={isAdjustModalOpen}
        onClose={handleCloseAdjustModal}
        producto={selectedProducto}
      />
    </Layout>
  );
}
