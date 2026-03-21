import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import type { UnitType, Insumo, InsumoLote } from '../../lib/types';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { useAllInsumos } from '../../hooks/queries/useInsumosQueries';
import { useCreateInsumo, useUpdateInsumo } from '../../hooks/mutations/useInsumosMutations';
import { useAddInsumoBatch, useUpdateInsumoBatch } from '../../hooks/useInsumoLotes';
import { useCategorias } from '../../hooks/queries/useCategoriasQueries';
import { formatCurrency } from '../../utils/formatters';
import { useToast } from '../../hooks/useToast';

interface AddInsumoBatchFormProps {
  isOpen: boolean;
  onClose: () => void;
  preselectedInsumoId?: string;
  editingLote?: (InsumoLote & { insumo?: Insumo }) | null;
}

interface FormData {
  insumo_id: string;
  new_insumo_name?: string;
  unit_type: UnitType;
  purchase_date: string;
  quantity_purchased: number;
  price_per_unit: number;
  categoria_ids?: string[];
}

const unitOptions = [
  { value: 'kg', label: 'Kilogramos (kg)' },
  { value: 'l', label: 'Litros (l)' },
  { value: 'g', label: 'Gramos (g)' },
  { value: 'ml', label: 'Mililitros (ml)' },
  { value: 'unit', label: 'Unidades' },
];

const unitLabels: Record<UnitType, string> = {
  kg: 'kg',
  l: 'L',
  g: 'g',
  ml: 'ml',
  unit: 'ud',
};

