import { useState } from 'react';
import { Layout } from '../components/layout/Layout';
import { Button } from '../components/ui/Button';
import { VentaForm } from '../components/forms/VentaForm';
import { VentasList } from '../components/lists/VentasList';
import { useVentas } from '../hooks/useVentas';
import type { Venta } from '../lib/types';

export function Ventas() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVenta, setEditingVenta] = useState<Venta | null>(null);
  const [filters, setFilters] = useState<{ startDate?: string; endDate?: string }>({});
  const { data: ventas, isLoading, error } = useVentas(filters);

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
      headerAction={
        <Button icon="add" size="sm" onClick={handleAdd}>
          Agregar
        </Button>
      }
    >
      <div className="p-4">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent mb-4" />
            <p className="text-slate-500 dark:text-slate-400">Cargando ventas...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-12">
            <span className="material-symbols-outlined text-red-500 text-6xl mb-4">
              error
            </span>
            <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300 mb-2">
              Error al cargar ventas
            </h3>
            <p className="text-slate-500 dark:text-slate-400 text-center">
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
