import { useState, memo, useCallback, useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import type { Venta } from '../../lib/types';
import { formatCurrency, formatDate, formatRelativeTime } from '../../utils/formatters';
import { getDateRangeForFilter } from '../../utils/dates';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Select } from '../ui/Select';
import { Input } from '../ui/Input';
import { useDeleteVenta } from '../../hooks/useVentas';

const VIRTUALIZATION_THRESHOLD = 50;

interface VentasListProps {
  ventas: Venta[];
  onFilterChange?: (filters: { startDate?: string; endDate?: string }) => void;
  onEdit?: (venta: Venta) => void;
}

// Memoized VentaCard component
interface VentaCardProps {
  venta: Venta;
  onEdit?: (venta: Venta) => void;
  onDelete: (id: string, productoName: string) => void;
  isDeleting: boolean;
}

const VentaCard = memo(({ venta, onEdit, onDelete, isDeleting }: VentaCardProps) => (
  <Card>
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10">
            <span className="material-symbols-outlined text-primary text-[20px]">
              receipt_long
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-slate-900 dark:text-white truncate">
              {venta.producto_name}
            </h3>
            <p className="text-sm text-slate-700 dark:text-slate-300">
              {formatDate(venta.sale_date)} •{' '}
              {formatRelativeTime(venta.sale_date)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onEdit && (
            <Button
              variant="ghost"
              size="sm"
              icon="edit"
              onClick={() => onEdit(venta)}
              aria-label="Editar venta"
            />
          )}
          <Button
            variant="ghost"
            size="sm"
            icon="delete"
            onClick={() => onDelete(venta.id, venta.producto_name)}
            disabled={isDeleting}
            className="text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30"
            aria-label="Eliminar venta"
          />
        </div>
      </div>

      {/* Quantity and Price */}
      <div className="flex items-center gap-3 text-sm">
        <div className="flex items-center gap-1 text-slate-600 dark:text-slate-400">
          <span className="material-symbols-outlined text-[16px]">
            inventory_2
          </span>
          <span>Cantidad: {venta.quantity}</span>
        </div>
        <span className="text-slate-300 dark:text-slate-700">•</span>
        <div className="text-slate-600 dark:text-slate-400">
          Precio: {formatCurrency(venta.price_sold)}
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-3">
          <p className="text-xs text-blue-600 dark:text-blue-400 mb-0.5">
            Ingreso
          </p>
          <p className="text-base font-bold text-blue-700 dark:text-blue-300">
            {formatCurrency(venta.total_income)}
          </p>
        </div>
        <div className="bg-green-50 dark:bg-green-950/30 rounded-lg p-3">
          <p className="text-xs text-green-600 dark:text-green-400 mb-0.5">
            Ganancia
          </p>
          <p className="text-base font-bold text-green-700 dark:text-green-300">
            {formatCurrency(venta.profit)}
          </p>
        </div>
      </div>
    </div>
  </Card>
));

VentaCard.displayName = 'VentaCard';

