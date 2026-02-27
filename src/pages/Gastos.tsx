import { useState, useMemo } from 'react';
import { Layout } from '../components/layout/Layout';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Modal } from '../components/ui/Modal';
import { GastoForm } from '../components/forms/GastoForm';
import { useGastoConceptos, useGastos } from '../hooks/queries/useGastosQueries';
import { useCreateGasto, useUpdateGasto, useDeleteGasto } from '../hooks/mutations/useGastosMutations';
import { formatCurrency, formatDate } from '../utils/formatters';
import { getTodayForInput, getDaysAgoForInput } from '../utils/dates';
import type { GastoWithConcepto, GastoFormData } from '../lib/types';

export function Gastos() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGasto, setEditingGasto] = useState<GastoWithConcepto | null>(null);
  const [startDate, setStartDate] = useState(getDaysAgoForInput(30));
  const [endDate, setEndDate] = useState(getTodayForInput());
  const [conceptoFilter, setConceptoFilter] = useState<string>('');

  const { data: conceptos } = useGastoConceptos();
  const { data: gastos, isLoading, error } = useGastos({
    startDate,
    endDate,
    concepto_id: conceptoFilter || undefined,
  });
  const createMutation = useCreateGasto();
  const updateMutation = useUpdateGasto();
  const deleteMutation = useDeleteGasto();

  // Calculate monthly total
  const monthlyTotal = useMemo(() => {
    if (!gastos) return 0;
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

    return gastos
      .filter(g => g.payment_date >= firstDayOfMonth && g.payment_date <= lastDayOfMonth)
      .reduce((sum, gasto) => sum + gasto.amount, 0);
  }, [gastos]);

  const conceptoOptions = useMemo(() => {
    return conceptos?.map((concepto) => ({
      value: concepto.id,
      label: concepto.name,
    })) || [];
  }, [conceptos]);

  const handleAdd = () => {
    setEditingGasto(null);
    setIsModalOpen(true);
  };

  const handleEdit = (gasto: GastoWithConcepto) => {
    setEditingGasto(gasto);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string, conceptoName: string) => {
    if (window.confirm(`¿Estás seguro de eliminar este gasto de "${conceptoName}"?`)) {
      await deleteMutation.mutateAsync(id);
    }
  };

  const onSubmit = async (data: GastoFormData) => {
    try {
      if (editingGasto) {
        await updateMutation.mutateAsync({
          id: editingGasto.id,
          ...data,
        });
      } else {
        await createMutation.mutateAsync(data);
      }
      setIsModalOpen(false);
      setEditingGasto(null);
    } catch (error) {
      console.error(error);
    }
  };

  const handleCloseModal = () => {
    if (!createMutation.isPending && !updateMutation.isPending) {
      setIsModalOpen(false);
      setEditingGasto(null);
    }
  };

  return (
    <Layout
      title="Mis Gastos"
      subtitle="Control de gastos"
    >
      <div className="space-y-4">
        {/* Header with Add Button */}
        <div className="flex items-center gap-2">
          <Button icon="add" size="sm" onClick={handleAdd}>
            Nuevo Gasto
          </Button>
        </div>

        {/* Monthly Total Summary */}
        <Card className="bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-950/30 dark:to-orange-950/30 border-red-200 dark:border-red-900">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-red-600 dark:text-red-400 mb-1">
                Total gastos este mes
              </p>
              <p className="text-2xl font-bold text-red-700 dark:text-red-300">
                {formatCurrency(monthlyTotal)}
              </p>
            </div>
            <div className="flex items-center justify-center w-14 h-14 rounded-full bg-red-100 dark:bg-red-900/50">
              <span className="material-symbols-outlined text-red-600 dark:text-red-400 text-3xl">
                receipt_long
              </span>
            </div>
          </div>
        </Card>

        {/* Filters */}
        <Card>
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
              Filtros
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
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
              <Select
                label="Concepto"
                options={[{ value: '', label: 'Todos' }, ...conceptoOptions]}
                value={conceptoFilter}
                onChange={(e) => setConceptoFilter(e.target.value)}
              />
            </div>
          </div>
        </Card>

        {/* Table */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent mb-4" />
            <p className="text-slate-700 dark:text-slate-300">Cargando gastos...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-12">
            <span className="material-symbols-outlined text-red-500 text-6xl mb-4">
              error
            </span>
            <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300 mb-2">
              Error al cargar gastos
            </h3>
            <p className="text-slate-700 dark:text-slate-300 text-center">
              {error instanceof Error ? error.message : 'Ocurrió un error inesperado'}
            </p>
          </div>
        ) : !gastos || gastos.length === 0 ? (
          <div className="text-center py-12">
            <span className="material-symbols-outlined text-slate-300 dark:text-slate-700 text-6xl mb-4">
              receipt_long
            </span>
            <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300 mb-2">
              No hay gastos registrados
            </h3>
            <p className="text-slate-700 dark:text-slate-300">
              Agrega tu primer gasto para comenzar
            </p>
          </div>
        ) : (
          <>
            {/* Mobile: card layout */}
            <div className="space-y-2 sm:hidden">
              {gastos.map((gasto) => (
                <Card key={gasto.id}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-slate-900 dark:text-white">
                          {gasto.concepto_name}
                        </p>
                        <p className="text-sm font-semibold text-red-600 dark:text-red-400 shrink-0 ml-2">
                          {formatCurrency(gasto.amount)}
                        </p>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        {formatDate(gasto.payment_date)}
                      </p>
                      {gasto.notes && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                          {gasto.notes}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-0.5 shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        icon="edit"
                        onClick={() => handleEdit(gasto)}
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        icon="delete"
                        onClick={() => handleDelete(gasto.id, gasto.concepto_name)}
                        disabled={deleteMutation.isPending}
                        className="text-red-600 dark:text-red-400"
                      />
                    </div>
                  </div>
                </Card>
              ))}
            </div>
            {/* Desktop: table layout */}
            <Card className="overflow-hidden !p-0 hidden sm:block">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                    <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">Fecha</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">Concepto</th>
                    <th className="text-right px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">Monto</th>
                    <th className="text-center px-4 py-3 font-semibold text-slate-600 dark:text-slate-300 w-24">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {gastos.map((gasto) => (
                    <tr
                      key={gasto.id}
                      className="border-b border-slate-100 dark:border-slate-700/50 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors"
                    >
                      <td className="px-4 py-3 text-slate-700 dark:text-slate-300 whitespace-nowrap">
                        {formatDate(gasto.payment_date)}
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-medium text-slate-900 dark:text-white">
                          {gasto.concepto_name}
                        </span>
                        {gasto.notes && (
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate max-w-[200px]">
                            {gasto.notes}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-red-600 dark:text-red-400 whitespace-nowrap">
                        {formatCurrency(gasto.amount)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            icon="edit"
                            onClick={() => handleEdit(gasto)}
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            icon="delete"
                            onClick={() => handleDelete(gasto.id, gasto.concepto_name)}
                            disabled={deleteMutation.isPending}
                            className="text-red-600 dark:text-red-400"
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            </Card>
          </>
        )}
      </div>

      {/* Modal Form */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={editingGasto ? 'Editar Gasto' : 'Nuevo Gasto'}
        size="md"
        footer={
          <>
            <Button
              variant="ghost"
              onClick={handleCloseModal}
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              form="gasto-form"
              disabled={createMutation.isPending || updateMutation.isPending}
              icon={editingGasto ? 'save' : 'add'}
            >
              {createMutation.isPending || updateMutation.isPending
                ? 'Guardando...'
                : editingGasto
                ? 'Guardar'
                : 'Agregar'}
            </Button>
          </>
        }
      >
        <GastoForm
          formId="gasto-form"
          onSubmit={onSubmit}
          defaultValues={
            editingGasto
              ? {
                  concepto_id: editingGasto.concepto_id,
                  amount: editingGasto.amount,
                  payment_date: editingGasto.payment_date,
                  payment_method: editingGasto.payment_method,
                  notes: editingGasto.notes || '',
                }
              : undefined
          }
          isSubmitting={createMutation.isPending || updateMutation.isPending}
        />
      </Modal>
    </Layout>
  );
}
