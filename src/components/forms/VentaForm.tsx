import { useState, useMemo } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Select } from '../ui/Select';
import { QuantityStepper } from '../ui/QuantityStepper';
import { Input } from '../ui/Input';
import { Card } from '../ui/Card';
import { useProductos } from '../../hooks/useProductos';
import { useCreateVenta } from '../../hooks/useVentas';
import { formatCurrency } from '../../utils/formatters';

interface VentaFormProps {
  isOpen: boolean;
  onClose: () => void;
}

export function VentaForm({ isOpen, onClose }: VentaFormProps) {
  const { data: productos = [] } = useProductos();
  const createMutation = useCreateVenta();

  const [selectedProductoId, setSelectedProductoId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [customPrice, setCustomPrice] = useState<number | null>(null);
  const [saleDate, setSaleDate] = useState(
    new Date().toISOString().split('T')[0]
  );

  const selectedProducto = useMemo(() => {
    return productos.find((p) => p.id === selectedProductoId);
  }, [selectedProductoId, productos]);

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
      await createMutation.mutateAsync({
        producto_id: selectedProducto.id,
        producto_name: selectedProducto.name,
        quantity,
        price_sold: priceToUse,
        cost_unit: selectedProducto.cost_unit, // SNAPSHOT
        sale_date: new Date(saleDate).toISOString(),
      });

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
    if (!createMutation.isPending) {
      onClose();
    }
  };

  const handleProductoChange = (productoId: string) => {
    setSelectedProductoId(productoId);
    setCustomPrice(null); // Reset custom price when changing product
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Registrar Venta"
      size="md"
      footer={
        <>
          <Button
            variant="ghost"
            onClick={handleClose}
            disabled={createMutation.isPending}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={createMutation.isPending || !selectedProducto}
            icon="add"
          >
            {createMutation.isPending ? 'Guardando...' : 'Registrar Venta'}
          </Button>
        </>
      }
    >
      <div className="space-y-6">
        {/* Product Selection */}
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

        {selectedProducto && (
          <>
            {/* Product Info */}
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
                  step={1}
                />
              </div>
            </div>

            {/* Custom Price (Optional) */}
            <Input
              label="Precio de venta (opcional)"
              type="number"
              step="1"
              min="0"
              placeholder={selectedProducto.price_sale.toString()}
              value={customPrice ?? ''}
              onChange={(e) => {
                const val = e.target.value;
                setCustomPrice(val === '' ? null : parseFloat(val));
              }}
              helperText="Deja vacío para usar el precio sugerido"
              icon="payments"
            />

            {/* Sale Date */}
            <Input
              label="Fecha de venta"
              type="date"
              value={saleDate}
              onChange={(e) => setSaleDate(e.target.value)}
              icon="calendar_today"
            />

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
