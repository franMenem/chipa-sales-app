import { useState, useMemo } from 'react';
import { Layout } from '../components/layout/Layout';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Select } from '../components/ui/Select';
import { Modal } from '../components/ui/Modal';
import { DeudaForm } from '../components/forms/DeudaForm';
import { DeudaPagoForm } from '../components/forms/DeudaPagoForm';
import { DeudaCard } from '../components/lists/DeudaCard';
import { useDeudas, useDeudaPagos } from '../hooks/queries/useDeudasQueries';
import { useCreateDeuda, useUpdateDeuda, useDeleteDeuda, useCreateDeudaPago, useDeleteDeudaPago } from '../hooks/mutations/useDeudasMutations';
import { useDeudaModals } from '../hooks/domain/useDeudaModals';
import { formatCurrency } from '../utils/formatters';
import type { Deuda, DeudaFormData, DeudaPagoFormData } from '../lib/types';

const STATUS_OPTIONS = [
  { value: 'all', label: 'Todas' },
  { value: 'pendiente', label: 'Pendientes' },
  { value: 'parcial', label: 'Parciales' },
  { value: 'pagada', label: 'Pagadas' },
];

export function Deudas() {
  const [statusFilter, setStatusFilter] = useState('all');
  const {
    isDeudaModalOpen,
    isPagoModalOpen,
    editingDeuda,
    selectedDeuda,
    expandedDeudaId,
    handleAddDeuda,
    handleEditDeuda,
    handleAddPago,
    closeDeudaModal,
    closePagoModal,
    toggleExpand,
    collapseDeuda,
  } = useDeudaModals();

  const { data: deudas, isLoading, error } = useDeudas(statusFilter);
  const { data: pagos } = useDeudaPagos(expandedDeudaId ?? undefined);

  const createDeudaMutation = useCreateDeuda();
  const updateDeudaMutation = useUpdateDeuda();
  const deleteDeudaMutation = useDeleteDeuda();
  const createPagoMutation = useCreateDeudaPago();
  const deletePagoMutation = useDeleteDeudaPago();

  const totals = useMemo(() => {
    if (!deudas) return { total: 0, paid: 0, remaining: 0 };
    return deudas.reduce(
      (acc, d) => ({
        total: acc.total + d.total_amount,
        paid: acc.paid + d.paid_amount,
        remaining: acc.remaining + d.remaining_amount,
      }),
      { total: 0, paid: 0, remaining: 0 }
    );
  }, [deudas]);

  const handleDeleteDeuda = async (deuda: Deuda) => {
    if (window.confirm(`¿Eliminar la deuda "${deuda.description}"? Esto eliminará también todos sus pagos.`)) {
      await deleteDeudaMutation.mutateAsync(deuda.id);
      collapseDeuda(deuda.id);
    }
  };

  const handleDeletePago = async (pagoId: string) => {
    if (window.confirm('¿Eliminar este pago?')) {
      await deletePagoMutation.mutateAsync(pagoId);
    }
  };

  const onSubmitDeuda = async (data: DeudaFormData) => {
    try {
      if (editingDeuda) {
        await updateDeudaMutation.mutateAsync({ id: editingDeuda.id, ...data });
      } else {
        await createDeudaMutation.mutateAsync(data);
      }
      closeDeudaModal();
    } catch (err) {
      console.error(err);
    }
  };

  const onSubmitPago = async (data: DeudaPagoFormData) => {
    try {
      await createPagoMutation.mutateAsync(data);
      closePagoModal();
    } catch (err) {
      console.error(err);
    }
  };

  const handleCloseDeudaModal = () =>
    closeDeudaModal(createDeudaMutation.isPending || updateDeudaMutation.isPending);

  const handleClosePagoModal = () =>
    closePagoModal(createPagoMutation.isPending);

  return (
    <Layout title="Deudas" subtitle="Control de deudas y pagos">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center gap-2">
          <Button icon="add" size="sm" onClick={handleAddDeuda}>
            Nueva Deuda
          </Button>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          <Card className="bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-950/30 dark:to-orange-950/30 border-red-200 dark:border-red-900 !p-2 sm:!p-3 min-w-0">
            <p className="text-[10px] sm:text-xs text-red-600 dark:text-red-400 mb-0.5 truncate">Total deuda</p>
            <p className="text-sm sm:text-lg font-bold text-red-700 dark:text-red-300 truncate">
              {formatCurrency(totals.total)}
            </p>
          </Card>
          <Card className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 border-green-200 dark:border-green-900 !p-2 sm:!p-3 min-w-0">
            <p className="text-[10px] sm:text-xs text-green-600 dark:text-green-400 mb-0.5 truncate">Pagado</p>
            <p className="text-sm sm:text-lg font-bold text-green-700 dark:text-green-300 truncate">
              {formatCurrency(totals.paid)}
            </p>
          </Card>
          <Card className="bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-950/30 dark:to-yellow-950/30 border-amber-200 dark:border-amber-900 !p-2 sm:!p-3 min-w-0">
            <p className="text-[10px] sm:text-xs text-amber-600 dark:text-amber-400 mb-0.5 truncate">Restante</p>
            <p className="text-sm sm:text-lg font-bold text-amber-700 dark:text-amber-300 truncate">
              {formatCurrency(totals.remaining)}
            </p>
          </Card>
        </div>

        {/* Filter */}
        <Select
          label="Estado"
          options={STATUS_OPTIONS}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        />

        {/* Content */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent mb-4" />
            <p className="text-slate-700 dark:text-slate-300">Cargando deudas...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-12">
            <span className="material-symbols-outlined text-red-500 text-6xl mb-4">error</span>
            <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300 mb-2">
              Error al cargar deudas
            </h3>
            <p className="text-slate-700 dark:text-slate-300 text-center">
              {error instanceof Error ? error.message : 'Ocurrió un error inesperado'}
            </p>
          </div>
        ) : !deudas || deudas.length === 0 ? (
          <div className="text-center py-12">
            <span className="material-symbols-outlined text-slate-300 dark:text-slate-700 text-6xl mb-4">
              credit_card_off
            </span>
            <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300 mb-2">
              No hay deudas registradas
            </h3>
            <p className="text-slate-700 dark:text-slate-300">
              Agrega tu primera deuda para comenzar
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {deudas.map((deuda) => (
              <DeudaCard
                key={deuda.id}
                deuda={deuda}
                isExpanded={expandedDeudaId === deuda.id}
                pagos={expandedDeudaId === deuda.id ? pagos : undefined}
                isDeletePending={deleteDeudaMutation.isPending || deletePagoMutation.isPending}
                onAddPago={handleAddPago}
                onEdit={handleEditDeuda}
                onDelete={handleDeleteDeuda}
                onDeletePago={handleDeletePago}
                onToggleExpand={toggleExpand}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modal: Create/Edit Deuda */}
      <Modal
        isOpen={isDeudaModalOpen}
        onClose={handleCloseDeudaModal}
        title={editingDeuda ? 'Editar Deuda' : 'Nueva Deuda'}
        size="md"
        footer={
          <>
            <Button
              variant="ghost"
              onClick={handleCloseDeudaModal}
              disabled={createDeudaMutation.isPending || updateDeudaMutation.isPending}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              form="deuda-form"
              disabled={createDeudaMutation.isPending || updateDeudaMutation.isPending}
              icon={editingDeuda ? 'save' : 'add'}
            >
              {createDeudaMutation.isPending || updateDeudaMutation.isPending
                ? 'Guardando...'
                : editingDeuda
                ? 'Guardar'
                : 'Agregar'}
            </Button>
          </>
        }
      >
        <DeudaForm
          formId="deuda-form"
          onSubmit={onSubmitDeuda}
          defaultValues={
            editingDeuda
              ? {
                  description: editingDeuda.description,
                  creditor_name: editingDeuda.creditor_name,
                  total_amount: editingDeuda.total_amount,
                  due_date: editingDeuda.due_date || '',
                  notes: editingDeuda.notes || '',
                }
              : undefined
          }
        />
      </Modal>

      {/* Modal: Add Pago */}
      <Modal
        isOpen={isPagoModalOpen}
        onClose={handleClosePagoModal}
        title={`Pagar: ${selectedDeuda?.description || ''}`}
        size="md"
        footer={
          <>
            <Button
              variant="ghost"
              onClick={handleClosePagoModal}
              disabled={createPagoMutation.isPending}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              form="deuda-pago-form"
              disabled={createPagoMutation.isPending}
              icon="payments"
            >
              {createPagoMutation.isPending ? 'Registrando...' : 'Registrar Pago'}
            </Button>
          </>
        }
      >
        {selectedDeuda && (
          <DeudaPagoForm
            formId="deuda-pago-form"
            deudaId={selectedDeuda.id}
            maxAmount={selectedDeuda.remaining_amount}
            onSubmit={onSubmitPago}
          />
        )}
      </Modal>
    </Layout>
  );
}