export function VentasList({ ventas, onFilterChange, onEdit }: VentasListProps) {
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month' | 'custom'>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const deleteMutation = useDeleteVenta();
  const parentRef = useRef<HTMLDivElement>(null);

  // Use virtualization only for large lists
  const useVirtualization = ventas.length >= VIRTUALIZATION_THRESHOLD;

  // Setup virtualizer for large lists
  const rowVirtualizer = useVirtualizer({
    count: ventas.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 250, // Estimated height of each venta card
    overscan: 5,
    enabled: useVirtualization,
  });

  const handleDateFilterChange = (filter: string) => {
    setDateFilter(filter as 'today' | 'week' | 'month' | 'all');

    if (filter === 'custom' || filter === 'all') {
      if (filter === 'all') {
        onFilterChange?.({ startDate: undefined, endDate: undefined });
      }
      return;
    }

    const range = getDateRangeForFilter(filter as 'today' | 'week' | 'month');
    onFilterChange?.({ startDate: range.start, endDate: range.end });
  };

  const handleCustomDateApply = () => {
    onFilterChange?.({
      startDate: startDate ? new Date(startDate).toISOString() : undefined,
      endDate: endDate ? new Date(endDate).toISOString() : undefined,
    });
  };

  const handleDelete = useCallback(async (id: string, productoName: string) => {
    if (window.confirm(`¿Estás seguro de eliminar la venta de "${productoName}"?`)) {
      await deleteMutation.mutateAsync(id);
    }
  }, [deleteMutation]);

  const totalIncome = ventas.reduce((sum, v) => sum + v.total_income, 0);
  const totalProfit = ventas.reduce((sum, v) => sum + v.profit, 0);
  const totalCost = ventas.reduce((sum, v) => sum + v.total_cost, 0);

  if (ventas.length === 0) {
    return (
      <div className="space-y-4">
        {/* Filters */}
        <Select
          label="Filtrar por fecha"
          options={[
            { value: 'all', label: 'Todas las ventas' },
            { value: 'today', label: 'Hoy' },
            { value: 'week', label: 'Última semana' },
            { value: 'month', label: 'Último mes' },
            { value: 'custom', label: 'Rango personalizado' },
          ]}
          value={dateFilter}
          onChange={(e) => handleDateFilterChange(e.target.value)}
        />

        {dateFilter === 'custom' && (
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Desde"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
            <Input
              label="Hasta"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
            <div className="col-span-2">
              <Button fullWidth onClick={handleCustomDateApply}>
                Aplicar filtro
              </Button>
            </div>
          </div>
        )}

        <div className="text-center py-12">
          <span className="material-symbols-outlined text-slate-300 dark:text-slate-700 text-6xl mb-4">
            receipt_long
          </span>
          <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300 mb-2">
            No hay ventas
          </h3>
          <p className="text-slate-700 dark:text-slate-300">
            Registra tu primera venta para comenzar
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* ARIA live region for filter results announcements */}
      <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {dateFilter !== 'all' && `Mostrando ${ventas.length} ${ventas.length === 1 ? 'venta' : 'ventas'} para el filtro seleccionado`}
      </div>

      {/* Filters */}
      <Select
        label="Filtrar por fecha"
        options={[
          { value: 'all', label: 'Todas las ventas' },
          { value: 'today', label: 'Hoy' },
          { value: 'week', label: 'Última semana' },
          { value: 'month', label: 'Último mes' },
          { value: 'custom', label: 'Rango personalizado' },
        ]}
        value={dateFilter}
        onChange={(e) => handleDateFilterChange(e.target.value)}
      />

      {dateFilter === 'custom' && (
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Desde"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
          <Input
            label="Hasta"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
          <div className="col-span-2">
            <Button fullWidth onClick={handleCustomDateApply}>
              Aplicar filtro
            </Button>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
        <Card className="bg-blue-50 dark:bg-blue-950/30">
          <p className="text-xs text-blue-600 dark:text-blue-400 mb-1">
            Ingresos
          </p>
          <p className="text-lg font-bold text-blue-700 dark:text-blue-300">
            {formatCurrency(totalIncome)}
          </p>
        </Card>
        <Card className="bg-red-50 dark:bg-red-950/30">
          <p className="text-xs text-red-600 dark:text-red-400 mb-1">Costos</p>
          <p className="text-lg font-bold text-red-700 dark:text-red-300">
            {formatCurrency(totalCost)}
          </p>
        </Card>
        <Card className="bg-green-50 dark:bg-green-950/30">
          <p className="text-xs text-green-600 dark:text-green-400 mb-1">
            Ganancia
          </p>
          <p className="text-lg font-bold text-green-700 dark:text-green-300">
            {formatCurrency(totalProfit)}
          </p>
        </Card>
      </div>

      {/* Sales List */}
      {useVirtualization ? (
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
              const venta = ventas[virtualRow.index];
              return (
                <div
                  key={venta.id}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                >
                  <div className="pb-4">
                    <VentaCard
                      venta={venta}
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 md:gap-4">
          {ventas.map((venta) => (
            <VentaCard
              key={venta.id}
              venta={venta}
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
