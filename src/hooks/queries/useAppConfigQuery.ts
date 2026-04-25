import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { getCurrentUser } from '../../lib/auth';
import type { AppConfig } from '../../lib/types';
import { STALE_TIME } from '../../lib/constants';
import { queryKeys } from '../../lib/queryKeys';

export function useAppConfig() {
  return useQuery({
    queryKey: queryKeys.appConfig.all(),
    staleTime: STALE_TIME.MASTER_DATA,
    queryFn: async () => {
      const user = await getCurrentUser();
      const { data, error } = await supabase
        .from('app_config')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      if (error) throw error;
      return data as AppConfig | null;
    },
  });
}
