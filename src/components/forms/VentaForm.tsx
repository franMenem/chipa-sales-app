import { useState, useMemo, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Select } from '../ui/Select';
import { Input } from '../ui/Input';
import { Card } from '../ui/Card';
import { useProductos } from '../../hooks/queries/useProductosQueries';
import { useInsumos } from '../../hooks/queries/useInsumosQueries';
import { useStockFabricadoTotals } from '../../hooks/useStockFabricado';
import { useCreateVenta, useUpdateVenta } from '../../hooks/mutations/useVentasMutations';
import { useToast } from '../../hooks/useToast';
import { useAvailableStock } from '../../hooks/domain/useAvailableStock';
import { useProfitCalculation } from '../../hooks/domain/useProfitCalculation';
import { formatCurrency } from '../../utils/formatters';
import { getTodayForInput, isoToInputDate } from '../../utils/dates';
import type { Venta } from '../../lib/types';

interface VentaFormProps {
  isOpen: boolean;
  onClose: () => void;
  editData?: Venta;
}

export function VentaForm({ isOpen, onClose, editData }: VentaFormProps) {
  const { data: productos = [] } = useProductos();
  const { data: insumos = [] } = useInsumos();
  const { data: stockFabricadoTotals = [] } = useStockFabricadoTotals();
  const createMutation = useCreateVenta();
  const updateMutation = useUpdateVenta();
  const toast = useToast();

  const isEdit = !!editData;

  const [selectedProductoId, setSelectedProductoId] = useState('');
  const [quantity, setQuantity] = useState(1.0);
  const [customPrice, setCustomPrice] = useState<number | null>(null);
  const [saleDate, setSaleDate] = useState(getTodayForInput());
  const [customerName, setCustomerName] = useState('');
  const [paymentStatus, setPaymentStatus] = useState<'pagado' | 'debe'>('pagado');
  const [paymentDestination, setPaymentDestination] = useState('');
  const [deliveryStatus, setDeliveryStatus] = useState<'entregado' | 'no_entregado'>('entregado');

  // Cargar datos de edición
  /* eslint-disable react-hooks/set-state-in-effect -- Syncing props to local state for form reset */
  useEffect(() => {
    if (isOpen && editData) {
      setSelectedProductoId(editData.producto_id || '');
      setQuantity(editData.quantity);
      setCustomPrice(editData.price_sold);
      setSaleDate(isoToInputDate(editData.sale_date));
      setCustomerName(editData.customer_name || '');
      setPaymentStatus(editData.payment_status || 'pagado');
      setPaymentDestination(editData.payment_destination || '');
      setDeliveryStatus(editData.delivery_status || 'entregado');
    } else if (isOpen && !editData) {
      setSelectedProductoId('');
      setQuantity(1);
      setCustomPrice(null);
      setSaleDate(getTodayForInput());
      setCustomerName('');
      setPaymentStatus('pagado');
      setPaymentDestination('');
      setDeliveryStatus('entregado');
    }
  }, [isOpen, editData]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const selectedProducto = useMemo(() => {
    return productos.find((p) => p.id === selectedProductoId);
  }, [selectedProductoId, productos]);

  const stockInfo = useMemo(() => {
    if (!selectedProductoId) return undefined;
    return stockFabricadoTotals.find((entry) => entry.producto_id === selectedProductoId);
  }, [selectedProductoId, stockFabricadoTotals]);

  const suggestedCostUnit =
    stockInfo?.lifo_cost_unit ??
    stockInfo?.avg_cost_unit ??
    selectedProducto?.cost_unit ??
    0;
  const suggestedMargin =
    stockInfo?.lifo_margin_percentage ??
    stockInfo?.avg_margin_percentage ??
    null;
  const suggestedPrice =
    stockInfo?.lifo_price_sale ??
    (suggestedMargin !== null && suggestedCostUnit > 0
      ? suggestedCostUnit * (1 + suggestedMargin / 100)
      : 0);

  // Calculate available stock using custom hook
  const availableStock = useAvailableStock(selectedProducto, insumos);

  const priceToUse = customPrice ?? suggestedPrice;

  // Calculate profit metrics using custom hook
  const calculations = useProfitCalculation(quantity, priceToUse, suggestedCostUnit);

  const handleSubmit = async () => {
    if (!selectedProducto) {
      toast.error('Producto requerido', 'Debes seleccionar un producto');
      return;
    }

    if (quantity < 0.1) {
      toast.error('Cantidad inválida', 'La cantidad debe ser al menos 0.1');
      return;
    }

    if (!isEdit && priceToUse <= 0) {
      toast.error('Precio inválido', 'Ingresa un precio de venta válido');
      return;
    }

    try {
      if (isEdit && editData) {
        // Modo edición: solo actualizar cantidad y precio
        await updateMutation.mutateAsync({
          id: editData.id,
          quantity,
          price_sold: priceToUse,
          customer_name: customerName || null,
          payment_status: paymentStatus,
          payment_destination: paymentDestination || null,
          delivery_status: deliveryStatus,
        });
      } else {
        // Modo creación: validar stock y crear nueva venta
        if (quantity > availableStock) {
          toast.error(
            'Stock insuficiente',
            `Solo hay ${availableStock} unidades disponibles`
          );
          return;
        }

        if (availableStock === 0) {
          toast.error(
            'Sin stock',
            'No hay stock disponible de este producto. Por favor, agrega más insumos.'
          );
          return;
        }

        await createMutation.mutateAsync({
          producto_id: selectedProducto.id,
          producto_name: selectedProducto.name,
          quantity,
          price_sold: priceToUse,
          cost_unit: suggestedCostUnit || 0, // Snapshot from latest batch cost
          customer_name: customerName || null,
          payment_status: paymentStatus,
          payment_destination: paymentDestination || null,
          delivery_status: deliveryStatus,
          sale_date: new Date(saleDate).toISOString(),
        });
      }

      // Reset form
      setSelectedProductoId('');
      setQuantity(1);
      setCustomPrice(null);
      setSaleDate(getTodayForInput());
      setCustomerName('');
      setPaymentStatus('pagado');
      setPaymentDestination('');
      setDeliveryStatus('entregado');
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
              <p className="text-xs text-slate-700 dark:text-slate-300">Producto</p>
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
                label: `${p.name}`,
              })),
            ]}
            value={selectedProductoId}
            onChange={(e) => handleProductoChange(e.target.value)}
          />
        )}

        {selectedProducto && (
          <>
            <div className="space-y-4">
              <Input
                label="Cliente"
                type="text"
                placeholder="Nombre del cliente"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                icon="person"
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Select
                  label="Estado de pago"
                  options={[
                    { value: 'pagado', label: 'Pagado' },
                    { value: 'debe', label: 'Debe' },
                  ]}
                  value={paymentStatus}
                  onChange={(e) => setPaymentStatus(e.target.value as 'pagado' | 'debe')}
                />
                <Select
                  label="Estado de entrega"
                  options={[
                    { value: 'entregado', label: 'Entregado' },
                    { value: 'no_entregado', label: 'No entregado' },
                  ]}
                  value={deliveryStatus}
                  onChange={(e) => setDeliveryStatus(e.target.value as 'entregado' | 'no_entregado')}
                />
              </div>
              <Input
                label="Pago a"
                type="text"
                placeholder="Efectivo, transferencia, QR, etc."
                value={paymentDestination}
                onChange={(e) => setPaymentDestination(e.target.value)}
                icon="account_balance_wallet"
              />
            </div>

            {/* Product Info */}
            {!isEdit && (
              <Card className="bg-slate-50 dark:bg-slate-900/50">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-600 dark:text-slate-400">
                      Precio sugerido:
                    </span>
                    <span className="font-semibold text-slate-900 dark:text-white">
                      {formatCurrency(suggestedPrice)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600 dark:text-slate-400">
                      Costo unitario:
                    </span>
                    <span className="font-semibold text-slate-900 dark:text-white">
                      {formatCurrency(suggestedCostUnit)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600 dark:text-slate-400">
                      Margen:
                    </span>
                    <span className="font-semibold text-slate-900 dark:text-white">
                      {suggestedMargin === null ? 'N/D' : `${suggestedMargin.toFixed(1)}%`}
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
            <Input
              label="Cantidad"
              type="number"
              step="0.1"
              min="0.1"
              max={isEdit ? "9999" : availableStock.toString()}
              placeholder="1"
              value={quantity}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                setQuantity(isNaN(val) ? 0.1 : val);
              }}
              icon="production_quantity_limits"
              helperText={
                !isEdit && quantity > availableStock
                  ? "La cantidad excede el stock disponible"
                  : "Puedes usar decimales (ej: 1.5, 2.75)"
              }
            />

            {/* Custom Price (Optional) */}
            <Input
              label={isEdit ? "Precio de venta" : "Precio de venta (opcional)"}
              type="number"
              step="1"
              min="0"
              placeholder="0"
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
