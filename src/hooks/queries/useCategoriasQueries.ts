import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { getCurrentUser } from '../../lib/auth';
import type { Categoria } from '../../lib/types';
import { STALE_TIME } from '../../lib/constants';

// Fetch all categorias for current user
export function useCategorias() {
  return useQuery({
    queryKey: ['categorias'],
    staleTime: STALE_TIME.RARE,
    queryFn: async () => {
      const user = await getCurrentUser();

      const { data, error } = await supabase
        .from('categorias')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('name', { ascending: true });

      if (error) throw error;
      return data as Categoria[];
    },
  });
}

// Fetch single categoria by ID
export function useCategoria(id: string | undefined) {
  return useQuery({
    queryKey: ['categorias', id],
    staleTime: STALE_TIME.RARE,
    queryFn: async () => {
      if (!id) throw new Error('Categoria ID is required');

      const user = await getCurrentUser();

      const { data, error } = await supabase
        .from('categorias')
        .select('*')
        .eq('id', id)
        .eq('user_id', user.id)
        .single();

      if (error) throw error;
      return data as Categoria;
    },
    enabled: !!id,
  });
}

// Get insumos count by categoria
export function useInsumosByCategoriaCount() {
  return useQuery({
    queryKey: ['categorias', 'insumos-count'],
    staleTime: STALE_TIME.RARE,
    queryFn: async () => {
      const user = await getCurrentUser();

      // Fetch all categorias
      const { data: categorias, error: categoriasError } = await supabase
        .from('categorias')
        .select('id, name')
        .eq('user_id', user.id)
        .eq('is_active', true);

      if (categoriasError) throw categoriasError;

      // Fetch all insumos with categoria_ids
      const { data: insumos, error: insumosError } = await supabase
        .from('insumos')
        .select('id, categoria_ids')
        .eq('user_id', user.id)
        .eq('is_active', true);

      if (insumosError) throw insumosError;

      // Count insumos per categoria
      const counts: Record<string, number> = {};

      categorias?.forEach(cat => {
        counts[cat.id] = insumos?.filter(insumo => {
          const ids = insumo.categoria_ids as unknown as string[];
          return ids && ids.includes(cat.id);
        }).length || 0;
      });

      return counts;
    },
  });
}
