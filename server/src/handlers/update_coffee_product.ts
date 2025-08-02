
import { db } from '../db';
import { coffeeProductsTable } from '../db/schema';
import { type UpdateCoffeeProductInput, type CoffeeProduct } from '../schema';
import { eq } from 'drizzle-orm';

export const updateCoffeeProduct = async (input: UpdateCoffeeProductInput): Promise<CoffeeProduct> => {
  try {
    // Check if product exists
    const existingProduct = await db.select()
      .from(coffeeProductsTable)
      .where(eq(coffeeProductsTable.id, input.id))
      .limit(1)
      .execute();

    if (existingProduct.length === 0) {
      throw new Error(`Product with id ${input.id} not found`);
    }

    // Prepare update data with numeric conversions
    const updateData: Record<string, any> = {};
    
    if (input.name !== undefined) updateData['name'] = input.name;
    if (input.description !== undefined) updateData['description'] = input.description;
    if (input.price !== undefined) updateData['price'] = input.price.toString();
    if (input.image_url !== undefined) updateData['image_url'] = input.image_url;
    if (input.origin !== undefined) updateData['origin'] = input.origin;
    if (input.roast_type !== undefined) updateData['roast_type'] = input.roast_type;
    if (input.stock_quantity !== undefined) updateData['stock_quantity'] = input.stock_quantity;
    
    // Always update the updated_at timestamp
    updateData['updated_at'] = new Date();

    // Update product
    const result = await db.update(coffeeProductsTable)
      .set(updateData)
      .where(eq(coffeeProductsTable.id, input.id))
      .returning()
      .execute();

    // Convert numeric fields back to numbers before returning
    const product = result[0];
    return {
      ...product,
      price: parseFloat(product.price)
    };
  } catch (error) {
    console.error('Product update failed:', error);
    throw error;
  }
};
