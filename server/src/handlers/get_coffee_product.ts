
import { db } from '../db';
import { coffeeProductsTable } from '../db/schema';
import { type CoffeeProduct } from '../schema';
import { eq } from 'drizzle-orm';

export const getCoffeeProduct = async (id: number): Promise<CoffeeProduct | null> => {
  try {
    const result = await db.select()
      .from(coffeeProductsTable)
      .where(eq(coffeeProductsTable.id, id))
      .execute();

    if (result.length === 0) {
      return null;
    }

    // Convert numeric fields back to numbers
    const product = result[0];
    return {
      ...product,
      price: parseFloat(product.price)
    };
  } catch (error) {
    console.error('Failed to get coffee product:', error);
    throw error;
  }
};
