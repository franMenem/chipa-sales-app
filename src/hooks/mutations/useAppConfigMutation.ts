import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { getCurrentUser } from '../../lib/auth';
import { useToast } from '../useToast';
import { queryKeys } from '../../lib/queryKeys';
import type { AppConfigFormData } from '../../lib/types';

export function useUpsertAppConfig() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: async (data: Partial<AppConfigFormData>) => {
      const user = await getCurrentUser();
      const payload: Record<string, unknown> = {
        user_id: user.id,
        updated_at: new Date().toISOString(),
      };
      if (data.buffer_percentage !== undefined) {
        payload.buffer_percentage = data.buffer_percentage;
      }
      if (data.mp_reserva_amount !== undefined) {
        payload.mp_reserva_amount = data.mp_reserva_amount;
        payload.mp_reserva_updated_at = new Date().toISOString();
      }
      const { error } = await supabase
        .from('app_config')
        .upsert(payload, { onConflict: 'user_id' });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.appConfig.all() });
    },
    onError: () => {
      toast.error('Error', 'No se pudo guardar la configuración');
    },
  });
}
