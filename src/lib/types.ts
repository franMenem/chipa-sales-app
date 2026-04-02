// Database types
export type UnitType = 'kg' | 'l' | 'unit' | 'g' | 'ml';
export type Frequency = 'monthly' | 'weekly' | 'annual';

// Entity types
export interface Categoria {
  id: string;
  user_id: string;
  name: string;
  color: string;
  unit_type: UnitType;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Insumo {
  id: string;
  user_id: string;
  name: string;
  unit_type: UnitType;
  description?: string;
  is_active: boolean;
  categoria_ids: string[]; // Array of categoria UUIDs
  created_at: string;
  updated_at: string;
}

export interface InsumoLote {
  id: string;
  user_id: string;
  insumo_id: string;
  purchase_date: string;
  quantity_purchased: number;
  quantity_remaining: number;
  price_per_unit: number;
  unit_type: UnitType;
  base_unit_cost: number; // Calculated field
  created_at: string;
  updated_at: string;
}

export interface InsumoWithStock extends Insumo {
  total_stock: number; // Sum of all lotes
  current_price_per_unit: number | null; // LIFO price (most recent lote)
  current_base_unit_cost: number | null; // LIFO base cost
  active_batches: number; // Number of lotes with stock > 0
}

export interface InsumoWithCategorias extends InsumoWithStock {
  categorias: Categoria[]; // Populated from categoria_ids
}

export interface RecipeItem {
  id: string;
  producto_id: string;
  insumo_id: string | null; // Nullable when use_categorias = true
  quantity_in_base_units: number;
  use_categorias: boolean; // True = usa categorías, false = usa insumo_id
  required_categoria_ids: string[]; // Array of categoria UUIDs
  created_at: string;
  // Joined data
  insumo?: Insumo;
  required_categorias?: Categoria[]; // Populated from required_categoria_ids
}

export interface Producto {
  id: string;
  user_id: string;
  name: string;
  is_active: boolean;
  finished_stock: number; // Total stock (sum of all stock_fabricado batches)
  created_at: string;
  updated_at: string;
  // Relations
  recipe_items?: RecipeItem[];
}

export interface ProductoWithCost extends Producto {
  cost_unit: number; // Estimated cost from view (LIFO pricing) - for reference only
  has_sufficient_ingredients: boolean; // True if all ingredients have enough stock
}

// Stock Fabricado: Manufactured product batches with specific cost, margin, and price
export interface StockFabricado {
  id: string;
  user_id: string;
  production_history_id: string;
  producto_id: string;
  quantity_fabricated: number;  // Total quantity produced in this batch
  quantity_remaining: number;   // Remaining quantity available for sale
  cost_unit: number;             // Unit cost captured at production time
  margin_percentage: number;     // Profit margin (0-100%)
  price_sale: number;            // Sale price configured at production time
  production_date: string;
  created_at: string;
  updated_at: string;
}

export interface StockFabricadoWithDetails extends StockFabricado {
  producto_name: string;
  quantity_sold: number;          // Calculated: quantity_fabricated - quantity_remaining
  profit_per_unit: number;        // Calculated: price_sale - cost_unit
  actual_margin_percentage: number; // Calculated: (profit / price_sale) * 100
  total_cost_remaining: number;   // Calculated: cost_unit * quantity_remaining
  total_value_remaining: number;  // Calculated: price_sale * quantity_remaining
  total_profit_potential: number; // Calculated: profit_per_unit * quantity_remaining
  stock_status: 'available' | 'low_stock' | 'sold_out';
}

export interface StockFabricadoTotals {
  producto_id: string;
  user_id: string;
  producto_name: string;
  total_quantity_available: number;   // Sum of all quantity_remaining
  total_quantity_fabricated: number;  // Sum of all quantity_fabricated
  total_batches: number;              // Total number of batches
  active_batches: number;             // Batches with quantity_remaining > 0
  avg_cost_unit: number;              // Weighted average by quantity_remaining
  avg_price_sale: number;             // Weighted average by quantity_remaining
  avg_margin_percentage: number;      // Weighted average by quantity_remaining
  lifo_cost_unit: number | null;      // Cost of most recent batch
  lifo_price_sale: number | null;     // Price of most recent batch
  lifo_margin_percentage: number | null; // Margin of most recent batch
  latest_production_date: string;
}

export interface Venta {
  id: string;
  user_id: string;
  producto_id: string | null;
  producto_name: string;
  quantity: number;
  price_sold: number;
  cost_unit: number;
  customer_name: string | null;
  payment_status: 'pagado' | 'debe';
  payment_destination: string | null;
  delivery_status: 'entregado' | 'no_entregado';
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

// Gastos (expenses tracking)
export type PaymentMethod = 'efectivo' | 'transferencia' | 'tarjeta' | 'otro';

export interface GastoConcepto {
  id: string;
  user_id: string;
  name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Gasto {
  id: string;
  user_id: string;
  concepto_id: string;
  amount: number;
  payment_date: string;
  payment_method: PaymentMethod;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface GastoWithConcepto extends Gasto {
  concepto_name: string;
}

export interface GastoTrendPoint {
  date: string;
  amount: number;
}

// Deudas (debts tracking)
export type DeudaStatus = 'pendiente' | 'parcial' | 'pagada';

export interface Deuda {
  id: string;
  user_id: string;
  description: string;
  creditor_name: string;
  total_amount: number;
  paid_amount: number;
  remaining_amount: number;
  due_date: string | null;
  status: DeudaStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface DeudaPago {
  id: string;
  user_id: string;
  deuda_id: string;
  amount: number;
  payment_date: string;
  payment_method: PaymentMethod;
  notes: string | null;
  created_at: string;
}

export interface DeudaWithPagos extends Deuda {
  pagos: DeudaPago[];
}

export interface ProductionRecord {
  id: string;
  user_id: string;
  producto_id: string;
  quantity_produced: number;
  cost_unit_at_production: number;
  production_date: string;
  created_at: string;
}

export interface PriceHistoryPoint {
  date: string;
  price_per_unit: number;
  quantity_purchased: number;
}

// Form types
export interface CreateCategoriaFormData {
  name: string;
  color?: string;
  unit_type?: UnitType;
}

export interface CreateInsumoFormData {
  name: string;
  unit_type: UnitType;
  description?: string;
  categoria_ids?: string[]; // IDs de categorías a asignar
}

export interface AddInsumoBatchFormData {
  insumo_id: string; // Existing insumo or create new
  purchase_date: string;
  quantity_purchased: number;
  price_per_unit: number;
  unit_type: UnitType;
}

export interface ProduceProductoFormData {
  producto_id: string;
  quantity: number;
}

export interface LotSelectionPayload {
  recipe_item_id: string;
  ingredient_id: string;
  lots: {
    lot_id: string;
    quantity: number;
  }[];
}

export interface RecipeItemFormData {
  // Modo específico
  insumo_id?: string | null;
  // Modo categorías
  use_categorias?: boolean;
  required_categoria_ids?: string[];
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

export interface GastoConceptoFormData {
  name: string;
}

export interface GastoFormData {
  concepto_id: string;
  amount: number;
  payment_date: string;
  payment_method: PaymentMethod;
  notes?: string;
}

export interface DeudaFormData {
  description: string;
  creditor_name: string;
  total_amount: number;
  due_date?: string;
  notes?: string;
}

export interface DeudaPagoFormData {
  deuda_id: string;
  amount: number;
  payment_date: string;
  payment_method: PaymentMethod;
  notes?: string;
}

// Retiros (withdrawals tracking)
export type RetiroItemType = 'insumo' | 'producto';
export type RetiroReason = 'consumo_personal' | 'merma' | 'ajuste';

export interface Retiro {
  id: string;
  user_id: string;
  item_type: RetiroItemType;
  item_id: string;
  item_name: string;
  lote_id: string | null;
  quantity: number;
  cost_per_unit: number;
  total_cost: number; // Generated: quantity * cost_per_unit
  reason: RetiroReason;
  notes: string | null;
  created_at: string;
}

export interface RetiroInsumoFormData {
  insumo_id: string;
  lote_id: string;
  quantity: number;
  reason: RetiroReason;
  notes?: string;
}

export interface RetiroProductoFormData {
  producto_id: string;
  stock_fabricado_id: string;
  quantity: number;
  reason: RetiroReason;
  notes?: string;
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
        Insert: Omit<Insumo, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Insumo, 'id' | 'created_at' | 'updated_at'>>
        Relationships: []
      }
      insumo_lotes: {
        Row: InsumoLote
        Insert: Omit<InsumoLote, 'id' | 'base_unit_cost' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<InsumoLote, 'id' | 'base_unit_cost' | 'created_at' | 'updated_at'>>
        Relationships: [
          {
            foreignKeyName: "insumo_lotes_insumo_id_fkey"
            columns: ["insumo_id"]
            isOneToOne: false
            referencedRelation: "insumos"
            referencedColumns: ["id"]
          }
        ]
      }
      production_history: {
        Row: ProductionRecord
        Insert: Omit<ProductionRecord, 'id' | 'created_at'>
        Update: Partial<Omit<ProductionRecord, 'id' | 'created_at'>>
        Relationships: [
          {
            foreignKeyName: "production_history_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "productos"
            referencedColumns: ["id"]
          }
        ]
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
      gasto_conceptos: {
        Row: GastoConcepto
        Insert: Omit<GastoConcepto, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<GastoConcepto, 'id' | 'created_at' | 'updated_at'>>
        Relationships: []
      }
      gastos: {
        Row: Gasto
        Insert: Omit<Gasto, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Gasto, 'id' | 'created_at' | 'updated_at'>>
        Relationships: [
          {
            foreignKeyName: "gastos_concepto_id_fkey"
            columns: ["concepto_id"]
            isOneToOne: false
            referencedRelation: "gasto_conceptos"
            referencedColumns: ["id"]
          }
        ]
      }
      deudas: {
        Row: Deuda
        Insert: Omit<Deuda, 'id' | 'paid_amount' | 'remaining_amount' | 'status' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Deuda, 'id' | 'paid_amount' | 'remaining_amount' | 'status' | 'created_at' | 'updated_at'>>
        Relationships: []
      }
      deuda_pagos: {
        Row: DeudaPago
        Insert: Omit<DeudaPago, 'id' | 'created_at'>
        Update: Partial<Omit<DeudaPago, 'id' | 'created_at'>>
        Relationships: [
          {
            foreignKeyName: "deuda_pagos_deuda_id_fkey"
            columns: ["deuda_id"]
            isOneToOne: false
            referencedRelation: "deudas"
            referencedColumns: ["id"]
          }
        ]
      }
      retiros: {
        Row: Retiro
        Insert: Omit<Retiro, 'id' | 'total_cost' | 'created_at'>
        Update: Partial<Omit<Retiro, 'id' | 'total_cost' | 'created_at'>>
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
