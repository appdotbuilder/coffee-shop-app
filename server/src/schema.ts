
import { z } from 'zod';

// Enums
export const roastTypeEnum = z.enum(['light', 'medium', 'dark', 'extra_dark']);
export const orderStatusEnum = z.enum(['pending', 'processing', 'shipped', 'delivered', 'cancelled']);
export const userRoleEnum = z.enum(['customer', 'admin']);

// Coffee Product schemas
export const coffeeProductSchema = z.object({
  id: z.number(),
  name: z.string(),
  description: z.string(),
  price: z.number(),
  image_url: z.string().nullable(),
  origin: z.string(),
  roast_type: roastTypeEnum,
  stock_quantity: z.number().int(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type CoffeeProduct = z.infer<typeof coffeeProductSchema>;

export const createCoffeeProductInputSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
  price: z.number().positive(),
  image_url: z.string().url().nullable(),
  origin: z.string().min(1),
  roast_type: roastTypeEnum,
  stock_quantity: z.number().int().nonnegative()
});

export type CreateCoffeeProductInput = z.infer<typeof createCoffeeProductInputSchema>;

export const updateCoffeeProductInputSchema = z.object({
  id: z.number(),
  name: z.string().min(1).optional(),
  description: z.string().min(1).optional(),
  price: z.number().positive().optional(),
  image_url: z.string().url().nullable().optional(),
  origin: z.string().min(1).optional(),
  roast_type: roastTypeEnum.optional(),
  stock_quantity: z.number().int().nonnegative().optional()
});

export type UpdateCoffeeProductInput = z.infer<typeof updateCoffeeProductInputSchema>;

// User schemas
export const userSchema = z.object({
  id: z.number(),
  email: z.string().email(),
  name: z.string(),
  role: userRoleEnum,
  created_at: z.coerce.date()
});

export type User = z.infer<typeof userSchema>;

export const createUserInputSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  role: userRoleEnum.default('customer')
});

export type CreateUserInput = z.infer<typeof createUserInputSchema>;

// Cart schemas
export const cartItemSchema = z.object({
  id: z.number(),
  user_id: z.number(),
  product_id: z.number(),
  quantity: z.number().int().positive(),
  created_at: z.coerce.date()
});

export type CartItem = z.infer<typeof cartItemSchema>;

export const addToCartInputSchema = z.object({
  user_id: z.number(),
  product_id: z.number(),
  quantity: z.number().int().positive()
});

export type AddToCartInput = z.infer<typeof addToCartInputSchema>;

export const updateCartItemInputSchema = z.object({
  id: z.number(),
  quantity: z.number().int().positive()
});

export type UpdateCartItemInput = z.infer<typeof updateCartItemInputSchema>;

// Order schemas
export const orderSchema = z.object({
  id: z.number(),
  user_id: z.number(),
  total_amount: z.number(),
  status: orderStatusEnum,
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Order = z.infer<typeof orderSchema>;

export const orderItemSchema = z.object({
  id: z.number(),
  order_id: z.number(),
  product_id: z.number(),
  quantity: z.number().int().positive(),
  price_at_time: z.number(),
  created_at: z.coerce.date()
});

export type OrderItem = z.infer<typeof orderItemSchema>;

export const createOrderInputSchema = z.object({
  user_id: z.number()
});

export type CreateOrderInput = z.infer<typeof createOrderInputSchema>;

export const updateOrderStatusInputSchema = z.object({
  id: z.number(),
  status: orderStatusEnum
});

export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusInputSchema>;

// Combined schemas for API responses
export const cartItemWithProductSchema = cartItemSchema.extend({
  product: coffeeProductSchema
});

export type CartItemWithProduct = z.infer<typeof cartItemWithProductSchema>;

export const orderWithItemsSchema = orderSchema.extend({
  items: z.array(orderItemSchema.extend({
    product: coffeeProductSchema
  })),
  user: userSchema
});

export type OrderWithItems = z.infer<typeof orderWithItemsSchema>;
