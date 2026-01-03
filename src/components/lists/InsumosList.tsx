import { useState, useMemo, memo, useCallback, useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import type { InsumoLote } from '../../lib/types';
import { formatCurrency } from '../../utils/formatters';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { SearchBar } from '../ui/SearchBar';
import { useDebounce } from '../../hooks/useDebounce';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const VIRTUALIZATION_THRESHOLD = 50;

interface InsumosListProps {
  lotes: (InsumoLote & { insumo: any })[];
  onAddBatch: (insumoId: string) => void;
}

const unitLabels = {
  kg: 'kg',
  l: 'L',
  g: 'g',
  ml: 'ml',
  unit: 'ud',
};

// Memoized LoteCard component
interface LoteCardProps {
  lote: InsumoLote & { insumo: any };
  onAddBatch: (insumoId: string) => void;
}

const LoteCard = memo(({ lote, onAddBatch }: LoteCardProps) => {
  const consumedPercentage = ((lote.quantity_purchased - lote.quantity_remaining) / lote.quantity_purchased) * 100;
  const isPartiallyConsumed = lote.quantity_remaining < lote.quantity_purchased && lote.quantity_remaining > 0;

  return (
    <Card>
      <div className="space-y-3">
        {/* Header with insumo name and add button */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-slate-900 dark:text-white">
              {lote.insumo.name}
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Compra: {format(new Date(lote.purchase_date), "dd 'de' MMM, yyyy", { locale: es })}
            </p>
          </div>

          <Button
            variant="ghost"
            size="sm"
            icon="add_shopping_cart"
            onClick={() => onAddBatch(lote.insumo_id)}
            aria-label={`Agregar compra de ${lote.insumo.name}`}
          />
        </div>

        {/* Stock and price info */}
        <div className="space-y-2">
          <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-3 flex items-center justify-between">
            <span className="text-sm text-slate-700 dark:text-slate-300">
              Stock disponible
            </span>
            <span className="text-base font-semibold text-slate-900 dark:text-white">
              {lote.quantity_remaining} {unitLabels[lote.unit_type as keyof typeof unitLabels]}
            </span>
          </div>

          <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-3 flex items-center justify-between">
            <span className="text-sm text-slate-700 dark:text-slate-300">
              Precio
            </span>
            <span className="text-base font-semibold text-primary">
              {formatCurrency(lote.price_per_unit)}/{unitLabels[lote.unit_type as keyof typeof unitLabels]}
            </span>
          </div>

          <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-3 flex items-center justify-between">
            <span className="text-sm text-slate-700 dark:text-slate-300">
              Cantidad original
            </span>
            <span className="text-base font-semibold text-slate-700 dark:text-slate-400">
              {lote.quantity_purchased} {unitLabels[lote.unit_type as keyof typeof unitLabels]}
            </span>
          </div>
        </div>

        {/* Consumption progress bar - always visible with min height */}
        <div className="space-y-1 min-h-[32px]">
          {consumedPercentage > 0 ? (
            <>
              <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
                <span>Consumido</span>
                <span>{consumedPercentage.toFixed(0)}%</span>
              </div>
              <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1.5">
                <div
                  className="h-1.5 rounded-full bg-primary transition-all"
                  style={{ width: `${consumedPercentage}%` }}
                />
              </div>
            </>
          ) : (
            <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
              <span>Sin uso</span>
              <span>0%</span>
            </div>
          )}
        </div>

        {/* Total cost of remaining stock */}
        <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 rounded-lg p-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-blue-700 dark:text-blue-300">
              $ Stock
            </span>
            <span className="text-base font-bold text-blue-900 dark:text-blue-100">
              {(lote.quantity_remaining * lote.price_per_unit).toLocaleString('es-PY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
});

LoteCard.displayName = 'LoteCard';

export function InsumosList({ lotes, onAddBatch }: InsumosListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const parentRef = useRef<HTMLDivElement>(null);

  const filteredLotes = useMemo(
    () => lotes.filter((lote) =>
      lote.insumo.name.toLowerCase().includes(debouncedSearchTerm.toLowerCase())
    ),
    [lotes, debouncedSearchTerm]
  );

  // Use virtualization only for large lists
  const useVirtualization = filteredLotes.length >= VIRTUALIZATION_THRESHOLD;

  // Setup virtualizer for large lists
  const rowVirtualizer = useVirtualizer({
    count: filteredLotes.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 180, // Estimated height of each lote card
    overscan: 5,
    enabled: useVirtualization,
  });

  if (lotes.length === 0) {
    return (
      <div className="text-center py-12">
        <span className="material-symbols-outlined text-slate-300 dark:text-slate-700 text-6xl mb-4">
          inventory_2
        </span>
        <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300 mb-2">
          No hay lotes disponibles
        </h3>
        <p className="text-slate-700 dark:text-slate-300">
          Registra tu primera compra para comenzar
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* ARIA live region for search results announcements */}
      <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {searchTerm && `Se ${filteredLotes.length === 1 ? 'encontró' : 'encontraron'} ${filteredLotes.length} ${filteredLotes.length === 1 ? 'lote' : 'lotes'}`}
      </div>

      <SearchBar
        placeholder="Buscar insumo..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        onClear={() => setSearchTerm('')}
      />

      {filteredLotes.length === 0 ? (
        <div className="text-center py-8">
          <span className="material-symbols-outlined text-slate-300 dark:text-slate-700 text-5xl mb-3">
            search_off
          </span>
          <p className="text-slate-700 dark:text-slate-300">
            No se encontraron lotes con "{searchTerm}"
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
              const lote = filteredLotes[virtualRow.index];
              return (
                <div
                  key={lote.id}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                >
                  <div className="pb-4">
                    <LoteCard
                      lote={lote}
                      onAddBatch={onAddBatch}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
          {filteredLotes.map((lote) => (
            <LoteCard
              key={lote.id}
              lote={lote}
              onAddBatch={onAddBatch}
            />
          ))}
        </div>
      )}
    </div>
  );
}
