
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, coffeeProductsTable, ordersTable, orderItemsTable } from '../db/schema';
import { getOrders } from '../handlers/get_orders';

describe('getOrders', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no orders exist', async () => {
    const result = await getOrders();
    expect(result).toEqual([]);
  });

  it('should return all orders with items and product details', async () => {
    // Create test user
    const [user] = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        name: 'Test User',
        role: 'customer'
      })
      .returning()
      .execute();

    // Create test product
    const [product] = await db.insert(coffeeProductsTable)
      .values({
        name: 'Ethiopian Coffee',
        description: 'Single origin coffee',
        price: '24.99',
        origin: 'Ethiopia',
        roast_type: 'medium',
        stock_quantity: 50,
        image_url: null
      })
      .returning()
      .execute();

    // Create test order
    const [order] = await db.insert(ordersTable)
      .values({
        user_id: user.id,
        total_amount: '49.98',
        status: 'pending'
      })
      .returning()
      .execute();

    // Create order item
    await db.insert(orderItemsTable)
      .values({
        order_id: order.id,
        product_id: product.id,
        quantity: 2,
        price_at_time: '24.99'
      })
      .execute();

    const result = await getOrders();

    expect(result).toHaveLength(1);
    expect(result[0].id).toEqual(order.id);
    expect(result[0].user_id).toEqual(user.id);
    expect(result[0].total_amount).toEqual(49.98);
    expect(result[0].status).toEqual('pending');
    expect(result[0].created_at).toBeInstanceOf(Date);
    expect(result[0].updated_at).toBeInstanceOf(Date);

    // Check user details
    expect(result[0].user.id).toEqual(user.id);
    expect(result[0].user.email).toEqual('test@example.com');
    expect(result[0].user.name).toEqual('Test User');
    expect(result[0].user.role).toEqual('customer');

    // Check order items
    expect(result[0].items).toHaveLength(1);
    expect(result[0].items[0].quantity).toEqual(2);
    expect(result[0].items[0].price_at_time).toEqual(24.99);

    // Check product details in order item
    expect(result[0].items[0].product.name).toEqual('Ethiopian Coffee');
    expect(result[0].items[0].product.price).toEqual(24.99);
    expect(result[0].items[0].product.origin).toEqual('Ethiopia');
    expect(result[0].items[0].product.roast_type).toEqual('medium');
  });

  it('should return orders for specific user when userId provided', async () => {
    // Create two test users
    const [user1] = await db.insert(usersTable)
      .values({
        email: 'user1@example.com',
        name: 'User One',
        role: 'customer'
      })
      .returning()
      .execute();

    const [user2] = await db.insert(usersTable)
      .values({
        email: 'user2@example.com',
        name: 'User Two',
        role: 'customer'
      })
      .returning()
      .execute();

    // Create orders for both users
    await db.insert(ordersTable)
      .values([
        {
          user_id: user1.id,
          total_amount: '25.00',
          status: 'pending'
        },
        {
          user_id: user2.id,
          total_amount: '30.00',
          status: 'delivered'
        }
      ])
      .execute();

    // Get orders for user1 only
    const result = await getOrders(user1.id);

    expect(result).toHaveLength(1);
    expect(result[0].user_id).toEqual(user1.id);
    expect(result[0].user.email).toEqual('user1@example.com');
    expect(result[0].total_amount).toEqual(25.00);
    expect(result[0].status).toEqual('pending');
  });

  it('should return orders without items when no order items exist', async () => {
    // Create test user
    const [user] = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        name: 'Test User',
        role: 'customer'
      })
      .returning()
      .execute();

    // Create order without items
    const [order] = await db.insert(ordersTable)
      .values({
        user_id: user.id,
        total_amount: '0.00',
        status: 'pending'
      })
      .returning()
      .execute();

    const result = await getOrders();

    expect(result).toHaveLength(1);
    expect(result[0].id).toEqual(order.id);
    expect(result[0].items).toEqual([]);
  });

  it('should return orders sorted by creation date descending', async () => {
    // Create test user
    const [user] = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        name: 'Test User',
        role: 'customer'
      })
      .returning()
      .execute();

    // Create multiple orders with slight delay to ensure different timestamps
    const [order1] = await db.insert(ordersTable)
      .values({
        user_id: user.id,
        total_amount: '25.00',
        status: 'pending'
      })
      .returning()
      .execute();

    // Small delay to ensure different timestamps
    await new Promise(resolve => setTimeout(resolve, 10));

    const [order2] = await db.insert(ordersTable)
      .values({
        user_id: user.id,
        total_amount: '30.00',
        status: 'delivered'
      })
      .returning()
      .execute();

    const result = await getOrders();

    expect(result).toHaveLength(2);
    // More recent order should come first
    expect(result[0].id).toEqual(order2.id);
    expect(result[1].id).toEqual(order1.id);
    expect(result[0].created_at >= result[1].created_at).toBe(true);
  });

  it('should handle multiple items per order correctly', async () => {
    // Create test user
    const [user] = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        name: 'Test User',
        role: 'customer'
      })
      .returning()
      .execute();

    // Create two test products
    const products = await db.insert(coffeeProductsTable)
      .values([
        {
          name: 'Ethiopian Coffee',
          description: 'Single origin coffee',
          price: '24.99',
          origin: 'Ethiopia',
          roast_type: 'medium',
          stock_quantity: 50,
          image_url: null
        },
        {
          name: 'Colombian Coffee',
          description: 'Rich Colombian beans',
          price: '22.99',
          origin: 'Colombia',
          roast_type: 'dark',
          stock_quantity: 30,
          image_url: null
        }
      ])
      .returning()
      .execute();

    // Create test order
    const [order] = await db.insert(ordersTable)
      .values({
        user_id: user.id,
        total_amount: '72.97',
        status: 'processing'
      })
      .returning()
      .execute();

    // Create multiple order items
    await db.insert(orderItemsTable)
      .values([
        {
          order_id: order.id,
          product_id: products[0].id,
          quantity: 2,
          price_at_time: '24.99'
        },
        {
          order_id: order.id,
          product_id: products[1].id,
          quantity: 1,
          price_at_time: '22.99'
        }
      ])
      .execute();

    const result = await getOrders();

    expect(result).toHaveLength(1);
    expect(result[0].items).toHaveLength(2);

    // Verify both items are present
    const itemProducts = result[0].items.map(item => item.product.name);
    expect(itemProducts).toContain('Ethiopian Coffee');
    expect(itemProducts).toContain('Colombian Coffee');

    // Verify quantities and prices
    const ethiopianItem = result[0].items.find(item => item.product.name === 'Ethiopian Coffee');
    const colombianItem = result[0].items.find(item => item.product.name === 'Colombian Coffee');

    expect(ethiopianItem?.quantity).toEqual(2);
    expect(ethiopianItem?.price_at_time).toEqual(24.99);
    expect(colombianItem?.quantity).toEqual(1);
    expect(colombianItem?.price_at_time).toEqual(22.99);
  });

  it('should return empty items array when orders exist but no items found', async () => {
    // Create test user
    const [user] = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        name: 'Test User',
        role: 'admin'
      })
      .returning()
      .execute();

    // Create multiple orders without items
    await db.insert(ordersTable)
      .values([
        {
          user_id: user.id,
          total_amount: '0.00',
          status: 'cancelled'
        },
        {
          user_id: user.id,
          total_amount: '5.00',
          status: 'pending'
        }
      ])
      .execute();

    const result = await getOrders();

    expect(result).toHaveLength(2);
    expect(result[0].items).toEqual([]);
    expect(result[1].items).toEqual([]);
    expect(result[0].user.role).toEqual('admin');
  });
});
