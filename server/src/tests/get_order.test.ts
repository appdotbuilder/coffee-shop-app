
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, coffeeProductsTable, ordersTable, orderItemsTable } from '../db/schema';
import { getOrder } from '../handlers/get_order';

// Test data
const testUser = {
  email: 'test@example.com',
  name: 'Test User',
  role: 'customer' as const
};

const testProduct = {
  name: 'Test Coffee',
  description: 'A delicious test coffee',
  price: '19.99',
  image_url: 'https://example.com/coffee.jpg',
  origin: 'Colombia',
  roast_type: 'medium' as const,
  stock_quantity: 100
};

const testOrder = {
  user_id: 1,
  total_amount: '39.98',
  status: 'pending' as const
};

const testOrderItem = {
  order_id: 1,
  product_id: 1,
  quantity: 2,
  price_at_time: '19.99'
};

describe('getOrder', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return order with items and product details', async () => {
    // Create prerequisite data
    await db.insert(usersTable).values(testUser).execute();
    await db.insert(coffeeProductsTable).values(testProduct).execute();
    await db.insert(ordersTable).values(testOrder).execute();
    await db.insert(orderItemsTable).values(testOrderItem).execute();

    const result = await getOrder(1);

    expect(result).toBeDefined();
    expect(result!.id).toBe(1);
    expect(result!.user_id).toBe(1);
    expect(result!.total_amount).toBe(39.98);
    expect(result!.status).toBe('pending');
    expect(result!.created_at).toBeInstanceOf(Date);
    expect(result!.updated_at).toBeInstanceOf(Date);

    // Check user details
    expect(result!.user.id).toBe(1);
    expect(result!.user.email).toBe('test@example.com');
    expect(result!.user.name).toBe('Test User');
    expect(result!.user.role).toBe('customer');

    // Check order items
    expect(result!.items).toHaveLength(1);
    expect(result!.items[0].id).toBe(1);
    expect(result!.items[0].quantity).toBe(2);
    expect(result!.items[0].price_at_time).toBe(19.99);

    // Check product details
    expect(result!.items[0].product.id).toBe(1);
    expect(result!.items[0].product.name).toBe('Test Coffee');
    expect(result!.items[0].product.price).toBe(19.99);
    expect(result!.items[0].product.origin).toBe('Colombia');
    expect(result!.items[0].product.roast_type).toBe('medium');
  });

  it('should return order when userId matches', async () => {
    // Create prerequisite data
    await db.insert(usersTable).values(testUser).execute();
    await db.insert(coffeeProductsTable).values(testProduct).execute();
    await db.insert(ordersTable).values(testOrder).execute();
    await db.insert(orderItemsTable).values(testOrderItem).execute();

    const result = await getOrder(1, 1);

    expect(result).toBeDefined();
    expect(result!.id).toBe(1);
    expect(result!.user_id).toBe(1);
  });

  it('should return null when userId does not match', async () => {
    // Create prerequisite data
    await db.insert(usersTable).values(testUser).execute();
    await db.insert(coffeeProductsTable).values(testProduct).execute();
    await db.insert(ordersTable).values(testOrder).execute();
    await db.insert(orderItemsTable).values(testOrderItem).execute();

    const result = await getOrder(1, 999);

    expect(result).toBeNull();
  });

  it('should return null when order does not exist', async () => {
    const result = await getOrder(999);

    expect(result).toBeNull();
  });

  it('should handle order with no items', async () => {
    // Create prerequisite data without order items
    await db.insert(usersTable).values(testUser).execute();
    await db.insert(ordersTable).values(testOrder).execute();

    const result = await getOrder(1);

    expect(result).toBeDefined();
    expect(result!.id).toBe(1);
    expect(result!.items).toHaveLength(0);
    expect(result!.user.id).toBe(1);
  });

  it('should handle order with multiple items', async () => {
    // Create prerequisite data
    await db.insert(usersTable).values(testUser).execute();
    await db.insert(coffeeProductsTable).values(testProduct).execute();
    await db.insert(coffeeProductsTable).values({
      ...testProduct,
      name: 'Second Coffee',
      price: '24.99'
    }).execute();
    await db.insert(ordersTable).values(testOrder).execute();
    await db.insert(orderItemsTable).values(testOrderItem).execute();
    await db.insert(orderItemsTable).values({
      ...testOrderItem,
      product_id: 2,
      quantity: 1,
      price_at_time: '24.99'
    }).execute();

    const result = await getOrder(1);

    expect(result).toBeDefined();
    expect(result!.items).toHaveLength(2);
    
    // Check first item
    expect(result!.items[0].product.name).toBe('Test Coffee');
    expect(result!.items[0].quantity).toBe(2);
    
    // Check second item
    expect(result!.items[1].product.name).toBe('Second Coffee');
    expect(result!.items[1].quantity).toBe(1);
    expect(result!.items[1].price_at_time).toBe(24.99);
  });
});
