
import { db } from '../db';
import { coffeeProductsTable } from '../db/schema';
import { type CoffeeProduct } from '../schema';

export const getCoffeeProducts = async (): Promise<CoffeeProduct[]> => {
  try {
    const results = await db.select()
      .from(coffeeProductsTable)
      .execute();

    // Convert numeric fields back to numbers
    return results.map(product => ({
      ...product,
      price: parseFloat(product.price) // Convert string back to number
    }));
  } catch (error) {
    console.error('Failed to fetch coffee products:', error);
    throw error;
  }
};
