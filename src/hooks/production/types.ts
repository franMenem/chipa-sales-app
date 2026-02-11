import type { InsumoLote } from '../../lib/types';

export interface RecipeItemWithLotes {
  recipe_item_id: string;
  use_categorias: boolean;
  insumo_id: string | null;
  insumo_name: string;
  unit_type: string;
  quantity_needed: number;
  lotes: InsumoLote[];
  required_categoria_ids?: string[];
  compatible_insumos?: Array<{
    id: string;
    name: string;
    unit_type: string;
    total_stock: number;
  }>;
  selected_insumos?: Array<{
    insumo_id: string;
    insumo_name: string;
    unit_type: string;
    lotes: InsumoLote[];
  }>;
}

export interface SelectionStatusItem {
  required: number;
  selected: number;
  hasError: boolean;
  message: string | null;
}

export const UNIT_LABELS: Record<string, string> = {
  kg: 'kg',
  l: 'L',
  g: 'g',
  ml: 'ml',
  unit: 'ud',
};
