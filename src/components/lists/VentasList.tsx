import { useState, useCallback, useMemo, memo } from 'react';
import type { Venta } from '../../lib/types';
import { formatCurrency, formatDayMonthYear } from '../../utils/formatters';
import { getDateRangeForFilter } from '../../utils/dates';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Select } from '../ui/Select';
import { Input } from '../ui/Input';
import { useDeleteVenta } from '../../hooks/mutations/useVentasMutations';

interface VentasListProps {
  ventas: Venta[];
  onFilterChange?: (filters: { startDate?: string; endDate?: string }) => void;
  onEdit?: (venta: Venta) => void;
}

type SortKey = 'date' | 'price' | 'profit' | 'product' | 'quantity' | 'status' | 'delivery';
type SortDirection = 'asc' | 'desc';

// Memoized VentaRow component for better performance
interface VentaRowProps {
  venta: Venta;
  onEdit?: (venta: Venta) => void;
  onDelete: (id: string, productoName: string) => void;
  isDeleting: boolean;
  isSelected: boolean;
  onRowClick: () => void;
}

const VentaRow = memo(({ venta, onEdit, onDelete, isDeleting, isSelected, onRowClick }: VentaRowProps) => {
  return (
    <>
      <tr
        onClick={onRowClick}
        className={`border-b border-slate-100 dark:border-slate-800 cursor-pointer transition-colors ${
          isSelected
            ? 'bg-primary/5 dark:bg-primary/10 border-primary/20'
            : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
        }`}
        style={{ touchAction: 'manipulation' }}
      >
        <td className="py-3 px-2 text-slate-600 dark:text-slate-400">
          <div className="font-medium">{formatDayMonthYear(venta.sale_date).dayMonth}</div>
          <div className="text-xs text-slate-400">{formatDayMonthYear(venta.sale_date).year}</div>
        </td>
        <td className="py-3 px-2 font-medium text-slate-900 dark:text-white">
          {venta.producto_name}
          {venta.customer_name && (
            <div className="text-xs text-slate-600 dark:text-slate-400">
              {venta.customer_name}
            </div>
          )}
        </td>
        <td className="py-3 px-2 text-right text-slate-600 dark:text-slate-400">
          {venta.quantity}
        </td>
        <td className="py-3 px-2 text-right text-slate-600 dark:text-slate-400">
          {formatCurrency(venta.price_sold)}
        </td>
        <td className="py-3 px-2 text-right font-semibold text-green-600 dark:text-green-400">
          {formatCurrency(venta.profit)}
        </td>
        <td className={`py-3 px-2 text-center ${
          venta.payment_status === 'pagado'
            ? 'text-green-600 dark:text-green-400'
            : 'text-yellow-600 dark:text-yellow-400'
        }`}>
          <span
            className="material-symbols-outlined text-[20px]"
            title={venta.payment_status === 'pagado' ? 'Pagado' : 'Debe'}
          >
            {venta.payment_status === 'pagado' ? 'check_circle' : 'schedule'}
          </span>
        </td>
        <td className={`py-3 px-2 text-center ${
          venta.delivery_status === 'entregado'
            ? 'text-green-600 dark:text-green-400'
            : 'text-yellow-600 dark:text-yellow-400'
        }`}>
          <span
            className="material-symbols-outlined text-[20px]"
            title={venta.delivery_status === 'entregado' ? 'Entregado' : 'Pendiente'}
          >
            {venta.delivery_status === 'entregado' ? 'local_shipping' : 'hourglass_empty'}
          </span>
        </td>
      </tr>
      {isSelected && (
        <tr className="border-b border-slate-100 dark:border-slate-800 bg-primary/5 dark:bg-primary/10">
          <td colSpan={7} className="px-3 py-2">
            <div className="flex items-center justify-end gap-2">
              {onEdit && (
                <Button
                  variant="ghost"
                  size="sm"
                  icon="edit"
                  onClick={(e) => { e.stopPropagation(); onEdit(venta); }}
                  aria-label="Editar venta"
                >
                  Editar
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                icon="delete"
                onClick={(e) => { e.stopPropagation(); onDelete(venta.id, venta.producto_name); }}
                disabled={isDeleting}
                className="text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30"
                aria-label="Eliminar venta"
              >
                Eliminar
              </Button>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}, (prev, next) => {
  return prev.venta.id === next.venta.id &&
         prev.venta.quantity === next.venta.quantity &&
         prev.venta.price_sold === next.venta.price_sold &&
         prev.venta.profit === next.venta.profit &&
         prev.venta.payment_status === next.venta.payment_status &&
         prev.venta.delivery_status === next.venta.delivery_status &&
         prev.isDeleting === next.isDeleting &&
         prev.isSelected === next.isSelected;
});

export function VentasList({ ventas, onFilterChange, onEdit }: VentasListProps) {
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month' | 'custom'>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [selectedVentaId, setSelectedVentaId] = useState<string | null>(null);
  const deleteMutation = useDeleteVenta();

  const handleRowClick = useCallback((id: string) => {
    setSelectedVentaId(prev => prev === id ? null : id);
  }, []);

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

  const handleSort = useCallback((key: SortKey) => {
    if (key === sortKey) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setSortKey(key);
    setSortDirection('desc');
  }, [sortKey]);

  // Memoized sorting to prevent unnecessary recalculations
  const sortedVentas = useMemo(() => {
    return [...ventas].sort((a, b) => {
      const direction = sortDirection === 'asc' ? 1 : -1;
      switch (sortKey) {
        case 'date':
          return (new Date(a.sale_date).getTime() - new Date(b.sale_date).getTime()) * direction;
        case 'price':
          return (a.price_sold - b.price_sold) * direction;
        case 'profit':
          return (a.profit - b.profit) * direction;
        case 'product':
          return a.producto_name.localeCompare(b.producto_name) * direction;
        case 'quantity':
          return (a.quantity - b.quantity) * direction;
        case 'status':
          return a.payment_status.localeCompare(b.payment_status) * direction;
        case 'delivery':
          return a.delivery_status.localeCompare(b.delivery_status) * direction;
        default:
          return 0;
      }
    });
  }, [ventas, sortKey, sortDirection]);

  // Memoized totals calculation
  const totals = useMemo(() => ({
    income: ventas.reduce((sum, v) => sum + v.total_income, 0),
    profit: ventas.reduce((sum, v) => sum + v.profit, 0),
    cost: ventas.reduce((sum, v) => sum + v.total_cost, 0),
  }), [ventas]);

  const renderSortLabel = (label: string, key: SortKey) => (
    <button
      type="button"
      onClick={() => handleSort(key)}
      className="inline-flex items-center gap-1 text-xs font-semibold text-slate-700 dark:text-slate-300"
    >
      {label}
      {sortKey === key && (
        <span className="material-symbols-outlined text-[14px]">
          {sortDirection === 'asc' ? 'arrow_upward' : 'arrow_downward'}
        </span>
      )}
    </button>
  );

  if (ventas.length === 0) {
    return (
      <div className="space-y-4">
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
            <div className="sm:col-span-2">
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
      <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {dateFilter !== 'all' && `Mostrando ${ventas.length} ${ventas.length === 1 ? 'venta' : 'ventas'} para el filtro seleccionado`}
      </div>

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

      <div className="flex items-center gap-2 sm:gap-4 flex-wrap bg-slate-50 dark:bg-slate-800/50 rounded-lg px-3 sm:px-4 py-2.5 border border-slate-200 dark:border-slate-700 text-sm">
        <div className="flex items-center gap-1.5">
          <span className="text-blue-600 dark:text-blue-400 font-medium">Ingresos:</span>
          <span className="font-bold text-blue-700 dark:text-blue-300">{formatCurrency(totals.income)}</span>
        </div>
        <div className="w-px h-4 bg-slate-300 dark:bg-slate-600 hidden sm:block" />
        <div className="flex items-center gap-1.5">
          <span className="text-red-600 dark:text-red-400 font-medium">Costos:</span>
          <span className="font-bold text-red-700 dark:text-red-300">{formatCurrency(totals.cost)}</span>
        </div>
        <div className="w-px h-4 bg-slate-300 dark:bg-slate-600 hidden sm:block" />
        <div className="flex items-center gap-1.5">
          <span className="text-green-600 dark:text-green-400 font-medium">Ganancia:</span>
          <span className="font-bold text-green-700 dark:text-green-300">{formatCurrency(totals.profit)}</span>
        </div>
      </div>

      {/* Mobile: card layout */}
      <div className="space-y-2 sm:hidden">
        {sortedVentas.map((venta) => {
          const isSelected = selectedVentaId === venta.id;
          return (
            <Card
              key={venta.id}
              onClick={() => handleRowClick(venta.id)}
              className={`cursor-pointer transition-colors ${isSelected ? 'ring-1 ring-primary/30' : ''}`}
            >
              <div className="space-y-2" style={{ touchAction: 'manipulation' }}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                      {venta.producto_name}
                    </p>
                    {venta.customer_name && (
                      <p className="text-xs text-slate-500 dark:text-slate-400">{venta.customer_name}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full ${
                      venta.payment_status === 'pagado'
                        ? 'bg-green-100 dark:bg-green-950/50 text-green-700 dark:text-green-400'
                        : 'bg-yellow-100 dark:bg-yellow-950/50 text-yellow-700 dark:text-yellow-400'
                    }`}>
                      <span className="material-symbols-outlined text-[15px]">
                        {venta.payment_status === 'pagado' ? 'check_circle' : 'schedule'}
                      </span>
                    </span>
                    <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full ${
                      venta.delivery_status === 'entregado'
                        ? 'bg-green-100 dark:bg-green-950/50 text-green-700 dark:text-green-400'
                        : 'bg-yellow-100 dark:bg-yellow-950/50 text-yellow-700 dark:text-yellow-400'
                    }`}>
                      <span className="material-symbols-outlined text-[15px]">
                        {venta.delivery_status === 'entregado' ? 'local_shipping' : 'hourglass_empty'}
                      </span>
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                    <span>
                      {formatDayMonthYear(venta.sale_date).dayMonth}
                      <span className="text-slate-400 ml-1">{formatDayMonthYear(venta.sale_date).year}</span>
                    </span>
                    <span>x{venta.quantity}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">{formatCurrency(venta.price_sold)}</p>
                    <p className="text-xs font-medium text-green-600 dark:text-green-400">+{formatCurrency(venta.profit)}</p>
                  </div>
                </div>
                {isSelected && (
                  <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-100 dark:border-slate-800">
                    {onEdit && (
                      <Button
                        variant="ghost" size="sm" icon="edit"
                        onClick={(e) => { e.stopPropagation(); onEdit(venta); }}
                        aria-label="Editar venta"
                      >
                        Editar
                      </Button>
                    )}
                    <Button
                      variant="ghost" size="sm" icon="delete"
                      onClick={(e) => { e.stopPropagation(); handleDelete(venta.id, venta.producto_name); }}
                      disabled={deleteMutation.isPending}
                      className="text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30"
                      aria-label="Eliminar venta"
                    >
                      Eliminar
                    </Button>
                  </div>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      {/* Desktop: table layout */}
      <Card className="hidden sm:block">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800">
                <th className="text-left py-3 px-2">{renderSortLabel('Fecha', 'date')}</th>
                <th className="text-left py-3 px-2">{renderSortLabel('Producto', 'product')}</th>
                <th className="text-right py-3 px-2">{renderSortLabel('Cantidad', 'quantity')}</th>
                <th className="text-right py-3 px-2">{renderSortLabel('Precio', 'price')}</th>
                <th className="text-right py-3 px-2">{renderSortLabel('Ganancia', 'profit')}</th>
                <th className="text-left py-3 px-2">{renderSortLabel('Pago', 'status')}</th>
                <th className="text-left py-3 px-2">{renderSortLabel('Entrega', 'delivery')}</th>
              </tr>
            </thead>
            <tbody>
              {sortedVentas.map((venta) => (
                <VentaRow
                  key={venta.id}
                  venta={venta}
                  onEdit={onEdit}
                  onDelete={handleDelete}
                  isDeleting={deleteMutation.isPending}
                  isSelected={selectedVentaId === venta.id}
                  onRowClick={() => handleRowClick(venta.id)}
                />
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
