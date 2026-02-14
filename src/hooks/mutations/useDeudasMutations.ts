import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { getCurrentUser } from '../../lib/auth';
import { useToast } from '../useToast';
import { invalidateDeudasRelated } from '../../utils/cacheInvalidation';
import type { DeudaFormData, DeudaPagoFormData } from '../../lib/types';

// Create a new deuda
export function useCreateDeuda() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: async (input: DeudaFormData) => {
      const user = await getCurrentUser();

      const { data, error } = await supabase
        .from('deudas')
        .insert({
          description: input.description,
          creditor_name: input.creditor_name,
          total_amount: input.total_amount,
          due_date: input.due_date || null,
          notes: input.notes || null,
          user_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      invalidateDeudasRelated(queryClient);
      toast.success('Deuda creada', 'La deuda se registró correctamente');
    },
    onError: (error: Error) => {
      toast.error('Error al crear deuda', error.message);
    },
  });
}

// Update a deuda
export function useUpdateDeuda() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: async (input: DeudaFormData & { id: string }) => {
      const { id, ...updateData } = input;

      const { data, error } = await supabase
        .from('deudas')
        .update({
          description: updateData.description,
          creditor_name: updateData.creditor_name,
          total_amount: updateData.total_amount,
          due_date: updateData.due_date || null,
          notes: updateData.notes || null,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      invalidateDeudasRelated(queryClient);
      toast.success('Deuda actualizada', 'Los cambios se guardaron correctamente');
    },
    onError: (error: Error) => {
      toast.error('Error al actualizar deuda', error.message);
    },
  });
}

// Delete a deuda
export function useDeleteDeuda() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('deudas')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      invalidateDeudasRelated(queryClient);
      toast.success('Deuda eliminada', 'La deuda se eliminó correctamente');
    },
    onError: (error: Error) => {
      toast.error('Error al eliminar deuda', error.message);
    },
  });
}

// Create a payment toward a deuda
export function useCreateDeudaPago() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: async (input: DeudaPagoFormData) => {
      const user = await getCurrentUser();

      const { data, error } = await supabase
        .from('deuda_pagos')
        .insert({
          deuda_id: input.deuda_id,
          amount: input.amount,
          payment_date: input.payment_date,
          payment_method: input.payment_method,
          notes: input.notes || null,
          user_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      invalidateDeudasRelated(queryClient);
      toast.success('Pago registrado', 'El pago se registró correctamente');
    },
    onError: (error: Error) => {
      toast.error('Error al registrar pago', error.message);
    },
  });
}

// Delete a payment
export function useDeleteDeudaPago() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('deuda_pagos')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      invalidateDeudasRelated(queryClient);
      toast.success('Pago eliminado', 'El pago se eliminó correctamente');
    },
    onError: (error: Error) => {
      toast.error('Error al eliminar pago', error.message);
    },
  });
}
