import { useState, useMemo, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Select } from '../ui/Select';
import { QuantityStepper } from '../ui/QuantityStepper';
import { Input } from '../ui/Input';
import { Card } from '../ui/Card';
import { useProductos } from '../../hooks/useProductos';
import { useInsumos } from '../../hooks/useInsumos';
import { useCreateVenta, useUpdateVenta } from '../../hooks/useVentas';
import { formatCurrency } from '../../utils/formatters';
import type { Venta } from '../../lib/types';

interface VentaFormProps {
  isOpen: boolean;
  onClose: () => void;
  editData?: Venta;
}

export function VentaForm({ isOpen, onClose, editData }: VentaFormProps) {
  const { data: productos = [] } = useProductos();
  const { data: insumos = [] } = useInsumos();
  const createMutation = useCreateVenta();
  const updateMutation = useUpdateVenta();

  const isEdit = !!editData;

  const [selectedProductoId, setSelectedProductoId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [customPrice, setCustomPrice] = useState<number | null>(null);
  const [saleDate, setSaleDate] = useState(
    new Date().toISOString().split('T')[0]
  );

  // Cargar datos de edición
  useEffect(() => {
    if (isOpen && editData) {
      setSelectedProductoId(editData.producto_id || '');
      setQuantity(editData.quantity);
      setCustomPrice(editData.price_sold);
      setSaleDate(new Date(editData.sale_date).toISOString().split('T')[0]);
    } else if (isOpen && !editData) {
      // Reset para nueva venta
      setSelectedProductoId('');
      setQuantity(1);
      setCustomPrice(null);
      setSaleDate(new Date().toISOString().split('T')[0]);
    }
  }, [isOpen, editData]);

  const selectedProducto = useMemo(() => {
    return productos.find((p) => p.id === selectedProductoId);
  }, [selectedProductoId, productos]);

  // Calcular stock disponible
  const availableStock = useMemo(() => {
    if (!selectedProducto) return 0;

    // Stock de productos terminados
    const finishedStock = selectedProducto.finished_stock || 0;

    // Stock que se puede hacer con insumos
    let stockFromInsumos = 0;
    if (selectedProducto.recipe_items && selectedProducto.recipe_items.length > 0) {
      const possibleUnitsPerInsumo = selectedProducto.recipe_items.map((item) => {
        const insumo = insumos.find((i) => i.id === item.insumo_id);
        if (!insumo) return 0;

        let availableInBaseUnits = insumo.quantity;
        if (insumo.unit_type === 'kg' || insumo.unit_type === 'l') {
          availableInBaseUnits = insumo.quantity * 1000;
        }

        const possibleUnits = Math.floor(availableInBaseUnits / item.quantity_in_base_units);
        return possibleUnits;
      });

      stockFromInsumos = Math.min(...possibleUnitsPerInsumo);
    }

    // Stock total = productos terminados + lo que se puede hacer con insumos
    return finishedStock + stockFromInsumos;
  }, [selectedProducto, insumos]);

  const priceToUse = customPrice ?? selectedProducto?.price_sale ?? 0;

  const calculations = useMemo(() => {
    if (!selectedProducto) {
      return {
        totalIncome: 0,
        totalCost: 0,
        profit: 0,
        profitMargin: 0,
      };
    }

    const totalIncome = quantity * priceToUse;
    const totalCost = quantity * selectedProducto.cost_unit;
    const profit = totalIncome - totalCost;
    const profitMargin = totalIncome > 0 ? (profit / totalIncome) * 100 : 0;

    return {
      totalIncome,
      totalCost,
      profit,
      profitMargin,
    };
  }, [selectedProducto, quantity, priceToUse]);

  const handleSubmit = async () => {
    if (!selectedProducto) {
      alert('Debes seleccionar un producto');
      return;
    }

    if (quantity <= 0) {
      alert('La cantidad debe ser mayor a 0');
      return;
    }

    try {
      if (isEdit && editData) {
        // Modo edición: solo actualizar cantidad y precio
        await updateMutation.mutateAsync({
          id: editData.id,
          quantity,
          price_sold: priceToUse,
        });
      } else {
        // Modo creación: validar stock y crear nueva venta
        if (quantity > availableStock) {
          alert(`Stock insuficiente. Solo hay ${availableStock} unidades disponibles.`);
          return;
        }

        if (availableStock === 0) {
          alert('No hay stock disponible de este producto. Por favor, agrega más insumos.');
          return;
        }

        await createMutation.mutateAsync({
          producto_id: selectedProducto.id,
          producto_name: selectedProducto.name,
          quantity,
          price_sold: priceToUse,
          cost_unit: selectedProducto.cost_unit, // SNAPSHOT
          sale_date: new Date(saleDate).toISOString(),
        });
      }

      // Reset form
      setSelectedProductoId('');
      setQuantity(1);
      setCustomPrice(null);
      setSaleDate(new Date().toISOString().split('T')[0]);
      onClose();
    } catch (error) {
      console.error(error);
    }
  };

  const handleClose = () => {
    if (!createMutation.isPending && !updateMutation.isPending) {
      onClose();
    }
  };

  const handleProductoChange = (productoId: string) => {
    setSelectedProductoId(productoId);
    setCustomPrice(null); // Reset custom price when changing product
  };

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={isEdit ? 'Editar Venta' : 'Registrar Venta'}
      size="md"
      footer={
        <>
          <Button
            variant="ghost"
            onClick={handleClose}
            disabled={isSubmitting}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !selectedProducto}
            icon={isEdit ? 'save' : 'add'}
          >
            {isSubmitting ? 'Guardando...' : isEdit ? 'Guardar' : 'Registrar Venta'}
          </Button>
        </>
      }
    >
      <div className="space-y-6">
        {/* Product Selection */}
        {isEdit ? (
          <Card className="bg-slate-50 dark:bg-slate-900/50">
            <div className="space-y-2">
              <p className="text-xs text-slate-500 dark:text-slate-400">Producto</p>
              <p className="font-semibold text-slate-900 dark:text-white">
                {editData?.producto_name}
              </p>
            </div>
          </Card>
        ) : (
          <Select
            label="Producto"
            options={[
              { value: '', label: 'Seleccionar producto...' },
              ...productos.map((p) => ({
                value: p.id,
                label: `${p.name} - ${formatCurrency(p.price_sale)}`,
              })),
            ]}
            value={selectedProductoId}
            onChange={(e) => handleProductoChange(e.target.value)}
          />
        )}

        {selectedProducto && (
          <>
            {/* Product Info */}
            {!isEdit && (
              <Card className="bg-slate-50 dark:bg-slate-900/50">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-600 dark:text-slate-400">
                      Precio sugerido:
                    </span>
                    <span className="font-semibold text-slate-900 dark:text-white">
                      {formatCurrency(selectedProducto.price_sale)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600 dark:text-slate-400">
                      Costo unitario:
                    </span>
                    <span className="font-semibold text-slate-900 dark:text-white">
                      {formatCurrency(selectedProducto.cost_unit)}
                    </span>
                  </div>
                </div>
              </Card>
            )}

            {/* Stock Info - Solo en modo creación */}
            {!isEdit && (
              <Card className={`${
                availableStock === 0
                  ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                  : availableStock <= 5
                  ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
                  : 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
              }`}>
                <div className="flex items-center gap-3">
                  <span className={`material-symbols-outlined text-3xl ${
                    availableStock === 0
                      ? 'text-red-500'
                      : availableStock <= 5
                      ? 'text-yellow-600'
                      : 'text-green-600'
                  }`}>
                    {availableStock === 0 ? 'error' : availableStock <= 5 ? 'warning' : 'check_circle'}
                  </span>
                  <div className="flex-1">
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-slate-700 dark:text-slate-300">
                        Stock disponible
                      </span>
                      <span className={`font-bold text-lg ${
                        availableStock === 0
                          ? 'text-red-600 dark:text-red-400'
                          : availableStock <= 5
                          ? 'text-yellow-600 dark:text-yellow-400'
                          : 'text-green-600 dark:text-green-400'
                      }`}>
                        {availableStock} unidades
                      </span>
                    </div>
                    {availableStock === 0 && (
                      <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                        No hay stock disponible. Agrega más insumos para poder vender.
                      </p>
                    )}
                    {availableStock > 0 && availableStock <= 5 && (
                      <p className="text-xs text-yellow-700 dark:text-yellow-400 mt-1">
                        Stock bajo. Considera agregar más insumos.
                      </p>
                    )}
                  </div>
                </div>
              </Card>
            )}

            {/* Quantity */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Cantidad
              </label>
              <div className="flex justify-center">
                <QuantityStepper
                  value={quantity}
                  onChange={setQuantity}
                  min={1}
                  max={isEdit ? 9999 : availableStock}
                  step={1}
                />
              </div>
              {!isEdit && quantity > availableStock && (
                <p className="text-xs text-red-600 dark:text-red-400 text-center mt-2">
                  La cantidad excede el stock disponible
                </p>
              )}
            </div>

            {/* Custom Price (Optional) */}
            <Input
              label={isEdit ? "Precio de venta" : "Precio de venta (opcional)"}
              type="number"
              step="1"
              min="0"
              placeholder={selectedProducto.price_sale.toString()}
              value={customPrice ?? ''}
              onChange={(e) => {
                const val = e.target.value;
                setCustomPrice(val === '' ? null : parseFloat(val));
              }}
              helperText={isEdit ? undefined : "Deja vacío para usar el precio sugerido"}
              icon="payments"
            />

            {/* Sale Date */}
            {!isEdit && (
              <Input
                label="Fecha de venta"
                type="date"
                value={saleDate}
                onChange={(e) => setSaleDate(e.target.value)}
                icon="calendar_today"
              />
            )}

            {/* Calculations Summary */}
            <Card className="bg-primary/5 dark:bg-primary/10 border-primary/20">
              <h3 className="font-semibold text-slate-900 dark:text-white mb-3">
                Resumen
              </h3>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600 dark:text-slate-400">
                    Ingreso total:
                  </span>
                  <span className="font-semibold text-slate-900 dark:text-white">
                    {formatCurrency(calculations.totalIncome)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600 dark:text-slate-400">
                    Costo total:
                  </span>
                  <span className="font-semibold text-slate-900 dark:text-white">
                    {formatCurrency(calculations.totalCost)}
                  </span>
                </div>
                <div className="h-px bg-slate-200 dark:bg-slate-700" />
                <div className="flex justify-between">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    Ganancia:
                  </span>
                  <span className="font-bold text-lg text-green-600 dark:text-green-400">
                    {formatCurrency(calculations.profit)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600 dark:text-slate-400">
                    Margen:
                  </span>
                  <span
                    className={`font-semibold ${
                      calculations.profitMargin < 20
                        ? 'text-red-600 dark:text-red-400'
                        : calculations.profitMargin >= 40
                        ? 'text-green-600 dark:text-green-400'
                        : 'text-yellow-600 dark:text-yellow-400'
                    }`}
                  >
                    {calculations.profitMargin.toFixed(1)}%
                  </span>
                </div>
              </div>
            </Card>
          </>
        )}
      </div>
    </Modal>
  );
}
