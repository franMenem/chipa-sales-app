import { useState, useMemo } from 'react';
import { Layout } from '../components/layout/Layout';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Modal } from '../components/ui/Modal';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { costoFijoSchema } from '../utils/validators';
import { useCostosFijos, useCreateCostoFijo, useUpdateCostoFijo, useDeleteCostoFijo } from '../hooks/useCostosFijos';
import type { CostoFijo, Frequency } from '../lib/types';
import { formatCurrency } from '../utils/formatters';

interface CostoFijoFormData {
  name: string;
  amount: number;
  frequency: Frequency;
}

const frequencyOptions = [
  { value: 'monthly', label: 'Mensual' },
  { value: 'weekly', label: 'Semanal' },
  { value: 'annual', label: 'Anual' },
];

const frequencyLabels: Record<Frequency, string> = {
  monthly: 'Mensual',
  weekly: 'Semanal',
  annual: 'Anual',
};

export function CostosFijos() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCosto, setEditingCosto] = useState<CostoFijo | null>(null);
  const { data: costosFijos, isLoading, error } = useCostosFijos();
  const createMutation = useCreateCostoFijo();
  const updateMutation = useUpdateCostoFijo();
  const deleteMutation = useDeleteCostoFijo();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CostoFijoFormData>({
    resolver: zodResolver(costoFijoSchema),
    defaultValues: {
      name: '',
      amount: 0,
      frequency: 'monthly',
    },
  });

  // Calculate monthly equivalent
  const monthlyTotal = useMemo(() => {
    if (!costosFijos) return 0;
    return costosFijos.reduce((sum, costo) => {
      let monthlyAmount = costo.amount;
      if (costo.frequency === 'weekly') {
        monthlyAmount = costo.amount * 4.33; // Average weeks per month
      } else if (costo.frequency === 'annual') {
        monthlyAmount = costo.amount / 12;
      }
      return sum + monthlyAmount;
    }, 0);
  }, [costosFijos]);

  const handleAdd = () => {
    setEditingCosto(null);
    reset({
      name: '',
      amount: 0,
      frequency: 'monthly',
    });
    setIsModalOpen(true);
  };

  const handleEdit = (costo: CostoFijo) => {
    setEditingCosto(costo);
    reset({
      name: costo.name,
      amount: costo.amount,
      frequency: costo.frequency,
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string, name: string) => {
    if (window.confirm(`¿Estás seguro de eliminar "${name}"?`)) {
      await deleteMutation.mutateAsync(id);
    }
  };

  const onSubmit = async (data: CostoFijoFormData) => {
    try {
      if (editingCosto) {
        await updateMutation.mutateAsync({
          id: editingCosto.id,
          ...data,
        });
      } else {
        await createMutation.mutateAsync(data);
      }
      setIsModalOpen(false);
      setEditingCosto(null);
    } catch (error) {
      console.error(error);
    }
  };

  const handleCloseModal = () => {
    if (!isSubmitting) {
      setIsModalOpen(false);
      setEditingCosto(null);
    }
  };

  return (
    <Layout
      title="Costos Fijos"
      subtitle="Gestión de gastos fijos"
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
            <p className="text-slate-700 dark:text-slate-300">Cargando costos fijos...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-12">
            <span className="material-symbols-outlined text-red-500 text-6xl mb-4">
              error
            </span>
            <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300 mb-2">
              Error al cargar costos fijos
            </h3>
            <p className="text-slate-700 dark:text-slate-300 text-center">
              {error instanceof Error ? error.message : 'Ocurrió un error inesperado'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Monthly Total Summary */}
            {costosFijos && costosFijos.length > 0 && (
              <Card className="bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-950/30 dark:to-orange-950/30 border-red-200 dark:border-red-900">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-red-600 dark:text-red-400 mb-1">
                      Total mensual estimado
                    </p>
                    <p className="text-2xl font-bold text-red-700 dark:text-red-300">
                      {formatCurrency(monthlyTotal)}
                    </p>
                  </div>
                  <div className="flex items-center justify-center w-14 h-14 rounded-full bg-red-100 dark:bg-red-900/50">
                    <span className="material-symbols-outlined text-red-600 dark:text-red-400 text-3xl">
                      account_balance_wallet
                    </span>
                  </div>
                </div>
              </Card>
            )}

            {/* List */}
            {!costosFijos || costosFijos.length === 0 ? (
              <div className="text-center py-12">
                <span className="material-symbols-outlined text-slate-300 dark:text-slate-700 text-6xl mb-4">
                  account_balance_wallet
                </span>
                <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  No hay costos fijos
                </h3>
                <p className="text-slate-700 dark:text-slate-300">
                  Agrega tus gastos fijos mensuales
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {costosFijos.map((costo) => {
                  let monthlyEquivalent = costo.amount;
                  if (costo.frequency === 'weekly') {
                    monthlyEquivalent = costo.amount * 4.33;
                  } else if (costo.frequency === 'annual') {
                    monthlyEquivalent = costo.amount / 12;
                  }

                  return (
                    <Card key={costo.id}>
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-orange-100 dark:bg-orange-950/50">
                            <span className="material-symbols-outlined text-orange-600 dark:text-orange-400 text-[20px]">
                              account_balance_wallet
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-slate-900 dark:text-white truncate">
                              {costo.name}
                            </h3>
                            <div className="flex items-center gap-3 text-sm text-slate-700 dark:text-slate-300">
                              <span>
                                {formatCurrency(costo.amount)} /{' '}
                                {frequencyLabels[costo.frequency]}
                              </span>
                              {costo.frequency !== 'monthly' && (
                                <>
                                  <span className="text-xs">•</span>
                                  <span className="text-xs">
                                    ≈ {formatCurrency(monthlyEquivalent)} / mes
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <Button
                            variant="ghost"
                            size="sm"
                            icon="edit"
                            onClick={() => handleEdit(costo)}
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            icon="delete"
                            onClick={() => handleDelete(costo.id, costo.name)}
                            disabled={deleteMutation.isPending}
                            className="text-red-600 dark:text-red-400"
                          />
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal Form */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={editingCosto ? 'Editar Costo Fijo' : 'Nuevo Costo Fijo'}
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={handleCloseModal} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit(onSubmit)}
              disabled={isSubmitting}
              icon={editingCosto ? 'save' : 'add'}
            >
              {isSubmitting ? 'Guardando...' : editingCosto ? 'Guardar' : 'Agregar'}
            </Button>
          </>
        }
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            label="Nombre del gasto"
            placeholder="Ej: Alquiler, Luz, Gas"
            icon="account_balance_wallet"
            error={errors.name?.message}
            {...register('name')}
          />

          <Input
            label="Monto"
            type="number"
            step="1"
            min="0"
            placeholder="0"
            icon="payments"
            error={errors.amount?.message}
            helperText="Monto en guaraníes (₲)"
            {...register('amount', { valueAsNumber: true })}
          />

          <Select
            label="Frecuencia"
            options={frequencyOptions}
            error={errors.frequency?.message}
            {...register('frequency')}
          />
        </form>
      </Modal>
    </Layout>
  );
}
