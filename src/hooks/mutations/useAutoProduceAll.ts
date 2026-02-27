import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { useToast } from '../useToast';

interface AutoProduceCandidate {
  productoId: string;
  productoName: string;
  quantity: number;
}

interface AutoProduceResult {
  productoName: string;
  quantity: number;
  success: boolean;
  error?: string;
}

/**
 * Fabrica el máximo posible de cada candidato usando el RPC produce_producto.
 * Ejecuta en serie para evitar race conditions en los lotes de insumos.
 */
export function useAutoProduceAll() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: async (candidates: AutoProduceCandidate[]) => {
      const results: AutoProduceResult[] = [];

      for (const candidate of candidates) {
        try {
          const { data, error } = await supabase.rpc('produce_producto', {
            p_producto_id: candidate.productoId,
            p_quantity: candidate.quantity,
          });

          const rpcSuccess = !error && data && (data as { success?: boolean }).success !== false;

          results.push({
            productoName: candidate.productoName,
            quantity: candidate.quantity,
            success: rpcSuccess,
            error: error?.message,
          });
        } catch (err) {
          results.push({
            productoName: candidate.productoName,
            quantity: candidate.quantity,
            success: false,
            error: err instanceof Error ? err.message : 'Error desconocido',
          });
        }
      }

      return results;
    },
    onSuccess: (results) => {
      queryClient.invalidateQueries({ queryKey: ['productos'], exact: false });
      queryClient.invalidateQueries({ queryKey: ['insumos'], exact: false });
      queryClient.invalidateQueries({ queryKey: ['insumo-lotes'], exact: false });
      queryClient.invalidateQueries({ queryKey: ['production-history'] });

      const successful = results.filter((r) => r.success);
      const failed = results.filter((r) => !r.success);

      if (successful.length > 0) {
        const summary = successful
          .map((r) => `${r.productoName} ×${r.quantity} kg`)
          .join(', ');
        toast.success('Auto-fabricación completada', `Fabricado: ${summary}`);
      }

      if (failed.length > 0) {
        const failSummary = failed.map((r) => r.productoName).join(', ');
        toast.error('Algunos productos fallaron', failSummary);
      }
    },
    onError: (error: Error) => {
      toast.error('Error en auto-fabricación', error.message);
    },
  });
}
