import { useState } from 'react';
import type { Venta } from '../../lib/types';
import { formatCurrency, formatDate, formatRelativeTime } from '../../utils/formatters';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Select } from '../ui/Select';
import { Input } from '../ui/Input';
import { useDeleteVenta } from '../../hooks/useVentas';

interface VentasListProps {
  ventas: Venta[];
  onFilterChange?: (filters: { startDate?: string; endDate?: string }) => void;
  onEdit?: (venta: Venta) => void;
}

export function VentasList({ ventas, onFilterChange, onEdit }: VentasListProps) {
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month' | 'custom'>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const deleteMutation = useDeleteVenta();

  const handleDateFilterChange = (filter: string) => {
    setDateFilter(filter as 'today' | 'week' | 'month' | 'all');

    const now = new Date();
    let start: string | undefined;
    let end: string | undefined;

    switch (filter) {
      case 'today': {
        start = new Date(now.setHours(0, 0, 0, 0)).toISOString();
        end = new Date(now.setHours(23, 59, 59, 999)).toISOString();
        break;
      }
      case 'week': {
        const weekAgo = new Date(now);
        weekAgo.setDate(weekAgo.getDate() - 7);
        start = weekAgo.toISOString();
        break;
      }
      case 'month': {
        const monthAgo = new Date(now);
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        start = monthAgo.toISOString();
        break;
      }
      case 'all':
        start = undefined;
        end = undefined;
        break;
    }

    if (filter !== 'custom') {
      onFilterChange?.({ startDate: start, endDate: end });
    }
  };

  const handleCustomDateApply = () => {
    onFilterChange?.({
      startDate: startDate ? new Date(startDate).toISOString() : undefined,
      endDate: endDate ? new Date(endDate).toISOString() : undefined,
    });
  };

  const handleDelete = async (id: string, productoName: string) => {
    if (window.confirm(`¿Estás seguro de eliminar la venta de "${productoName}"?`)) {
      await deleteMutation.mutateAsync(id);
    }
  };

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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 md:gap-4">
        {ventas.map((venta) => (
          <Card key={venta.id}>
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
                    onClick={() => handleDelete(venta.id, venta.producto_name)}
                    disabled={deleteMutation.isPending}
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
        ))}
      </div>
    </div>
  );
}
