
import { db } from '../db';
import { coffeeProductsTable } from '../db/schema';
import { type CreateCoffeeProductInput, type CoffeeProduct } from '../schema';

export const createCoffeeProduct = async (input: CreateCoffeeProductInput): Promise<CoffeeProduct> => {
  try {
    // Insert coffee product record
    const result = await db.insert(coffeeProductsTable)
      .values({
        name: input.name,
        description: input.description,
        price: input.price.toString(), // Convert number to string for numeric column
        image_url: input.image_url,
        origin: input.origin,
        roast_type: input.roast_type,
        stock_quantity: input.stock_quantity
      })
      .returning()
      .execute();

    // Convert numeric fields back to numbers before returning
    const product = result[0];
    return {
      ...product,
      price: parseFloat(product.price) // Convert string back to number
    };
  } catch (error) {
    console.error('Coffee product creation failed:', error);
    throw error;
  }
};
