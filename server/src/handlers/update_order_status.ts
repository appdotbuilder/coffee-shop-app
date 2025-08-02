
import { db } from '../db';
import { ordersTable } from '../db/schema';
import { type UpdateOrderStatusInput, type Order } from '../schema';
import { eq } from 'drizzle-orm';

export const updateOrderStatus = async (input: UpdateOrderStatusInput): Promise<Order> => {
  try {
    // Update order status and updated_at timestamp
    const result = await db.update(ordersTable)
      .set({
        status: input.status,
        updated_at: new Date() // Explicitly update the timestamp
      })
      .where(eq(ordersTable.id, input.id))
      .returning()
      .execute();

    if (result.length === 0) {
      throw new Error(`Order with id ${input.id} not found`);
    }

    // Convert numeric fields back to numbers before returning
    const order = result[0];
    return {
      ...order,
      total_amount: parseFloat(order.total_amount)
    };
  } catch (error) {
    console.error('Order status update failed:', error);
    throw error;
  }
};
