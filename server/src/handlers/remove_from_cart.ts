
import { db } from '../db';
import { cartItemsTable } from '../db/schema';
import { eq } from 'drizzle-orm';

export const removeFromCart = async (cartItemId: number): Promise<void> => {
  try {
    // Delete the cart item by ID
    await db.delete(cartItemsTable)
      .where(eq(cartItemsTable.id, cartItemId))
      .execute();
  } catch (error) {
    console.error('Cart item removal failed:', error);
    throw error;
  }
};
