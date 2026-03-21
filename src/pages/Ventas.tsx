import { useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Layout } from '../components/layout/Layout';
import { Button } from '../components/ui/Button';

import { VentaForm } from '../components/forms/VentaForm';
import { VentasList } from '../components/lists/VentasList';
import { useVentas } from '../hooks/queries/useVentasQueries';
import { queryKeys } from '../lib/queryKeys';
import type { Venta } from '../lib/types';

export function Ventas() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVenta, setEditingVenta] = useState<Venta | null>(null);
  const [filters, setFilters] = useState<{ startDate?: string; endDate?: string }>({});
  const { data: ventas, isLoading, error } = useVentas(filters);

  const handleRefresh = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.ventas.all() });
  }, [queryClient]);

  const handleAdd = () => {
    setEditingVenta(null);
    setIsModalOpen(true);
  };

  const handleEdit = (venta: Venta) => {
    setEditingVenta(venta);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingVenta(null);
  };

  return (
    <Layout
      title="Ventas"
      subtitle="Registro de ventas"
    >
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Button icon="add" size="sm" onClick={handleAdd}>
            Nueva Venta
          </Button>
          <Button variant="ghost" icon="refresh" size="sm" onClick={handleRefresh} />
        </div>
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent mb-4" />
            <p className="text-slate-700 dark:text-slate-300">Cargando ventas...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-12">
            <span className="material-symbols-outlined text-red-500 text-6xl mb-4">
              error
            </span>
            <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300 mb-2">
              Error al cargar ventas
            </h3>
            <p className="text-slate-700 dark:text-slate-300 text-center">
              {error instanceof Error ? error.message : 'Ocurrió un error inesperado'}
            </p>
          </div>
        ) : (
          <VentasList ventas={ventas || []} onFilterChange={setFilters} onEdit={handleEdit} />
        )}
      </div>

      <VentaForm isOpen={isModalOpen} onClose={handleCloseModal} editData={editingVenta || undefined} />
    </Layout>
  );
}
