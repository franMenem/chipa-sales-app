import { useState } from 'react';
import { Layout } from '../components/layout/Layout';
import { Button } from '../components/ui/Button';
import { AdjustFinishedStockForm } from '../components/forms/AdjustFinishedStockForm';
import { useProductos } from '../hooks/useProductos';
import { useInsumos } from '../hooks/useInsumos';
import type { ProductoWithCost, Insumo } from '../lib/types';

export function Stock() {
  const { data: productos, isLoading: loadingProductos } = useProductos();
  const { data: insumos, isLoading: loadingInsumos } = useInsumos();
  const [selectedProducto, setSelectedProducto] = useState<ProductoWithCost | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const isLoading = loadingProductos || loadingInsumos;

  const handleAddStock = (producto: ProductoWithCost) => {
    setSelectedProducto(producto);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedProducto(null);
  };

  // Calcular stock disponible para cada producto
  const calculateAvailableStock = (producto: ProductoWithCost, insumosData: Insumo[]) => {
    if (!producto.recipe_items || producto.recipe_items.length === 0) {
      return 0;
    }

    // Calcular cuántas unidades podemos hacer con cada insumo
    const possibleUnitsPerInsumo = producto.recipe_items.map((item) => {
      const insumo = insumosData.find((i) => i.id === item.insumo_id);
      if (!insumo) return 0;

      // Convertir quantity del insumo a unidades base
      let availableInBaseUnits = insumo.quantity;
      if (insumo.unit_type === 'kg' || insumo.unit_type === 'l') {
        availableInBaseUnits = insumo.quantity * 1000; // convertir a g o ml
      }

      // Calcular cuántas unidades del producto podemos hacer
      const possibleUnits = Math.floor(availableInBaseUnits / item.quantity_in_base_units);
      return possibleUnits;
    });

    // El stock disponible es el mínimo entre todos los insumos
    return Math.min(...possibleUnitsPerInsumo);
  };

  const productosConStock = (productos || []).map((producto) => {
    const stockFromInsumos = calculateAvailableStock(producto, insumos || []);
    const finishedStock = producto.finished_stock || 0;
    const totalStock = stockFromInsumos + finishedStock;

    return {
      ...producto,
      stockDisponible: stockFromInsumos,
      stockTotal: totalStock,
    };
  });

  // Ordenar por stock total (menor a mayor)
  const productosSorted = [...productosConStock].sort((a, b) => a.stockTotal - b.stockTotal);

  return (
    <Layout
      title="Stock"
      subtitle="Inventario de productos"
    >
      <div className="p-4">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent mb-4" />
            <p className="text-slate-700 dark:text-slate-300">Cargando inventario...</p>
          </div>
        ) : productosSorted.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <span className="material-symbols-outlined text-slate-300 dark:text-slate-600 text-6xl mb-4">
              inventory_2
            </span>
            <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300 mb-2">
              No hay productos
            </h3>
            <p className="text-slate-700 dark:text-slate-300 text-center">
              Agrega productos con recetas para ver el stock disponible
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {productosSorted.map((producto) => {
              const isLowStock = producto.stockTotal <= 5;
              const isOutOfStock = producto.stockTotal === 0;

              return (
                <div
                  key={producto.id}
                  className={`bg-white dark:bg-surface-dark rounded-lg p-4 shadow-sm border-l-4 ${
                    isOutOfStock
                      ? 'border-red-500'
                      : isLowStock
                      ? 'border-yellow-500'
                      : 'border-primary'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-semibold text-slate-800 dark:text-slate-200">
                          {producto.name}
                        </h3>
                        <Button
                          size="sm"
                          icon="add"
                          onClick={() => handleAddStock(producto)}
                          className="shrink-0"
                        >
                          Agregar
                        </Button>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-base font-semibold text-slate-800 dark:text-slate-200">
                          <span className="material-symbols-outlined text-xl text-primary">
                            inventory
                          </span>
                          <span>
                            Stock total disponible: <strong className="text-primary">{producto.stockTotal}</strong> unidades
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-500 ml-7">
                          <span>→ Terminados: <strong>{producto.finished_stock || 0}</strong></span>
                          <span>•</span>
                          <span>Por insumos: <strong>{producto.stockDisponible}</strong></span>
                        </div>
                      </div>
                      {producto.recipe_items && producto.recipe_items.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
                          <p className="text-xs text-slate-700 dark:text-slate-300 mb-2">
                            Insumos necesarios (por unidad):
                          </p>
                          <div className="space-y-1">
                            {producto.recipe_items.map((item) => {
                              const insumo = insumos?.find((i) => i.id === item.insumo_id);
                              if (!insumo) return null;

                              let availableInBaseUnits = insumo.quantity;
                              if (insumo.unit_type === 'kg' || insumo.unit_type === 'l') {
                                availableInBaseUnits = insumo.quantity * 1000;
                              }

                              const displayUnit = insumo.unit_type === 'kg' || insumo.unit_type === 'l'
                                ? (insumo.unit_type === 'kg' ? 'g' : 'ml')
                                : insumo.unit_type;

                              return (
                                <div
                                  key={item.id}
                                  className="flex items-center justify-between text-xs"
                                >
                                  <span className="text-slate-600 dark:text-slate-400">
                                    {insumo.name}: {item.quantity_in_base_units} {displayUnit}
                                  </span>
                                  <span className="text-slate-500 dark:text-slate-500">
                                    Disponible: {availableInBaseUnits.toFixed(2)} {displayUnit}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="ml-4">
                      {isOutOfStock ? (
                        <div className="flex flex-col items-center">
                          <span className="material-symbols-outlined text-red-500 text-4xl">
                            error
                          </span>
                          <span className="text-xs text-red-500 font-medium mt-1">
                            Sin stock
                          </span>
                        </div>
                      ) : isLowStock ? (
                        <div className="flex flex-col items-center">
                          <span className="material-symbols-outlined text-yellow-500 text-4xl">
                            warning
                          </span>
                          <span className="text-xs text-yellow-600 dark:text-yellow-500 font-medium mt-1">
                            Bajo stock
                          </span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center">
                          <span className="material-symbols-outlined text-primary text-4xl">
                            check_circle
                          </span>
                          <span className="text-xs text-primary font-medium mt-1">
                            Disponible
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <AdjustFinishedStockForm
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        producto={selectedProducto}
      />
    </Layout>
  );
}
