import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { Venta } from '../lib/types';
import { useToast } from './useToast';

interface CreateVentaInput {
  producto_id: string;
  producto_name: string;
  quantity: number;
  price_sold: number;
  cost_unit: number;
  sale_date?: string;
}

interface VentasFilters {
  startDate?: string;
  endDate?: string;
  producto_id?: string;
}

// Fetch all ventas for current user with optional filters
export function useVentas(filters?: VentasFilters) {
  return useQuery({
    queryKey: ['ventas', filters],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No authenticated user');

      let query = supabase
        .from('ventas')
        .select('*')
        .eq('user_id', user.id)
        .order('sale_date', { ascending: false });

      if (filters?.startDate) {
        query = query.gte('sale_date', filters.startDate);
      }
      if (filters?.endDate) {
        query = query.lte('sale_date', filters.endDate);
      }
      if (filters?.producto_id) {
        query = query.eq('producto_id', filters.producto_id);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as Venta[];
    },
  });
}

// Fetch single venta by ID
export function useVenta(id: string | undefined) {
  return useQuery({
    queryKey: ['ventas', id],
    queryFn: async () => {
      if (!id) throw new Error('ID is required');

      const { data, error } = await supabase
        .from('ventas')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data as Venta;
    },
    enabled: !!id,
  });
}

// Create venta (with cost snapshot and automatic stock deduction)
export function useCreateVenta() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: async (input: CreateVentaInput) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No authenticated user');

      // Obtener el producto para verificar finished_stock
      const { data: producto, error: productoError } = await supabase
        .from('productos')
        .select('finished_stock')
        .eq('id', input.producto_id)
        .single();

      if (productoError) throw productoError;

      let quantityToDeductFromInsumos = input.quantity;
      const finishedStock = producto.finished_stock || 0;

      // Descontar primero del stock terminado
      if (finishedStock > 0) {
        const quantityFromFinished = Math.min(finishedStock, input.quantity);
        const newFinishedStock = finishedStock - quantityFromFinished;

        // Actualizar finished_stock
        const { error: updateFinishedError } = await supabase
          .from('productos')
          .update({ finished_stock: newFinishedStock })
          .eq('id', input.producto_id);

        if (updateFinishedError) throw updateFinishedError;

        // Reducir la cantidad que necesitamos descontar de los insumos
        quantityToDeductFromInsumos -= quantityFromFinished;
      }

      // Si aún necesitamos descontar más, descontar de los insumos
      if (quantityToDeductFromInsumos > 0) {
        // Obtener la receta del producto para descontar los insumos
        const { data: recipeItems, error: recipeError } = await supabase
          .from('recipe_items')
          .select('*, insumo:insumos(*)')
          .eq('producto_id', input.producto_id);

        if (recipeError) throw recipeError;

        // Descontar insumos basado en la cantidad restante
        if (recipeItems && recipeItems.length > 0) {
          for (const item of recipeItems) {
            const insumo = item.insumo;
            if (!insumo) continue;

            // Calcular cuánto descontar
            const quantityToDeduct = item.quantity_in_base_units * quantityToDeductFromInsumos;

            // Convertir a la unidad del insumo
            let newQuantity = insumo.quantity;
            if (insumo.unit_type === 'kg' || insumo.unit_type === 'l') {
              // La receta está en unidades base (g o ml), convertir a kg o l
              newQuantity = insumo.quantity - (quantityToDeduct / 1000);
            } else {
              // Unidades directas
              newQuantity = insumo.quantity - quantityToDeduct;
            }

            // Actualizar el insumo
            const { error: updateError } = await supabase
              .from('insumos')
              .update({ quantity: Math.max(0, newQuantity) })
              .eq('id', insumo.id);

            if (updateError) throw updateError;
          }
        }
      }

      // Crear la venta
      const { data, error } = await supabase
        .from('ventas')
        .insert({
          ...input,
          user_id: user.id,
          sale_date: input.sale_date || new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      return data as Venta;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ventas'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['insumos'] });
      queryClient.invalidateQueries({ queryKey: ['productos'] });
      toast.success('Venta registrada', 'La venta se registró correctamente y el stock se actualizó');
    },
    onError: (error: Error) => {
      toast.error('Error al registrar venta', error.message);
    },
  });
}

// Delete venta
export function useDeleteVenta() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('ventas')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ventas'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success('Venta eliminada', 'La venta se eliminó correctamente');
    },
    onError: (error: Error) => {
      toast.error('Error al eliminar venta', error.message);
    },
  });
}
