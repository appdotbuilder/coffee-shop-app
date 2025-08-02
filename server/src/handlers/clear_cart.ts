
import { db } from '../db';
import { cartItemsTable } from '../db/schema';
import { eq } from 'drizzle-orm';

export const clearCart = async (userId: number): Promise<void> => {
  try {
    await db.delete(cartItemsTable)
      .where(eq(cartItemsTable.user_id, userId))
      .execute();
  } catch (error) {
    console.error('Clear cart failed:', error);
    throw error;
  }
};
