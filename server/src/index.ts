
import { initTRPC } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';
import { z } from 'zod';

// Schema imports
import {
  createCoffeeProductInputSchema,
  updateCoffeeProductInputSchema,
  createUserInputSchema,
  addToCartInputSchema,
  updateCartItemInputSchema,
  createOrderInputSchema,
  updateOrderStatusInputSchema
} from './schema';

// Handler imports
import { getCoffeeProducts } from './handlers/get_coffee_products';
import { getCoffeeProduct } from './handlers/get_coffee_product';
import { createCoffeeProduct } from './handlers/create_coffee_product';
import { updateCoffeeProduct } from './handlers/update_coffee_product';
import { deleteCoffeeProduct } from './handlers/delete_coffee_product';
import { createUser } from './handlers/create_user';
import { getUser } from './handlers/get_user';
import { addToCart } from './handlers/add_to_cart';
import { getCartItems } from './handlers/get_cart_items';
import { updateCartItem } from './handlers/update_cart_item';
import { removeFromCart } from './handlers/remove_from_cart';
import { clearCart } from './handlers/clear_cart';
import { createOrder } from './handlers/create_order';
import { getOrders } from './handlers/get_orders';
import { getOrder } from './handlers/get_order';
import { updateOrderStatus } from './handlers/update_order_status';

const t = initTRPC.create({
  transformer: superjson,
});

const publicProcedure = t.procedure;
const router = t.router;

const appRouter = router({
  // Health check
  healthcheck: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),

  // Coffee Products
  getCoffeeProducts: publicProcedure
    .query(() => getCoffeeProducts()),
  
  getCoffeeProduct: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(({ input }) => getCoffeeProduct(input.id)),
  
  createCoffeeProduct: publicProcedure
    .input(createCoffeeProductInputSchema)
    .mutation(({ input }) => createCoffeeProduct(input)),
  
  updateCoffeeProduct: publicProcedure
    .input(updateCoffeeProductInputSchema)
    .mutation(({ input }) => updateCoffeeProduct(input)),
  
  deleteCoffeeProduct: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(({ input }) => deleteCoffeeProduct(input.id)),

  // Users
  createUser: publicProcedure
    .input(createUserInputSchema)
    .mutation(({ input }) => createUser(input)),
  
  getUser: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(({ input }) => getUser(input.id)),

  // Cart Management
  addToCart: publicProcedure
    .input(addToCartInputSchema)
    .mutation(({ input }) => addToCart(input)),
  
  getCartItems: publicProcedure
    .input(z.object({ userId: z.number() }))
    .query(({ input }) => getCartItems(input.userId)),
  
  updateCartItem: publicProcedure
    .input(updateCartItemInputSchema)
    .mutation(({ input }) => updateCartItem(input)),
  
  removeFromCart: publicProcedure
    .input(z.object({ cartItemId: z.number() }))
    .mutation(({ input }) => removeFromCart(input.cartItemId)),
  
  clearCart: publicProcedure
    .input(z.object({ userId: z.number() }))
    .mutation(({ input }) => clearCart(input.userId)),

  // Order Management
  createOrder: publicProcedure
    .input(createOrderInputSchema)
    .mutation(({ input }) => createOrder(input)),
  
  getOrders: publicProcedure
    .input(z.object({ userId: z.number().optional() }))
    .query(({ input }) => getOrders(input.userId)),
  
  getOrder: publicProcedure
    .input(z.object({ id: z.number(), userId: z.number().optional() }))
    .query(({ input }) => getOrder(input.id, input.userId)),
  
  updateOrderStatus: publicProcedure
    .input(updateOrderStatusInputSchema)
    .mutation(({ input }) => updateOrderStatus(input)),
});

export type AppRouter = typeof appRouter;

async function start() {
  const port = process.env['SERVER_PORT'] || 2022;
  const server = createHTTPServer({
    middleware: (req, res, next) => {
      cors()(req, res, next);
    },
    router: appRouter,
    createContext() {
      return {};
    },
  });
  server.listen(port);
  console.log(`Coffee Shop TRPC server listening at port: ${port}`);
}

start();
