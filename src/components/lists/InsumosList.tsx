import { useState, useMemo, memo, useCallback, useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import type { Insumo } from '../../lib/types';
import { formatCurrency } from '../../utils/formatters';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { SearchBar } from '../ui/SearchBar';
import { useDeleteInsumo } from '../../hooks/useInsumos';
import { useDebounce } from '../../hooks/useDebounce';

const VIRTUALIZATION_THRESHOLD = 50;

interface InsumosListProps {
  insumos: Insumo[];
  onEdit: (insumo: Insumo) => void;
}

const unitLabels = {
  kg: 'kg',
  l: 'L',
  g: 'g',
  ml: 'ml',
  unit: 'ud',
};

// Memoized InsumoCard component
interface InsumoCardProps {
  insumo: Insumo;
  onEdit: (insumo: Insumo) => void;
  onDelete: (id: string, name: string) => void;
  isDeleting: boolean;
}

const InsumoCard = memo(({ insumo, onEdit, onDelete, isDeleting }: InsumoCardProps) => (
  <Card>
    <div className="flex items-center justify-between gap-4">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10">
          <span className="material-symbols-outlined text-primary text-[20px]">
            nutrition
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-slate-900 dark:text-white truncate">
            {insumo.name}
          </h3>
          <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 flex-wrap">
            <span className="font-medium">
              {formatCurrency(insumo.price_per_unit)} / {unitLabels[insumo.unit_type]}
            </span>
            <span className="text-xs">•</span>
            <span>
              Stock: {insumo.quantity} {unitLabels[insumo.unit_type]}
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <Button
          variant="ghost"
          size="sm"
          icon="edit"
          onClick={() => onEdit(insumo)}
          aria-label={`Editar ${insumo.name}`}
        />
        <Button
          variant="ghost"
          size="sm"
          icon="delete"
          onClick={() => onDelete(insumo.id, insumo.name)}
          disabled={isDeleting}
          aria-label={`Eliminar ${insumo.name}`}
          className="text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30"
        />
      </div>
    </div>
  </Card>
));

InsumoCard.displayName = 'InsumoCard';

export function InsumosList({ insumos, onEdit }: InsumosListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const deleteMutation = useDeleteInsumo();
  const parentRef = useRef<HTMLDivElement>(null);

  const filteredInsumos = useMemo(
    () => insumos.filter((insumo) =>
      insumo.name.toLowerCase().includes(debouncedSearchTerm.toLowerCase())
    ),
    [insumos, debouncedSearchTerm]
  );

  // Use virtualization only for large lists
  const useVirtualization = filteredInsumos.length >= VIRTUALIZATION_THRESHOLD;

  // Setup virtualizer for large lists
  const rowVirtualizer = useVirtualizer({
    count: filteredInsumos.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 90, // Estimated height of each insumo card
    overscan: 5,
    enabled: useVirtualization,
  });

  const handleDelete = useCallback(async (id: string, name: string) => {
    if (window.confirm(`¿Estás seguro de eliminar "${name}"?`)) {
      await deleteMutation.mutateAsync(id);
    }
  }, [deleteMutation]);

  if (insumos.length === 0) {
    return (
      <div className="text-center py-12">
        <span className="material-symbols-outlined text-slate-300 dark:text-slate-700 text-6xl mb-4">
          inventory_2
        </span>
        <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300 mb-2">
          No hay insumos
        </h3>
        <p className="text-slate-700 dark:text-slate-300">
          Agrega tu primer insumo para comenzar
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* ARIA live region for search results announcements */}
      <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {searchTerm && `Se ${filteredInsumos.length === 1 ? 'encontró' : 'encontraron'} ${filteredInsumos.length} ${filteredInsumos.length === 1 ? 'insumo' : 'insumos'}`}
      </div>

      <SearchBar
        placeholder="Buscar insumo..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        onClear={() => setSearchTerm('')}
      />

      {filteredInsumos.length === 0 ? (
        <div className="text-center py-8">
          <span className="material-symbols-outlined text-slate-300 dark:text-slate-700 text-5xl mb-3">
            search_off
          </span>
          <p className="text-slate-700 dark:text-slate-300">
            No se encontraron insumos con "{searchTerm}"
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
              const insumo = filteredInsumos[virtualRow.index];
              return (
                <div
                  key={insumo.id}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                >
                  <div className="pb-4">
                    <InsumoCard
                      insumo={insumo}
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
          {filteredInsumos.map((insumo) => (
            <InsumoCard
              key={insumo.id}
              insumo={insumo}
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
