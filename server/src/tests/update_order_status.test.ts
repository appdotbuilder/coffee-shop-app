
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, coffeeProductsTable, ordersTable } from '../db/schema';
import { type UpdateOrderStatusInput } from '../schema';
import { updateOrderStatus } from '../handlers/update_order_status';
import { eq } from 'drizzle-orm';

describe('updateOrderStatus', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should update order status', async () => {
    // Create prerequisite user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        name: 'Test User',
        role: 'customer'
      })
      .returning()
      .execute();

    // Create test order
    const orderResult = await db.insert(ordersTable)
      .values({
        user_id: userResult[0].id,
        total_amount: '99.99',
        status: 'pending'
      })
      .returning()
      .execute();

    const testInput: UpdateOrderStatusInput = {
      id: orderResult[0].id,
      status: 'processing'
    };

    const result = await updateOrderStatus(testInput);

    // Verify return values
    expect(result.id).toEqual(orderResult[0].id);
    expect(result.status).toEqual('processing');
    expect(result.user_id).toEqual(userResult[0].id);
    expect(result.total_amount).toEqual(99.99);
    expect(typeof result.total_amount).toBe('number');
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.created_at).toBeInstanceOf(Date);

    // Verify updated_at was changed
    expect(result.updated_at.getTime()).toBeGreaterThan(orderResult[0].updated_at.getTime());
  });

  it('should save updated status to database', async () => {
    // Create prerequisite user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        name: 'Test User',
        role: 'customer'
      })
      .returning()
      .execute();

    // Create test order
    const orderResult = await db.insert(ordersTable)
      .values({
        user_id: userResult[0].id,
        total_amount: '149.50',
        status: 'pending'
      })
      .returning()
      .execute();

    const testInput: UpdateOrderStatusInput = {
      id: orderResult[0].id,
      status: 'shipped'
    };

    await updateOrderStatus(testInput);

    // Query database to verify update
    const orders = await db.select()
      .from(ordersTable)
      .where(eq(ordersTable.id, orderResult[0].id))
      .execute();

    expect(orders).toHaveLength(1);
    expect(orders[0].status).toEqual('shipped');
    expect(parseFloat(orders[0].total_amount)).toEqual(149.50);
    expect(orders[0].updated_at).toBeInstanceOf(Date);
    expect(orders[0].updated_at.getTime()).toBeGreaterThan(orderResult[0].updated_at.getTime());
  });

  it('should throw error for non-existent order', async () => {
    const testInput: UpdateOrderStatusInput = {
      id: 99999,
      status: 'delivered'
    };

    await expect(updateOrderStatus(testInput)).rejects.toThrow(/Order with id 99999 not found/i);
  });

  it('should handle all valid order statuses', async () => {
    // Create prerequisite user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        name: 'Test User',
        role: 'customer'
      })
      .returning()
      .execute();

    // Create test order
    const orderResult = await db.insert(ordersTable)
      .values({
        user_id: userResult[0].id,
        total_amount: '75.25',
        status: 'pending'
      })
      .returning()
      .execute();

    const statuses = ['processing', 'shipped', 'delivered', 'cancelled'] as const;

    for (const status of statuses) {
      const testInput: UpdateOrderStatusInput = {
        id: orderResult[0].id,
        status: status
      };

      const result = await updateOrderStatus(testInput);
      expect(result.status).toEqual(status);

      // Verify in database
      const orders = await db.select()
        .from(ordersTable)
        .where(eq(ordersTable.id, orderResult[0].id))
        .execute();

      expect(orders[0].status).toEqual(status);
    }
  });
});
