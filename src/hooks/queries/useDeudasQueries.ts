import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { getCurrentUser } from '../../lib/auth';
import type { Deuda, DeudaPago } from '../../lib/types';
import { STALE_TIME } from '../../lib/constants';

// Fetch all deudas for current user
export function useDeudas(statusFilter?: string) {
  return useQuery({
    queryKey: ['deudas', statusFilter],
    staleTime: STALE_TIME.FREQUENT,
    queryFn: async () => {
      const user = await getCurrentUser();

      let query = supabase
        .from('deudas')
        .select('*')
        .eq('user_id', user.id);

      if (statusFilter && statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      query = query.order('created_at', { ascending: false });

      const { data, error } = await query;

      if (error) throw error;
      return data as Deuda[];
    },
  });
}

// Fetch pagos for a specific deuda
export function useDeudaPagos(deudaId: string | undefined) {
  return useQuery({
    queryKey: ['deuda_pagos', deudaId],
    staleTime: STALE_TIME.FREQUENT,
    enabled: !!deudaId,
    queryFn: async () => {
      if (!deudaId) throw new Error('Deuda ID es requerido');

      const user = await getCurrentUser();

      const { data, error } = await supabase
        .from('deuda_pagos')
        .select('*')
        .eq('deuda_id', deudaId)
        .eq('user_id', user.id)
        .order('payment_date', { ascending: false });

      if (error) throw error;
      return data as DeudaPago[];
    },
  });
}