export function AddInsumoBatchForm({ isOpen, onClose, preselectedInsumoId, editingLote }: AddInsumoBatchFormProps) {
  const { data: insumos = [] } = useAllInsumos();
  const { data: categorias = [] } = useCategorias();
  const createInsumoMutation = useCreateInsumo();
  const updateInsumoMutation = useUpdateInsumo();
  const addBatchMutation = useAddInsumoBatch();
  const updateBatchMutation = useUpdateInsumoBatch();
  const toast = useToast();

  const isEditMode = Boolean(editingLote);
  const consumedQuantity = editingLote
    ? editingLote.quantity_purchased - editingLote.quantity_remaining
    : 0;
  const editingPurchaseDate = useMemo(() => {
    if (!editingLote) return undefined;
    return new Date(editingLote.purchase_date).toISOString().split('T')[0];
  }, [editingLote]);
  const formattedConsumedQuantity = useMemo(() => {
    return consumedQuantity.toLocaleString('es-PY', {
      minimumFractionDigits: consumedQuantity % 1 === 0 ? 0 : 2,
      maximumFractionDigits: 2,
    });
  }, [consumedQuantity]);

  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [totalPrice, setTotalPrice] = useState<number>(0);
  const [selectedCategorias, setSelectedCategorias] = useState<string[]>([]);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { isSubmitting },
  } = useForm<FormData>({
    defaultValues: {
      insumo_id: preselectedInsumoId || '',
      unit_type: 'kg',
      purchase_date: new Date().toISOString().split('T')[0],
      quantity_purchased: 1,
      price_per_unit: 0,
    },
  });

  const insumoId = watch('insumo_id');
  const quantity = watch('quantity_purchased');
  const unitType = watch('unit_type');
  const pricePerUnit = watch('price_per_unit');
  const isBusy =
    isSubmitting ||
    addBatchMutation.isPending ||
    updateBatchMutation.isPending ||
    createInsumoMutation.isPending ||
    updateInsumoMutation.isPending;

  // Auto-detect unit type and load categories from selected insumo
  useEffect(() => {
    if (insumoId && insumoId !== 'new') {
      const selectedInsumo = insumos.find(i => i.id === insumoId);
      if (selectedInsumo) {
        setValue('unit_type', selectedInsumo.unit_type);
        // Load existing categories
        setSelectedCategorias(selectedInsumo.categoria_ids || []);
      }
    } else if (insumoId === 'new') {
      // Clear categories when creating new
      setSelectedCategorias([]);
    }
  }, [insumoId, insumos, setValue]);

  // Calculate price per unit when quantity or total price changes
  useEffect(() => {
    if (quantity > 0 && totalPrice > 0) {
      const calculatedPrice = totalPrice / quantity;
      setValue('price_per_unit', calculatedPrice);
    }
  }, [quantity, totalPrice, setValue]);

  // Reset form when modal opens/closes
  useEffect(() => {
    const defaultValues = {
      insumo_id: preselectedInsumoId || '',
      unit_type: 'kg' as UnitType,
      purchase_date: new Date().toISOString().split('T')[0],
      quantity_purchased: 1,
      price_per_unit: 0,
    };

    if (isOpen) {
      if (isEditMode && editingLote) {
        reset({
          insumo_id: editingLote.insumo_id,
          unit_type: editingLote.unit_type,
          purchase_date: editingPurchaseDate || defaultValues.purchase_date,
          quantity_purchased: editingLote.quantity_purchased,
          price_per_unit: editingLote.price_per_unit,
        });
        setSelectedCategorias(editingLote.insumo?.categoria_ids || []);
      } else {
        reset(defaultValues);
        setSelectedCategorias([]);
      }
      setTotalPrice(0);
      setIsCreatingNew(false);
    } else {
      reset(defaultValues);
      setTotalPrice(0);
      setIsCreatingNew(false);
      setSelectedCategorias([]);
    }
  }, [editingLote, editingPurchaseDate, isEditMode, isOpen, preselectedInsumoId, reset]);

  // Handle insumo selection change
  useEffect(() => {
    if (isEditMode) {
      setIsCreatingNew(false);
    } else {
      setIsCreatingNew(insumoId === 'new');
    }
  }, [insumoId, isEditMode]);

  const onSubmit = async (data: FormData) => {
    try {
      let finalInsumoId = data.insumo_id;

      // Si es nuevo insumo, crearlo primero
      if (isCreatingNew && data.new_insumo_name) {
        const newInsumo = await createInsumoMutation.mutateAsync({
          name: data.new_insumo_name,
          unit_type: data.unit_type,
          categoria_ids: selectedCategorias,
        });
        finalInsumoId = newInsumo.id;
      }

      if (!finalInsumoId && editingLote) {
        finalInsumoId = editingLote.insumo_id;
      }

      if (!finalInsumoId) {
        toast.error('Insumo requerido', 'Selecciona un insumo válido antes de continuar');
        return;
      }

      if (!isCreatingNew && finalInsumoId) {
        await updateInsumoMutation.mutateAsync({
          id: finalInsumoId,
          data: {
            categoria_ids: selectedCategorias,
          },
        });
      }

      if (isEditMode && editingLote) {
        const newQuantity = data.quantity_purchased;
        if (newQuantity < consumedQuantity) {
          toast.error(
            'Cantidad inválida',
            `Ya consumiste ${formattedConsumedQuantity} ${unitLabels[unitType]} de este lote. La cantidad comprada debe ser mayor o igual.`
          );
          return;
        }

        const updatedRemaining = newQuantity - consumedQuantity;

        await updateBatchMutation.mutateAsync({
          id: editingLote.id,
          data: {
            insumo_id: finalInsumoId,
            purchase_date: data.purchase_date,
            quantity_purchased: newQuantity,
            quantity_remaining: updatedRemaining,
            price_per_unit: data.price_per_unit,
            unit_type: data.unit_type,
          },
        });
      } else {
        // Agregar el lote
        await addBatchMutation.mutateAsync({
          insumo_id: finalInsumoId,
          purchase_date: data.purchase_date,
          quantity_purchased: data.quantity_purchased,
          price_per_unit: data.price_per_unit,
          unit_type: data.unit_type,
        });
      }

      onClose();
    } catch (error) {
      console.error(error);
    }
  };

  const handleClose = () => {
    if (!isBusy) {
      onClose();
    }
  };

  const editingInsumo = useMemo(() => {
    if (!editingLote) return null;
    return editingLote.insumo || insumos.find(i => i.id === editingLote.insumo_id) || null;
  }, [editingLote, insumos]);

  // Prepare insumo options
  const insumoOptions = useMemo(() => {
    if (isEditMode && editingInsumo) {
      return [
        {
          value: editingInsumo.id,
          label: editingInsumo.name,
        },
      ];
    }

    return [
      { value: '', label: 'Seleccionar insumo...' },
      ...insumos.map(i => ({
        value: i.id,
        label: `${i.name} (${i.total_stock} ${unitLabels[i.unit_type]} disponibles)`,
      })),
      { value: 'new', label: '+ Crear nuevo insumo' },
    ];
  }, [editingInsumo, insumos, isEditMode]);

  const modalTitle = isEditMode
    ? `Editar compra${editingInsumo ? ` de ${editingInsumo.name}` : ''}`
    : 'Registrar Compra de Insumo';

  const primaryButtonIcon = isEditMode ? 'save' : 'add_shopping_cart';
  const primaryButtonLabel = isBusy
    ? isEditMode
      ? 'Guardando...'
      : 'Registrando...'
    : isEditMode
    ? 'Guardar Cambios'
    : 'Registrar Compra';

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={modalTitle}
      size="md"
      footer={
        <>
          <Button variant="ghost" onClick={handleClose} disabled={isBusy}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit(onSubmit)}
            disabled={isBusy}
            icon={primaryButtonIcon}
          >
            {primaryButtonLabel}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Seleccionar insumo existente o crear nuevo */}
        <Select
          label="Insumo"
          options={insumoOptions}
          {...register('insumo_id', { required: 'Selecciona un insumo' })}
        />
        {isEditMode && editingInsumo && (
          <p className="text-xs text-slate-500 mt-1.5">
            Este lote pertenece a {editingInsumo.name}. Si necesitas moverlo a otro insumo, elimina y vuelve a registrar la compra.
          </p>
        )}

        {/* Si es nuevo insumo, mostrar campo de nombre */}
        {isCreatingNew && (
          <Input
            label="Nombre del nuevo insumo"
            placeholder="Ej: Harina de trigo"
            icon="new_label"
            {...register('new_insumo_name', {
              required: isCreatingNew ? 'Ingresa el nombre del insumo' : false
            })}
          />
        )}

        {/* Tipo de unidad (solo si es nuevo) */}
        {isCreatingNew && (
          <Select
            label="Tipo de unidad"
            options={unitOptions}
            {...register('unit_type')}
          />
        )}

        {/* Categorías */}
        {categorias.length > 0 && insumoId && insumoId !== '' && (
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
              Categorías (opcional)
            </label>
            <p className="text-xs text-slate-600 dark:text-slate-400 mb-2">
              {isCreatingNew
                ? 'Asigna una o más categorías para organizar este insumo'
                : 'Actualiza las categorías de este insumo'}
            </p>
            <div className="flex flex-wrap gap-2">
              {categorias.map((categoria) => {
                const isSelected = selectedCategorias.includes(categoria.id);
                return (
                  <button
                    key={categoria.id}
                    type="button"
                    onClick={() => {
                      if (isSelected) {
                        setSelectedCategorias(prev => prev.filter(id => id !== categoria.id));
                      } else {
                        setSelectedCategorias(prev => [...prev, categoria.id]);
                      }
                    }}
                    className={`flex items-center gap-2 px-3 py-2 rounded-full text-xs sm:text-sm font-medium transition-all touch-manipulation ${
                      isSelected
                        ? 'bg-primary/20 text-primary border-2 border-primary'
                        : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 border-2 border-transparent hover:border-slate-300 dark:hover:border-slate-600'
                    }`}
                  >
                    <div
                      className="w-3 h-3 flex-shrink-0 rounded-full"
                      style={{ backgroundColor: categoria.color }}
                    />
                    <span className="truncate">{categoria.name}</span>
                    {isSelected && (
                      <span className="material-symbols-outlined text-[16px] flex-shrink-0">check</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Fecha de compra */}
        <Input
          label="Fecha de compra"
          type="date"
          icon="calendar_today"
          {...register('purchase_date', { required: 'Ingresa la fecha de compra' })}
        />

        {/* Cantidad comprada */}
        <Input
          label={`Cantidad comprada (${unitLabels[unitType]})`}
          type="number"
          step="0.01"
          min="0.01"
          placeholder="Ej: 5"
          icon="scale"
          helperText={`¿Cuántos ${unitLabels[unitType]} compraste?`}
          {...register('quantity_purchased', {
            valueAsNumber: true,
            required: 'Ingresa la cantidad',
            min: { value: 0.01, message: 'Debe ser mayor a 0' }
          })}
        />
        {isEditMode && consumedQuantity > 0 && (
          <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-lg p-3 text-xs text-amber-700 dark:text-amber-300">
            Ya consumiste {formattedConsumedQuantity} {unitLabels[unitType]} de este lote. La cantidad comprada debe ser mayor o igual a ese valor.
          </div>
        )}

        {/* Calculadora de precio */}
        <div className="space-y-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-2 mb-2">
            <span className="material-symbols-outlined text-primary-600 dark:text-primary-400 text-[20px]">
              calculate
            </span>
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Calcular precio por unidad
            </p>
          </div>

          <Input
            label="Precio total de la compra"
            type="number"
            step="0.01"
            min="0"
            placeholder="0.00"
            icon="payments"
            helperText="Precio total que pagaste en pesos (ARS)"
            value={totalPrice}
            onChange={(e) => setTotalPrice(Number(e.target.value))}
          />

          {quantity > 0 && totalPrice > 0 && (
            <div className="bg-primary-50 dark:bg-primary-950/30 border border-primary-200 dark:border-primary-900 rounded-lg p-3">
              <p className="text-xs text-primary-600 dark:text-primary-400 mb-1">
                Precio calculado por {unitLabels[unitType]}:
              </p>
              <p className="text-lg font-bold text-primary-700 dark:text-primary-300">
                {formatCurrency(pricePerUnit)} / {unitLabels[unitType]}
              </p>
            </div>
          )}
        </div>

        {/* Precio directo (si no usó calculadora) */}
        {totalPrice === 0 && (
          <Input
            label={`Precio por ${unitLabels[unitType]}`}
            type="number"
            step="0.01"
            min="0.01"
            placeholder="0.00"
            icon="payments"
            helperText={`O ingresa directamente el precio en pesos (ARS) por cada ${unitLabels[unitType]}`}
            {...register('price_per_unit', {
              valueAsNumber: true,
              required: 'Ingresa el precio',
              min: { value: 0.01, message: 'Debe ser mayor a 0' }
            })}
          />
        )}

        {/* Info sobre LIFO */}
        <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 rounded-xl p-3">
          <div className="flex gap-2">
            <span className="material-symbols-outlined text-blue-600 dark:text-blue-400 text-[20px]">
              info
            </span>
            <p className="text-sm text-blue-700 dark:text-blue-300">
              Esta compra se registrará como un lote independiente. El sistema usará los lotes más recientes primero (LIFO) al fabricar productos.
            </p>
          </div>
        </div>
      </form>
    </Modal>
  );
}
