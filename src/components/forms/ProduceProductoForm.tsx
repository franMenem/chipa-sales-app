import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { useProductos } from '../../hooks/useProductos';
import { useProduceProducto } from '../../hooks/useProduction';
import { formatCurrency } from '../../utils/formatters';

interface ProduceProductoFormProps {
  isOpen: boolean;
  onClose: () => void;
  preselectedProductoId?: string;
}

interface FormData {
  producto_id: string;
  quantity: number;
}

export function ProduceProductoForm({ isOpen, onClose, preselectedProductoId }: ProduceProductoFormProps) {
  const { data: productos = [] } = useProductos();
  const produceMutation = useProduceProducto();

  const [selectedProducto, setSelectedProducto] = useState<any>(null);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { isSubmitting },
  } = useForm<FormData>({
    defaultValues: {
      producto_id: preselectedProductoId || '',
      quantity: 1,
    },
  });

  const productoId = watch('producto_id');
  const quantity = watch('quantity');

  // Update selected producto when selection changes
  useEffect(() => {
    if (productoId) {
      const producto = productos.find(p => p.id === productoId);
      setSelectedProducto(producto || null);
    } else {
      setSelectedProducto(null);
    }
  }, [productoId, productos]);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      reset({
        producto_id: preselectedProductoId || '',
        quantity: 1,
      });
      setSelectedProducto(null);
    }
  }, [isOpen, preselectedProductoId, reset]);

  const onSubmit = async (data: FormData) => {
    try {
      await produceMutation.mutateAsync({
        producto_id: data.producto_id,
        quantity: data.quantity,
      });
      onClose();
    } catch (error) {
      console.error(error);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      onClose();
    }
  };

  // Prepare producto options
  const productoOptions = [
    { value: '', label: 'Seleccionar producto...' },
    ...productos.map(p => ({
      value: p.id,
      label: `${p.name} (Stock: ${p.finished_stock} unidades)`,
    })),
  ];

  // Calculate estimated cost
  const estimatedTotalCost = selectedProducto && quantity > 0
    ? selectedProducto.cost_unit * quantity
    : 0;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Fabricar Productos"
      size="md"
      footer={
        <>
          <Button variant="ghost" onClick={handleClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit(onSubmit)}
            disabled={isSubmitting || !selectedProducto?.has_sufficient_ingredients}
            icon="manufacturing"
          >
            {isSubmitting ? 'Fabricando...' : 'Fabricar'}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Seleccionar producto */}
        <Select
          label="Producto a fabricar"
          options={productoOptions}
          {...register('producto_id', { required: 'Selecciona un producto' })}
        />

        {/* Cantidad a fabricar */}
        <Input
          label="Cantidad a fabricar"
          type="number"
          step="1"
          min="1"
          placeholder="1"
          icon="production_quantity_limits"
          helperText="¿Cuántas unidades quieres fabricar?"
          {...register('quantity', {
            valueAsNumber: true,
            required: 'Ingresa la cantidad',
            min: { value: 1, message: 'Debe ser al menos 1' }
          })}
        />

        {/* Información del producto seleccionado */}
        {selectedProducto && (
          <div className="space-y-3">
            {/* Stock actual */}
            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-slate-600 dark:text-slate-400 text-[20px]">
                    inventory
                  </span>
                  <span className="text-sm text-slate-600 dark:text-slate-400">
                    Stock actual:
                  </span>
                </div>
                <span className="font-semibold text-slate-900 dark:text-white">
                  {selectedProducto.finished_stock} unidades
                </span>
              </div>
            </div>

            {/* Costo estimado */}
            <div className="bg-primary-50 dark:bg-primary-950/30 rounded-xl p-4 border border-primary-200 dark:border-primary-900">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-primary-600 dark:text-primary-400">
                    Costo por unidad:
                  </span>
                  <span className="font-semibold text-primary-700 dark:text-primary-300">
                    {formatCurrency(selectedProducto.cost_unit)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-primary-600 dark:text-primary-400">
                    Costo total estimado:
                  </span>
                  <span className="text-lg font-bold text-primary-700 dark:text-primary-300">
                    {formatCurrency(estimatedTotalCost)}
                  </span>
                </div>
              </div>
            </div>

            {/* Estado de ingredientes */}
            {!selectedProducto.has_sufficient_ingredients ? (
              <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-xl p-3">
                <div className="flex gap-2">
                  <span className="material-symbols-outlined text-red-600 dark:text-red-400 text-[20px]">
                    error
                  </span>
                  <div>
                    <p className="text-sm font-medium text-red-700 dark:text-red-300 mb-1">
                      Stock insuficiente de ingredientes
                    </p>
                    <p className="text-xs text-red-600 dark:text-red-400">
                      No hay suficientes insumos para fabricar este producto. Registra una compra de los insumos faltantes.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900 rounded-xl p-3">
                <div className="flex gap-2">
                  <span className="material-symbols-outlined text-green-600 dark:text-green-400 text-[20px]">
                    check_circle
                  </span>
                  <p className="text-sm text-green-700 dark:text-green-300">
                    Todos los ingredientes están disponibles
                  </p>
                </div>
              </div>
            )}

            {/* Info sobre LIFO */}
            <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 rounded-xl p-3">
              <div className="flex gap-2">
                <span className="material-symbols-outlined text-blue-600 dark:text-blue-400 text-[20px]">
                  info
                </span>
                <div className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
                  <p>Al fabricar productos:</p>
                  <ul className="list-disc list-inside space-y-0.5 text-xs ml-1">
                    <li>Se consumirán los lotes más recientes primero (LIFO)</li>
                    <li>Se aumentará el stock de productos terminados</li>
                    <li>Se registrará el costo de producción</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}
      </form>
    </Modal>
  );
}
