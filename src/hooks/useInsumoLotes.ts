import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { InsumoLote, AddInsumoBatchFormData, PriceHistoryPoint } from '../lib/types';
import { useToast } from './useToast';

// Fetch all lotes for a specific insumo
export function useInsumoLotes(insumo_id: string | undefined) {
  return useQuery({
    queryKey: ['insumo-lotes', insumo_id],
    queryFn: async () => {
      if (!insumo_id) throw new Error('Insumo ID is required');

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No authenticated user');

      const { data, error } = await supabase
        .from('insumo_lotes')
        .select('*')
        .eq('insumo_id', insumo_id)
        .eq('user_id', user.id)
        .order('purchase_date', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as InsumoLote[];
    },
    enabled: !!insumo_id,
  });
}

// Fetch price history for charts (all lotes, including consumed ones)
export function useInsumoPriceHistory(insumo_id: string | undefined) {
  return useQuery({
    queryKey: ['insumo-price-history', insumo_id],
    queryFn: async () => {
      if (!insumo_id) throw new Error('Insumo ID is required');

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No authenticated user');

      const { data, error } = await supabase
        .from('insumo_lotes')
        .select('purchase_date, price_per_unit, quantity_purchased')
        .eq('insumo_id', insumo_id)
        .eq('user_id', user.id)
        .order('purchase_date', { ascending: true });

      if (error) throw error;

      return (data as any[]).map(item => ({
        date: item.purchase_date,
        price_per_unit: item.price_per_unit,
        quantity_purchased: item.quantity_purchased,
      })) as PriceHistoryPoint[];
    },
    enabled: !!insumo_id,
  });
}

// Add a new lote (purchase) to an existing insumo
export function useAddInsumoBatch() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: async (input: AddInsumoBatchFormData) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No authenticated user');

      const { data, error } = await supabase
        .from('insumo_lotes')
        .insert({
          user_id: user.id,
          insumo_id: input.insumo_id,
          purchase_date: input.purchase_date,
          quantity_purchased: input.quantity_purchased,
          quantity_remaining: input.quantity_purchased, // Initially, all is remaining
          price_per_unit: input.price_per_unit,
          unit_type: input.unit_type,
        })
        .select()
        .single();

      if (error) throw error;
      return data as InsumoLote;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['insumos'] });
      queryClient.invalidateQueries({ queryKey: ['insumo-lotes', variables.insumo_id] });
      queryClient.invalidateQueries({ queryKey: ['productos'] }); // Costs may change
      toast.success('Compra registrada', 'El lote se agregó al inventario');
    },
    onError: (error: Error) => {
      toast.error('Error al registrar compra', error.message);
    },
  });
}

// Delete a lote (only if not consumed)
export function useDeleteInsumoBatch() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      // First check if the lote has been consumed
      const { data: lote } = await supabase
        .from('insumo_lotes')
        .select('quantity_purchased, quantity_remaining')
        .eq('id', id)
        .single();

      if (lote && lote.quantity_remaining < lote.quantity_purchased) {
        throw new Error('No se puede eliminar un lote que ya fue consumido parcialmente');
      }

      const { error } = await supabase
        .from('insumo_lotes')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['insumos'] });
      queryClient.invalidateQueries({ queryKey: ['insumo-lotes'] });
      queryClient.invalidateQueries({ queryKey: ['productos'] });
      toast.success('Lote eliminado', 'El lote se eliminó del inventario');
    },
    onError: (error: Error) => {
      toast.error('Error al eliminar lote', error.message);
    },
  });
}
