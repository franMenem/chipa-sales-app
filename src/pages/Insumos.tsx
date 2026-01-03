import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/layout/Layout';
import { Button } from '../components/ui/Button';
import { AddInsumoBatchForm } from '../components/forms/AddInsumoBatchForm';
import { InsumosList } from '../components/lists/InsumosList';
import { useAllInsumoLotes } from '../hooks/useInsumoLotes';

export function Insumos() {
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedInsumoId, setSelectedInsumoId] = useState<string | undefined>(undefined);
  const { data: lotes, isLoading, error } = useAllInsumoLotes();

  const handleAddBatch = (insumoId?: string) => {
    setSelectedInsumoId(insumoId);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedInsumoId(undefined);
  };

  return (
    <Layout
      title="Insumos"
      subtitle="Ingredientes - LIFO"
      headerAction={
        <div className="flex gap-1.5 sm:gap-2">
          <Button
            variant="ghost"
            icon="receipt_long"
            size="sm"
            onClick={() => navigate('/insumos/historial')}
            aria-label="Historial"
          >
            <span className="hidden sm:inline">Historial</span>
          </Button>
          <Button
            icon="add_shopping_cart"
            size="sm"
            onClick={() => handleAddBatch()}
            aria-label="Registrar Compra"
          >
            <span className="hidden sm:inline">Registrar Compra</span>
          </Button>
        </div>
      }
    >
      <div className="p-4">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent mb-4" />
            <p className="text-slate-700 dark:text-slate-300">Cargando lotes...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-12">
            <span className="material-symbols-outlined text-red-500 text-6xl mb-4">
              error
            </span>
            <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300 mb-2">
              Error al cargar lotes
            </h3>
            <p className="text-slate-700 dark:text-slate-300 text-center">
              {error instanceof Error ? error.message : 'Ocurrió un error inesperado'}
            </p>
          </div>
        ) : (
          <InsumosList lotes={lotes || []} onAddBatch={handleAddBatch} />
        )}
      </div>

      <AddInsumoBatchForm
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        preselectedInsumoId={selectedInsumoId}
      />
    </Layout>
  );
}
