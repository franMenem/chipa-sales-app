// Database types
export type UnitType = 'kg' | 'l' | 'unit' | 'g' | 'ml';
export type Frequency = 'monthly' | 'weekly' | 'annual';

// Entity types
export interface Insumo {
  id: string;
  user_id: string;
  name: string;
  price_per_unit: number;
  unit_type: UnitType;
  quantity: number; // Cantidad comprada
  base_unit_cost: number; // Calculated field
  created_at: string;
  updated_at: string;
}

export interface RecipeItem {
  id: string;
  producto_id: string;
  insumo_id: string;
  quantity_in_base_units: number;
  created_at: string;
  // Joined data
  insumo?: Insumo;
}

export interface Producto {
  id: string;
  user_id: string;
  name: string;
  price_sale: number;
  margin_goal: number | null;
  finished_stock: number; // Stock de productos terminados
  created_at: string;
  updated_at: string;
  // Relations
  recipe_items?: RecipeItem[];
}

export interface ProductoWithCost extends Producto {
  cost_unit: number; // Calculated from view
}

export interface Venta {
  id: string;
  user_id: string;
  producto_id: string | null;
  producto_name: string;
  quantity: number;
  price_sold: number;
  cost_unit: number;
  total_income: number; // Calculated
  total_cost: number; // Calculated
  profit: number; // Calculated
  profit_margin: number; // Calculated
  sale_date: string;
  created_at: string;
}

export interface CostoFijo {
  id: string;
  user_id: string;
  name: string;
  amount: number;
  frequency: Frequency;
  created_at: string;
  updated_at: string;
}

// Form types
export interface InsumoFormData {
  name: string;
  price_per_unit: number;
  unit_type: UnitType;
  quantity: number;
}

export interface RecipeItemFormData {
  insumo_id: string;
  quantity_in_base_units: number;
}

export interface ProductoFormData {
  name: string;
  price_sale: number;
  margin_goal: number | null;
  recipe_items: RecipeItemFormData[];
}

export interface VentaFormData {
  producto_id: string;
  quantity: number;
  price_sold?: number; // Optional override
}

export interface CostoFijoFormData {
  name: string;
  amount: number;
  frequency: Frequency;
}

// Dashboard aggregations
export interface DashboardKPIs {
  sales_today: number;
  sales_month: number;
  profit_today: number;
  profit_month: number;
  costs_today: number;
  costs_month: number;
  profit_margin_avg: number;
  total_orders_today: number;
  total_orders_month: number;
}

export interface BestSeller {
  producto_id: string;
  producto_name: string;
  units_sold: number;
  total_revenue: number;
}

export interface ProfitTrendData {
  date: string;
  profit: number;
  income: number;
  costs: number;
}

// Toast notification types
export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  message?: string;
}

// Database schema types for Supabase
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      costos_fijos: {
        Row: CostoFijo
        Insert: Omit<CostoFijo, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<CostoFijo, 'id' | 'created_at' | 'updated_at'>>
        Relationships: []
      }
      insumos: {
        Row: Insumo
        Insert: Omit<Insumo, 'id' | 'base_unit_cost' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Insumo, 'id' | 'base_unit_cost' | 'created_at' | 'updated_at'>>
        Relationships: []
      }
      productos: {
        Row: Omit<Producto, 'recipe_items'>
        Insert: Omit<Producto, 'id' | 'created_at' | 'updated_at' | 'recipe_items'>
        Update: Partial<Omit<Producto, 'id' | 'created_at' | 'updated_at' | 'recipe_items'>>
        Relationships: []
      }
      recipe_items: {
        Row: Omit<RecipeItem, 'insumo'>
        Insert: Omit<RecipeItem, 'id' | 'created_at' | 'insumo'>
        Update: Partial<Omit<RecipeItem, 'id' | 'created_at' | 'insumo'>>
        Relationships: [
          {
            foreignKeyName: "recipe_items_insumo_id_fkey"
            columns: ["insumo_id"]
            isOneToOne: false
            referencedRelation: "insumos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipe_items_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "productos"
            referencedColumns: ["id"]
          }
        ]
      }
      ventas: {
        Row: Venta
        Insert: Omit<Venta, 'id' | 'total_income' | 'total_cost' | 'profit' | 'profit_margin' | 'created_at'>
        Update: Partial<Omit<Venta, 'id' | 'total_income' | 'total_cost' | 'profit' | 'profit_margin' | 'created_at'>>
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (Database["public"]["Tables"] & Database["public"]["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (Database["public"]["Tables"] &
      Database["public"]["Views"])
  ? (Database["public"]["Tables"] &
      Database["public"]["Views"])[PublicTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof Database["public"]["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof Database["public"]["Tables"]
  ? Database["public"]["Tables"][PublicTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof Database["public"]["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof Database["public"]["Tables"]
  ? Database["public"]["Tables"][PublicTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof Database["public"]["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof Database["public"]["Enums"]
  ? Database["public"]["Enums"][PublicEnumNameOrOptions]
  : never

