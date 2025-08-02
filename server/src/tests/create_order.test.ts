
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, coffeeProductsTable, cartItemsTable, ordersTable, orderItemsTable } from '../db/schema';
import { type CreateOrderInput } from '../schema';
import { createOrder } from '../handlers/create_order';
import { eq } from 'drizzle-orm';

// Test input
const testInput: CreateOrderInput = {
  user_id: 1
};

describe('createOrder', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create an order from cart items', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        name: 'Test User',
        role: 'customer'
      })
      .returning()
      .execute();
    const user = userResult[0];

    // Create test products
    const productResult = await db.insert(coffeeProductsTable)
      .values([
        {
          name: 'Colombian Coffee',
          description: 'Premium Colombian beans',
          price: '15.99',
          origin: 'Colombia',
          roast_type: 'medium',
          stock_quantity: 100
        },
        {
          name: 'Ethiopian Coffee',
          description: 'Single origin Ethiopian beans',
          price: '18.50',
          origin: 'Ethiopia',
          roast_type: 'light',
          stock_quantity: 50
        }
      ])
      .returning()
      .execute();

    // Add items to cart
    await db.insert(cartItemsTable)
      .values([
        {
          user_id: user.id,
          product_id: productResult[0].id,
          quantity: 2
        },
        {
          user_id: user.id,
          product_id: productResult[1].id,
          quantity: 1
        }
      ])
      .execute();

    const result = await createOrder({ user_id: user.id });

    // Verify order details
    expect(result.id).toBeDefined();
    expect(result.user_id).toEqual(user.id);
    expect(result.total_amount).toEqual(50.48); // (15.99 * 2) + (18.50 * 1)
    expect(result.status).toEqual('pending');
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);

    // Verify user data
    expect(result.user.id).toEqual(user.id);
    expect(result.user.email).toEqual('test@example.com');
    expect(result.user.name).toEqual('Test User');

    // Verify order items
    expect(result.items).toHaveLength(2);
    
    const item1 = result.items.find(item => item.product.name === 'Colombian Coffee');
    expect(item1).toBeDefined();
    expect(item1!.quantity).toEqual(2);
    expect(item1!.price_at_time).toEqual(15.99);
    expect(item1!.product.name).toEqual('Colombian Coffee');

    const item2 = result.items.find(item => item.product.name === 'Ethiopian Coffee');
    expect(item2).toBeDefined();
    expect(item2!.quantity).toEqual(1);
    expect(item2!.price_at_time).toEqual(18.50);
    expect(item2!.product.name).toEqual('Ethiopian Coffee');
  });

  it('should save order to database', async () => {
    // Create test user and product
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        name: 'Test User',
        role: 'customer'
      })
      .returning()
      .execute();

    const productResult = await db.insert(coffeeProductsTable)
      .values({
        name: 'Test Coffee',
        description: 'Test description',
        price: '10.00',
        origin: 'Test Origin',
        roast_type: 'medium',
        stock_quantity: 50
      })
      .returning()
      .execute();

    // Add item to cart
    await db.insert(cartItemsTable)
      .values({
        user_id: userResult[0].id,
        product_id: productResult[0].id,
        quantity: 1
      })
      .execute();

    const result = await createOrder({ user_id: userResult[0].id });

    // Verify order in database
    const orders = await db.select()
      .from(ordersTable)
      .where(eq(ordersTable.id, result.id))
      .execute();

    expect(orders).toHaveLength(1);
    expect(orders[0].user_id).toEqual(userResult[0].id);
    expect(parseFloat(orders[0].total_amount)).toEqual(10.00);
    expect(orders[0].status).toEqual('pending');

    // Verify order items in database
    const orderItems = await db.select()
      .from(orderItemsTable)
      .where(eq(orderItemsTable.order_id, result.id))
      .execute();

    expect(orderItems).toHaveLength(1);
    expect(orderItems[0].product_id).toEqual(productResult[0].id);
    expect(orderItems[0].quantity).toEqual(1);
    expect(parseFloat(orderItems[0].price_at_time)).toEqual(10.00);
  });

  it('should update product stock quantities', async () => {
    // Create test user and product
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        name: 'Test User',
        role: 'customer'
      })
      .returning()
      .execute();

    const productResult = await db.insert(coffeeProductsTable)
      .values({
        name: 'Test Coffee',
        description: 'Test description',
        price: '10.00',
        origin: 'Test Origin',
        roast_type: 'medium',
        stock_quantity: 50
      })
      .returning()
      .execute();

    // Add item to cart
    await db.insert(cartItemsTable)
      .values({
        user_id: userResult[0].id,
        product_id: productResult[0].id,
        quantity: 5
      })
      .execute();

    await createOrder({ user_id: userResult[0].id });

    // Verify stock was reduced
    const products = await db.select()
      .from(coffeeProductsTable)
      .where(eq(coffeeProductsTable.id, productResult[0].id))
      .execute();

    expect(products[0].stock_quantity).toEqual(45); // 50 - 5
  });

  it('should clear cart after order creation', async () => {
    // Create test user and product
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        name: 'Test User',
        role: 'customer'
      })
      .returning()
      .execute();

    const productResult = await db.insert(coffeeProductsTable)
      .values({
        name: 'Test Coffee',
        description: 'Test description',
        price: '10.00',
        origin: 'Test Origin',
        roast_type: 'medium',
        stock_quantity: 50
      })
      .returning()
      .execute();

    // Add item to cart
    await db.insert(cartItemsTable)
      .values({
        user_id: userResult[0].id,
        product_id: productResult[0].id,
        quantity: 1
      })
      .execute();

    await createOrder({ user_id: userResult[0].id });

    // Verify cart is empty
    const cartItems = await db.select()
      .from(cartItemsTable)
      .where(eq(cartItemsTable.user_id, userResult[0].id))
      .execute();

    expect(cartItems).toHaveLength(0);
  });

  it('should throw error for non-existent user', async () => {
    await expect(createOrder({ user_id: 999 }))
      .rejects.toThrow(/user not found/i);
  });

  it('should throw error for empty cart', async () => {
    // Create test user with no cart items
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        name: 'Test User',
        role: 'customer'
      })
      .returning()
      .execute();

    await expect(createOrder({ user_id: userResult[0].id }))
      .rejects.toThrow(/cart is empty/i);
  });

  it('should throw error for insufficient stock', async () => {
    // Create test user and product with low stock
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        name: 'Test User',
        role: 'customer'
      })
      .returning()
      .execute();

    const productResult = await db.insert(coffeeProductsTable)
      .values({
        name: 'Low Stock Coffee',
        description: 'Test description',
        price: '10.00',
        origin: 'Test Origin',
        roast_type: 'medium',
        stock_quantity: 2
      })
      .returning()
      .execute();

    // Add more items to cart than available in stock
    await db.insert(cartItemsTable)
      .values({
        user_id: userResult[0].id,
        product_id: productResult[0].id,
        quantity: 5
      })
      .execute();

    await expect(createOrder({ user_id: userResult[0].id }))
      .rejects.toThrow(/insufficient stock/i);
  });
});
