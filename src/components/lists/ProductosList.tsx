import { useState, useMemo, memo, useRef, useEffect } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import type { ProductoWithCost } from '../../lib/types';
import { formatCurrency } from '../../utils/formatters';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { SearchBar } from '../ui/SearchBar';
import { useDebounce } from '../../hooks/useDebounce';
import { canQuickProduce } from '../../utils/productionHelpers';

const VIRTUALIZATION_THRESHOLD = 50;

interface ProductosListProps {
  productos: ProductoWithCost[];
  onEdit: (producto: ProductoWithCost) => void;
  onQuickProduce: (producto: ProductoWithCost) => void;
  onUndo: (producto: ProductoWithCost) => void;
  isQuickProducing: boolean;
}

// Memoized ProductoCard component
interface ProductoCardProps {
  producto: ProductoWithCost;
  onEdit: (producto: ProductoWithCost) => void;
  onQuickProduce: (producto: ProductoWithCost) => void;
  onUndo: (producto: ProductoWithCost) => void;
  isQuickProducing: boolean;
}

const ProductoCard = memo(({ producto, onEdit, onQuickProduce, onUndo, isQuickProducing }: ProductoCardProps) => {
  const hasLowStock = producto.finished_stock < 10;
  const hasNoStock = producto.finished_stock === 0;
  const hasStock = producto.finished_stock >= 1;

  // State for quick produce validation
  const [canQuick, setCanQuick] = useState<boolean | null>(null);
  const [quickProduceReason, setQuickProduceReason] = useState<string>('');
  const [canShowUndo, setCanShowUndo] = useState(false);

  // Lazy validation: check if product can be quick-produced
  // Use random delay to distribute load and prevent 50+ parallel requests
  useEffect(() => {
    let mounted = true;

    // Random delay (0-100ms) to distribute API calls over time
    const timer = setTimeout(() => {
      canQuickProduce(producto.id).then((result) => {
        if (mounted) {
          setCanQuick(result.canProduce);
          setQuickProduceReason(result.reason || '');
          // Show undo if has stock AND is specific recipe (same validation as quick produce)
          setCanShowUndo(hasStock && result.canProduce);
        }
      });
    }, Math.random() * 100);

    return () => {
      mounted = false;
      clearTimeout(timer);
    };
  }, [producto.id, hasStock]);

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
              <h3 className="font-semibold text-slate-900 dark:text-white truncate">
                {producto.name}
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onQuickProduce(producto)}
              disabled={!canQuick || isQuickProducing}
              aria-label={`Fabricar rápido ${producto.name}`}
              title={
                canQuick
                  ? 'Fabricar 1 unidad automáticamente (LIFO, 30% margen)'
                  : quickProduceReason || 'No disponible para fabricación rápida'
              }
            >
              {isQuickProducing ? (
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-primary border-t-transparent" />
              ) : (
                <span className="material-symbols-outlined text-[20px]">bolt</span>
              )}
            </Button>
          </div>
        </div>

        {/* Metrics */}
        <div className="space-y-2">
          {/* Stock */}
          <div className={`rounded-lg p-3 flex items-center justify-between ${
            hasNoStock
              ? 'bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900'
              : hasLowStock
              ? 'bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-900'
              : 'bg-slate-50 dark:bg-slate-900/50'
          }`}>
            <span className={`text-sm font-medium ${
              hasNoStock
                ? 'text-red-700 dark:text-red-300'
                : hasLowStock
                ? 'text-yellow-700 dark:text-yellow-300'
                : 'text-slate-700 dark:text-slate-300'
            }`}>
              Stock disponible
            </span>
            <div className="flex items-center gap-2">
              <span className={`text-base font-semibold ${
                hasNoStock
                  ? 'text-red-700 dark:text-red-300'
                  : hasLowStock
                  ? 'text-yellow-700 dark:text-yellow-300'
                  : 'text-primary'
              }`}>
                {producto.finished_stock}
              </span>
              <span className="material-symbols-outlined text-[18px] text-slate-400">
                inventory
              </span>
            </div>
          </div>

          {/* Cost estimate (reference only) */}
          <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-3 flex items-center justify-between">
            <span className="text-sm text-slate-700 dark:text-slate-300">
              Costo estimado
            </span>
            <span className="text-base font-semibold text-slate-900 dark:text-white">
              {formatCurrency(producto.cost_unit)}
            </span>
          </div>
        </div>

        {/* Acciones */}
        <div className="flex items-center gap-2 pt-2">
          <Button
            variant="secondary"
            size="sm"
            icon="edit"
            onClick={() => onEdit(producto)}
            className="flex-1 sm:flex-none"
            aria-label={`Editar ${producto.name}`}
          >
            <span className="hidden sm:inline">Editar</span>
          </Button>
          {canShowUndo && (
            <Button
              variant="secondary"
              size="sm"
              icon="undo"
              onClick={() => onUndo(producto)}
              className="flex-1 sm:flex-none"
              aria-label={`Deshacer última fabricación de ${producto.name}`}
            >
              <span className="hidden sm:inline">Deshacer</span>
            </Button>
          )}
        </div>

        {/* Info note */}
        <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
          <span className="material-symbols-outlined text-[14px]">
            info
          </span>
          <span>
            El precio y margen se configuran al fabricar stock
          </span>
        </div>
      </div>
    </Card>
  );
});

ProductoCard.displayName = 'ProductoCard';

export function ProductosList({ productos, onEdit, onQuickProduce, onUndo, isQuickProducing }: ProductosListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
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

  if (productos.length === 0) {
    return (
      <div className="text-center py-12">
        <span className="material-symbols-outlined text-slate-300 dark:text-slate-700 text-6xl mb-4">
          bakery_dining
        </span>
        <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300 mb-2">
          No hay recetas
        </h3>
        <p className="text-slate-700 dark:text-slate-300">
          Agrega tu primera receta para comenzar
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* ARIA live region for search results announcements */}
      <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {searchTerm && `Se ${filteredProductos.length === 1 ? 'encontró' : 'encontraron'} ${filteredProductos.length} ${filteredProductos.length === 1 ? 'receta' : 'recetas'}`}
      </div>

      <SearchBar
        placeholder="Buscar receta..."
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
            No se encontraron recetas con "{searchTerm}"
          </p>
        </div>
      ) : useVirtualization ? (
        <div
          ref={parentRef}
          className="h-[calc(100vh-220px)] min-h-[400px] max-h-[600px] overflow-auto"
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
                      onQuickProduce={onQuickProduce}
                      onUndo={onUndo}
                      isQuickProducing={isQuickProducing}
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
              onQuickProduce={onQuickProduce}
              onUndo={onUndo}
              isQuickProducing={isQuickProducing}
            />
          ))}
        </div>
      )}
    </div>
  );
}
