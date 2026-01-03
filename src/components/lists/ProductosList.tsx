import { useState, useMemo, memo, useCallback, useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import type { ProductoWithCost } from '../../lib/types';
import { formatCurrency } from '../../utils/formatters';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { SearchBar } from '../ui/SearchBar';
import { useDeleteProducto } from '../../hooks/useProductos';
import { useDebounce } from '../../hooks/useDebounce';

const VIRTUALIZATION_THRESHOLD = 50;

interface ProductosListProps {
  productos: ProductoWithCost[];
  onEdit: (producto: ProductoWithCost) => void;
}

// Helper functions outside component to prevent recreation
const calculateMargin = (price: number, cost: number): number => {
  if (price === 0) return 0;
  return ((price - cost) / price) * 100;
};

const calculateProfit = (price: number, cost: number): number => {
  return price - cost;
};

// Memoized ProductoCard component
interface ProductoCardProps {
  producto: ProductoWithCost;
  onEdit: (producto: ProductoWithCost) => void;
  onDelete: (id: string, name: string) => void;
  isDeleting: boolean;
}

const ProductoCard = memo(({ producto, onEdit, onDelete, isDeleting }: ProductoCardProps) => {
  const margin = calculateMargin(producto.price_sale, producto.cost_unit);
  const profit = calculateProfit(producto.price_sale, producto.cost_unit);
  const isLowMargin = margin < 20;
  const isGoodMargin = margin >= 40;

  return (
    <Card>
      <div className="space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="flex items-center justify-center w-9 h-9 rounded-full bg-primary/10 shrink-0">
              <span className="material-symbols-outlined text-primary text-[18px]">
                bakery_dining
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-slate-900 dark:text-white">
                {producto.name}
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
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
              icon="delete"
              onClick={() => onDelete(producto.id, producto.name)}
              disabled={isDeleting}
              aria-label={`Eliminar ${producto.name}`}
              className="text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30"
            />
          </div>
        </div>

        {/* Price */}
        <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-3 flex items-center justify-between">
          <p className="text-sm text-slate-700 dark:text-slate-300">
            Precio de venta
          </p>
          <p className="text-base font-semibold text-primary">
            {formatCurrency(producto.price_sale)}
          </p>
        </div>

        {/* Metrics */}
        <div className="space-y-2">
          {/* Cost */}
          <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-3 flex items-center justify-between">
            <p className="text-sm text-slate-700 dark:text-slate-300">
              Costo
            </p>
            <p className="text-base font-semibold text-slate-900 dark:text-white">
              {formatCurrency(producto.cost_unit)}
            </p>
          </div>

          {/* Profit */}
          <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-3 flex items-center justify-between">
            <p className="text-sm text-slate-700 dark:text-slate-300">
              Ganancia
            </p>
            <p className="text-base font-semibold text-green-600 dark:text-green-400">
              {formatCurrency(profit)}
            </p>
          </div>

          {/* Margin */}
          <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-3 flex items-center justify-between">
            <p className="text-sm text-slate-700 dark:text-slate-300">
              Margen
            </p>
            <p
              className={`text-base font-semibold ${
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
          <div className="text-xs text-slate-700 dark:text-slate-300">
            Margen objetivo: {producto.margin_goal}%
          </div>
        )}
      </div>
    </Card>
  );
});

ProductoCard.displayName = 'ProductoCard';

export function ProductosList({ productos, onEdit }: ProductosListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const deleteMutation = useDeleteProducto();
  const parentRef = useRef<HTMLDivElement>(null);

  // Memoize filtered results with debounced search
  const filteredProductos = useMemo(
    () => productos.filter((producto) =>
      producto.name.toLowerCase().includes(debouncedSearchTerm.toLowerCase())
    ),
    [productos, debouncedSearchTerm]
  );

  // Use virtualization only for large lists
  const useVirtualization = filteredProductos.length >= VIRTUALIZATION_THRESHOLD;

  // Setup virtualizer for large lists
  const rowVirtualizer = useVirtualizer({
    count: filteredProductos.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 200, // Estimated height of each product card
    overscan: 5,
    enabled: useVirtualization,
  });

  // Memoize delete handler
  const handleDelete = useCallback(async (id: string, name: string) => {
    if (window.confirm(`¿Estás seguro de eliminar "${name}"?`)) {
      await deleteMutation.mutateAsync(id);
    }
  }, [deleteMutation]);

  if (productos.length === 0) {
    return (
      <div className="text-center py-12">
        <span className="material-symbols-outlined text-slate-300 dark:text-slate-700 text-6xl mb-4">
          bakery_dining
        </span>
        <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300 mb-2">
          No hay productos
        </h3>
        <p className="text-slate-700 dark:text-slate-300">
          Agrega tu primer producto para comenzar
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* ARIA live region for search results announcements */}
      <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {searchTerm && `Se ${filteredProductos.length === 1 ? 'encontró' : 'encontraron'} ${filteredProductos.length} ${filteredProductos.length === 1 ? 'producto' : 'productos'}`}
      </div>

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
          <p className="text-slate-700 dark:text-slate-300">
            No se encontraron productos con "{searchTerm}"
          </p>
        </div>
      ) : useVirtualization ? (
        <div
          ref={parentRef}
          className="h-[600px] overflow-auto"
          style={{ contain: 'strict' }}
        >
          <div
            style={{
              height: `${rowVirtualizer.getTotalSize()}px`,
              width: '100%',
              position: 'relative',
            }}
          >
            {rowVirtualizer.getVirtualItems().map((virtualRow) => {
              const producto = filteredProductos[virtualRow.index];
              return (
                <div
                  key={producto.id}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                >
                  <div className="pb-4">
                    <ProductoCard
                      producto={producto}
                      onEdit={onEdit}
                      onDelete={handleDelete}
                      isDeleting={deleteMutation.isPending}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
          {filteredProductos.map((producto) => (
            <ProductoCard
              key={producto.id}
              producto={producto}
              onEdit={onEdit}
              onDelete={handleDelete}
              isDeleting={deleteMutation.isPending}
            />
          ))}
        </div>
      )}
    </div>
  );
}
