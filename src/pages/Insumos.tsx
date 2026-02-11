import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/layout/Layout';
import { Button } from '../components/ui/Button';
import { AddInsumoBatchForm } from '../components/forms/AddInsumoBatchForm';
import { InsumosList } from '../components/lists/InsumosList';
import { useAllInsumoLotes } from '../hooks/useInsumoLotes';
import type { Insumo, InsumoLote } from '../lib/types';

type LoteWithInsumo = InsumoLote & { insumo: Insumo };

export function Insumos() {
  const navigate = useNavigate();
  const [isAddBatchModalOpen, setIsAddBatchModalOpen] = useState(false);
  const [selectedInsumoId, setSelectedInsumoId] = useState<string | undefined>(undefined);
  const [loteToEdit, setLoteToEdit] = useState<LoteWithInsumo | null>(null);
  const { data: lotes, isLoading, error } = useAllInsumoLotes();

  const handleAddBatch = (insumoId?: string) => {
    setLoteToEdit(null);
    setSelectedInsumoId(insumoId);
    setIsAddBatchModalOpen(true);
  };

  const handleEditLote = (lote: LoteWithInsumo) => {
    setLoteToEdit(lote);
    setSelectedInsumoId(lote.insumo_id);
    setIsAddBatchModalOpen(true);
  };

  const handleCloseAddBatchModal = () => {
    setIsAddBatchModalOpen(false);
    setSelectedInsumoId(undefined);
    setLoteToEdit(null);
  };

  return (
    <Layout
      title="Insumos"
      subtitle="Ingredientes - LIFO"
    >
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Button
            icon="add_shopping_cart"
            size="sm"
            onClick={() => handleAddBatch()}
          >
            Registrar Compra
          </Button>
          <Button
            variant="ghost"
            icon="receipt_long"
            size="sm"
            onClick={() => navigate('/insumos/historial')}
          >
            Historial
          </Button>
        </div>
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
          <InsumosList lotes={lotes || []} onEditLote={handleEditLote} />
        )}
      </div>

      <AddInsumoBatchForm
        isOpen={isAddBatchModalOpen}
        onClose={handleCloseAddBatchModal}
        preselectedInsumoId={selectedInsumoId}
        editingLote={loteToEdit || undefined}
      />
    </Layout>
  );
}
