
import { db } from '../db';
import { cartItemsTable, coffeeProductsTable } from '../db/schema';
import { type CartItemWithProduct } from '../schema';
import { eq } from 'drizzle-orm';

export const getCartItems = async (userId: number): Promise<CartItemWithProduct[]> => {
  try {
    const results = await db.select()
      .from(cartItemsTable)
      .innerJoin(coffeeProductsTable, eq(cartItemsTable.product_id, coffeeProductsTable.id))
      .where(eq(cartItemsTable.user_id, userId))
      .execute();

    return results.map(result => ({
      id: result.cart_items.id,
      user_id: result.cart_items.user_id,
      product_id: result.cart_items.product_id,
      quantity: result.cart_items.quantity,
      created_at: result.cart_items.created_at,
      product: {
        id: result.coffee_products.id,
        name: result.coffee_products.name,
        description: result.coffee_products.description,
        price: parseFloat(result.coffee_products.price),
        image_url: result.coffee_products.image_url,
        origin: result.coffee_products.origin,
        roast_type: result.coffee_products.roast_type,
        stock_quantity: result.coffee_products.stock_quantity,
        created_at: result.coffee_products.created_at,
        updated_at: result.coffee_products.updated_at
      }
    }));
  } catch (error) {
    console.error('Failed to get cart items:', error);
    throw error;
  }
};
