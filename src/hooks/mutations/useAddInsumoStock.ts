import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { useToast } from '../useToast';
import { invalidateInventoryRelated } from '../../utils/cacheInvalidation';
import type { InsumoWithStock } from '../../lib/types';

interface AddInsumoStockItem {
  insumo: InsumoWithStock;
  quantityInBaseUnits: number;
}

interface AddInsumoStockInput {
  items: AddInsumoStockItem[];
  productoName: string;
  quantity: number;
}

export function useAddInsumoStock() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: async ({ items }: AddInsumoStockInput) => {
      for (const { insumo, quantityInBaseUnits } of items) {
        let newQuantity = insumo.total_stock;
        if (insumo.unit_type === 'kg' || insumo.unit_type === 'l') {
          newQuantity = insumo.total_stock + (quantityInBaseUnits / 1000);
        } else {
          newQuantity = insumo.total_stock + quantityInBaseUnits;
        }

        const { error } = await supabase
          .from('insumos')
          .update({ quantity: newQuantity })
          .eq('id', insumo.id);

        if (error) throw error;
      }
    },
    onSuccess: (_, { productoName, quantity }) => {
      invalidateInventoryRelated(queryClient);
      toast.success(
        'Stock agregado',
        `Se agregaron ${quantity} unidades de ${productoName}`
      );
    },
    onError: () => {
      toast.error('Error', 'No se pudo agregar el stock');
    },
  });
}
