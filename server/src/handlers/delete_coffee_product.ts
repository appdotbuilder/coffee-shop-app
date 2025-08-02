
import { db } from '../db';
import { coffeeProductsTable, cartItemsTable, orderItemsTable } from '../db/schema';
import { eq } from 'drizzle-orm';

export const deleteCoffeeProduct = async (id: number): Promise<void> => {
  try {
    // First check if product exists
    const existingProduct = await db.select()
      .from(coffeeProductsTable)
      .where(eq(coffeeProductsTable.id, id))
      .execute();

    if (existingProduct.length === 0) {
      throw new Error('Product not found');
    }

    // Check if product is referenced in any orders
    const orderReferences = await db.select()
      .from(orderItemsTable)
      .where(eq(orderItemsTable.product_id, id))
      .execute();

    if (orderReferences.length > 0) {
      throw new Error('Cannot delete product that is referenced in orders');
    }

    // Delete related cart items first (cascade deletion)
    await db.delete(cartItemsTable)
      .where(eq(cartItemsTable.product_id, id))
      .execute();

    // Delete the product
    await db.delete(coffeeProductsTable)
      .where(eq(coffeeProductsTable.id, id))
      .execute();
  } catch (error) {
    console.error('Product deletion failed:', error);
    throw error;
  }
};
