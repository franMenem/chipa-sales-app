import { useState } from 'react';
import { useProduceProductoCustomOrder, useReverseProduction } from './useProduction';
import { useToast } from './useToast';
import { canQuickProduce, buildAutoLIFOSelections, calculatePriceWithMargin } from '../utils/productionHelpers';
import type { ProductoWithCost } from '../lib/types';

/**
 * Hook para fabricación automática rápida de 1 unidad
 *
 * Flujo:
 * 1. Valida que el producto puede fabricarse automáticamente
 * 2. Construye selecciones de lotes LIFO
 * 3. Calcula precio con 30% de margen
 * 4. Fabrica 1 unidad
 * 5. Si falla en cualquier paso, retorna shouldOpenForm=true para abrir ProduceProductoForm
 */
export function useQuickProduce() {
  const produceMutation = useProduceProductoCustomOrder();
  const reverseMutation = useReverseProduction();
  const toast = useToast();
  const [isProducing, setIsProducing] = useState(false);
  const [lastProductionHistoryId, setLastProductionHistoryId] = useState<string | null>(null);

  const quickProduce = async (
    producto: ProductoWithCost,
    onSuccess?: () => void
  ): Promise<{ shouldOpenForm: boolean }> => {
    setIsProducing(true);

    try {
      // 1. Validar que se puede fabricar automáticamente
      const validation = await canQuickProduce(producto.id);

      if (!validation.canProduce) {
        toast.warning(
          'Fabricación manual requerida',
          validation.reason || 'Este producto requiere selección manual de ingredientes'
        );
        return { shouldOpenForm: true };
      }

      // 2. Construir selecciones LIFO automáticamente
      const selections = await buildAutoLIFOSelections(producto.id, 1);

      if (!selections.success) {
        toast.error(
          'No se pudo calcular lotes',
          selections.error || 'Intenta usar el formulario completo'
        );
        return { shouldOpenForm: true };
      }

      // 3. Calcular precio con 30% de margen
      const marginPercentage = 30;
      const priceWithMargin = calculatePriceWithMargin(selections.costPerUnit!, marginPercentage);

      if (priceWithMargin <= 0) {
        toast.error('Error al calcular precio', 'El costo por unidad es inválido');
        return { shouldOpenForm: true };
      }

      // 4. Fabricar producto
      const result = await produceMutation.mutateAsync({
        producto_id: producto.id,
        quantity: 1,
        margin_percentage: marginPercentage,
        price_sale: priceWithMargin,
        lot_selections: selections.lotSelections!,
      });

      // 5. Guardar production_history_id para poder deshacer
      if (result.production_history_id) {
        setLastProductionHistoryId(result.production_history_id);
      }

      // 6. Callback de éxito (si se proporcionó)
      onSuccess?.();

      return { shouldOpenForm: false };
    } catch (error) {
      console.error('Error en fabricación rápida:', error);

      // Determinar si es un error recuperable o no
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';

      if (errorMessage.includes('insufficient') || errorMessage.includes('insuficiente')) {
        toast.error('Stock insuficiente', 'Usa el formulario completo para ver detalles');
      } else {
        toast.error('Error al fabricar', 'Intenta usar el formulario completo');
      }

      return { shouldOpenForm: true };
    } finally {
      setIsProducing(false);
    }
  };

  const undoLastProduction = async () => {
    if (!lastProductionHistoryId) {
      toast.warning('No hay fabricación para deshacer', 'No se encontró la última fabricación');
      return false;
    }

    try {
      await reverseMutation.mutateAsync({
        production_history_id: lastProductionHistoryId,
        force: false,
      });
      setLastProductionHistoryId(null);
      return true;
    } catch (error) {
      console.error('Error al deshacer fabricación:', error);
      return false;
    }
  };

  return {
    quickProduce,
    isProducing,
    undoLastProduction,
    canUndo: lastProductionHistoryId !== null,
  };
}
