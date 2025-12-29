import { useState } from 'react';
import type { ProductoWithCost } from '../../lib/types';
import { formatCurrency } from '../../utils/formatters';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { SearchBar } from '../ui/SearchBar';
import { useDeleteProducto } from '../../hooks/useProductos';

interface ProductosListProps {
  productos: ProductoWithCost[];
  onEdit: (producto: ProductoWithCost) => void;
  onAdjustStock: (producto: ProductoWithCost) => void;
}

export function ProductosList({ productos, onEdit, onAdjustStock }: ProductosListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const deleteMutation = useDeleteProducto();

  const filteredProductos = productos.filter((producto) =>
    producto.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDelete = async (id: string, name: string) => {
    if (window.confirm(`¿Estás seguro de eliminar "${name}"?`)) {
      await deleteMutation.mutateAsync(id);
    }
  };

  const calculateMargin = (price: number, cost: number): number => {
    if (price === 0) return 0;
    return ((price - cost) / price) * 100;
  };

  const calculateProfit = (price: number, cost: number): number => {
    return price - cost;
  };

  if (productos.length === 0) {
    return (
      <div className="text-center py-12">
        <span className="material-symbols-outlined text-slate-300 dark:text-slate-700 text-6xl mb-4">
          bakery_dining
        </span>
        <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300 mb-2">
          No hay productos
        </h3>
        <p className="text-slate-500 dark:text-slate-400">
          Agrega tu primer producto para comenzar
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <SearchBar
        placeholder="Buscar producto..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        onClear={() => setSearchTerm('')}
      />

      {filteredProductos.length === 0 ? (
        <div className="text-center py-8">
          <span className="material-symbols-outlined text-slate-300 dark:text-slate-700 text-5xl mb-3">
            search_off
          </span>
          <p className="text-slate-500 dark:text-slate-400">
            No se encontraron productos con "{searchTerm}"
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredProductos.map((producto) => {
            const margin = calculateMargin(producto.price_sale, producto.cost_unit);
            const profit = calculateProfit(producto.price_sale, producto.cost_unit);
            const isLowMargin = margin < 20;
            const isGoodMargin = margin >= 40;

            return (
              <Card key={producto.id}>
                <div className="space-y-3">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10">
                        <span className="material-symbols-outlined text-primary text-[20px]">
                          bakery_dining
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-slate-900 dark:text-white truncate">
                          {producto.name}
                        </h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                          Precio: {formatCurrency(producto.price_sale)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        icon="edit"
                        onClick={() => onEdit(producto)}
                        aria-label={`Editar ${producto.name}`}
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        icon="inventory_2"
                        onClick={() => onAdjustStock(producto)}
                        aria-label={`Ajustar stock de ${producto.name}`}
                        className="text-primary hover:bg-primary/10"
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        icon="delete"
                        onClick={() => handleDelete(producto.id, producto.name)}
                        disabled={deleteMutation.isPending}
                        aria-label={`Eliminar ${producto.name}`}
                        className="text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30"
                      />
                    </div>
                  </div>

                  {/* Metrics */}
                  <div className="grid grid-cols-3 gap-3">
                    {/* Cost */}
                    <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-2">
                      <p className="text-xs text-slate-500 dark:text-slate-400 mb-0.5">
                        Costo
                      </p>
                      <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                        {formatCurrency(producto.cost_unit)}
                      </p>
                    </div>

                    {/* Profit */}
                    <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-2">
                      <p className="text-xs text-slate-500 dark:text-slate-400 mb-0.5">
                        Ganancia
                      </p>
                      <p className="text-sm font-semibold text-green-600 dark:text-green-400">
                        {formatCurrency(profit)}
                      </p>
                    </div>

                    {/* Margin */}
                    <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-2">
                      <p className="text-xs text-slate-500 dark:text-slate-400 mb-0.5">
                        Margen
                      </p>
                      <p
                        className={`text-sm font-semibold ${
                          isLowMargin
                            ? 'text-red-600 dark:text-red-400'
                            : isGoodMargin
                            ? 'text-green-600 dark:text-green-400'
                            : 'text-yellow-600 dark:text-yellow-400'
                        }`}
                      >
                        {margin.toFixed(1)}%
                      </p>
                    </div>
                  </div>

                  {/* Margin Warning */}
                  {isLowMargin && (
                    <div className="flex items-start gap-2 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-lg p-2">
                      <span className="material-symbols-outlined text-red-600 dark:text-red-400 text-[18px] mt-0.5">
                        warning
                      </span>
                      <p className="text-xs text-red-700 dark:text-red-300">
                        Margen bajo. Considera aumentar el precio de venta.
                      </p>
                    </div>
                  )}

                  {producto.margin_goal && (
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      Margen objetivo: {producto.margin_goal}%
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
