import { useState } from 'react';
import { Layout } from '../components/layout/Layout';
import { Button } from '../components/ui/Button';
import { InsumoForm } from '../components/forms/InsumoForm';
import { InsumosList } from '../components/lists/InsumosList';
import { useInsumos } from '../hooks/useInsumos';
import type { Insumo } from '../lib/types';

export function Insumos() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingInsumo, setEditingInsumo] = useState<Insumo | null>(null);
  const { data: insumos, isLoading, error } = useInsumos();

  const handleAdd = () => {
    setEditingInsumo(null);
    setIsModalOpen(true);
  };

  const handleEdit = (insumo: Insumo) => {
    setEditingInsumo(insumo);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingInsumo(null);
  };

  return (
    <Layout
      title="Insumos"
      subtitle="Gestión de ingredientes"
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
            <p className="text-slate-500 dark:text-slate-400">Cargando insumos...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-12">
            <span className="material-symbols-outlined text-red-500 text-6xl mb-4">
              error
            </span>
            <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300 mb-2">
              Error al cargar insumos
            </h3>
            <p className="text-slate-500 dark:text-slate-400 text-center">
              {error instanceof Error ? error.message : 'Ocurrió un error inesperado'}
            </p>
          </div>
        ) : (
          <InsumosList insumos={insumos || []} onEdit={handleEdit} />
        )}
      </div>

      <InsumoForm
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        editData={editingInsumo ? {
          id: editingInsumo.id,
          name: editingInsumo.name,
          price_per_unit: editingInsumo.price_per_unit,
          unit_type: editingInsumo.unit_type,
        } : undefined}
      />
    </Layout>
  );
}
