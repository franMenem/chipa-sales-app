import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { useToast } from '../useToast';

interface AdjustFinishedStockInput {
  producto_id: string;
  producto_name: string;
  new_stock: number;
}

export function useAdjustFinishedStock() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: async ({ producto_id, new_stock }: AdjustFinishedStockInput) => {
      const { error } = await supabase
        .from('productos')
        .update({ finished_stock: new_stock })
        .eq('id', producto_id);

      if (error) throw error;
    },
    onSuccess: (_, { producto_name, new_stock }) => {
      queryClient.invalidateQueries({ queryKey: ['productos'] });
      toast.success(
        'Stock actualizado',
        `${producto_name} ahora tiene ${new_stock} unidades terminadas`
      );
    },
    onError: () => {
      toast.error('Error', 'No se pudo actualizar el stock');
    },
  });
}
