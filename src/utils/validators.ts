import { z } from 'zod';

// Insumo validation schema
export const insumoSchema = z.object({
  name: z
    .string()
    .min(1, 'El nombre es requerido')
    .max(255, 'El nombre es demasiado largo'),
  price_per_unit: z
    .number()
    .positive('El precio debe ser mayor a 0'),
  unit_type: z.enum(['kg', 'l', 'unit', 'g', 'ml']),
});

export type InsumoSchema = z.infer<typeof insumoSchema>;

// Recipe item validation schema
export const recipeItemSchema = z.object({
  insumo_id: z.string().uuid('ID de insumo inválido'),
  quantity_in_base_units: z
    .number()
    .positive('La cantidad debe ser mayor a 0'),
});

// Producto base validation schema (without recipe items)
export const productoBaseSchema = z.object({
  name: z
    .string()
    .min(1, 'El nombre es requerido')
    .max(255, 'El nombre es demasiado largo'),
  price_sale: z
    .number()
    .positive('El precio debe ser mayor a 0'),
  margin_goal: z
    .number()
    .min(0, 'El margen no puede ser negativo')
    .max(100, 'El margen no puede ser mayor a 100')
    .nullable()
    .optional(),
});

// Producto validation schema (with recipe items)
export const productoSchema = productoBaseSchema.extend({
  recipe_items: z
    .array(recipeItemSchema)
    .min(1, 'Debe agregar al menos un ingrediente a la receta'),
});

export type ProductoSchema = z.infer<typeof productoSchema>;
export type ProductoBaseSchema = z.infer<typeof productoBaseSchema>;

// Venta validation schema
export const ventaSchema = z.object({
  producto_id: z.string().uuid('ID de producto inválido'),
  quantity: z
    .number()
    .int('La cantidad debe ser un número entero')
    .positive('La cantidad debe ser mayor a 0'),
  price_sold: z
    .number()
    .positive('El precio debe ser mayor a 0')
    .optional(),
});

export type VentaSchema = z.infer<typeof ventaSchema>;

// Costo Fijo validation schema
export const costoFijoSchema = z.object({
  name: z
    .string()
    .min(1, 'El nombre es requerido')
    .max(255, 'El nombre es demasiado largo'),
  amount: z
    .number()
    .positive('El monto debe ser mayor a 0'),
  frequency: z.enum(['monthly', 'weekly', 'annual']),
});

export type CostoFijoSchema = z.infer<typeof costoFijoSchema>;

// Login validation schema
export const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'El email es requerido')
    .email('Email inválido'),
  password: z
    .string()
    .min(6, 'La contraseña debe tener al menos 6 caracteres'),
});

export type LoginSchema = z.infer<typeof loginSchema>;

// Register validation schema
export const registerSchema = z
  .object({
    email: z
      .string()
      .min(1, 'El email es requerido')
      .email('Email inválido'),
    password: z
      .string()
      .min(6, 'La contraseña debe tener al menos 6 caracteres'),
    confirmPassword: z
      .string()
      .min(6, 'La contraseña debe tener al menos 6 caracteres'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmPassword'],
  });

export type RegisterSchema = z.infer<typeof registerSchema>;
