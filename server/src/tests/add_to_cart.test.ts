
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { cartItemsTable, coffeeProductsTable, usersTable } from '../db/schema';
import { type AddToCartInput } from '../schema';
import { addToCart } from '../handlers/add_to_cart';
import { eq, and } from 'drizzle-orm';

describe('addToCart', () => {
  let testUserId: number;
  let testProductId: number;

  beforeEach(async () => {
    await createDB();

    // Create test user
    const user = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        name: 'Test User',
        role: 'customer'
      })
      .returning()
      .execute();
    testUserId = user[0].id;

    // Create test product
    const product = await db.insert(coffeeProductsTable)
      .values({
        name: 'Test Coffee',
        description: 'A test coffee product',
        price: '19.99',
        origin: 'Colombia',
        roast_type: 'medium',
        stock_quantity: 50
      })
      .returning()
      .execute();
    testProductId = product[0].id;
  });

  afterEach(resetDB);

  it('should add new item to cart', async () => {
    const input: AddToCartInput = {
      user_id: testUserId,
      product_id: testProductId,
      quantity: 2
    };

    const result = await addToCart(input);

    expect(result.user_id).toEqual(testUserId);
    expect(result.product_id).toEqual(testProductId);
    expect(result.quantity).toEqual(2);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should save cart item to database', async () => {
    const input: AddToCartInput = {
      user_id: testUserId,
      product_id: testProductId,
      quantity: 3
    };

    const result = await addToCart(input);

    const cartItems = await db.select()
      .from(cartItemsTable)
      .where(eq(cartItemsTable.id, result.id))
      .execute();

    expect(cartItems).toHaveLength(1);
    expect(cartItems[0].user_id).toEqual(testUserId);
    expect(cartItems[0].product_id).toEqual(testProductId);
    expect(cartItems[0].quantity).toEqual(3);
  });

  it('should update quantity if item already exists in cart', async () => {
    // First add item to cart
    const firstInput: AddToCartInput = {
      user_id: testUserId,
      product_id: testProductId,
      quantity: 2
    };
    await addToCart(firstInput);

    // Add same item again
    const secondInput: AddToCartInput = {
      user_id: testUserId,
      product_id: testProductId,
      quantity: 3
    };
    const result = await addToCart(secondInput);

    // Should have updated quantity to 5 (2 + 3)
    expect(result.quantity).toEqual(5);

    // Verify only one cart item exists
    const cartItems = await db.select()
      .from(cartItemsTable)
      .where(and(
        eq(cartItemsTable.user_id, testUserId),
        eq(cartItemsTable.product_id, testProductId)
      ))
      .execute();

    expect(cartItems).toHaveLength(1);
    expect(cartItems[0].quantity).toEqual(5);
  });

  it('should throw error for non-existent user', async () => {
    const input: AddToCartInput = {
      user_id: 99999,
      product_id: testProductId,
      quantity: 1
    };

    expect(addToCart(input)).rejects.toThrow(/user not found/i);
  });

  it('should throw error for non-existent product', async () => {
    const input: AddToCartInput = {
      user_id: testUserId,
      product_id: 99999,
      quantity: 1
    };

    expect(addToCart(input)).rejects.toThrow(/product not found/i);
  });

  it('should throw error when quantity exceeds stock', async () => {
    const input: AddToCartInput = {
      user_id: testUserId,
      product_id: testProductId,
      quantity: 100 // Product only has 50 in stock
    };

    expect(addToCart(input)).rejects.toThrow(/insufficient stock/i);
  });

  it('should throw error when updating existing cart item would exceed stock', async () => {
    // First add 30 items to cart
    const firstInput: AddToCartInput = {
      user_id: testUserId,
      product_id: testProductId,
      quantity: 30
    };
    await addToCart(firstInput);

    // Try to add 25 more (would total 55, but stock is only 50)
    const secondInput: AddToCartInput = {
      user_id: testUserId,
      product_id: testProductId,
      quantity: 25
    };

    expect(addToCart(secondInput)).rejects.toThrow(/insufficient stock for requested quantity/i);
  });
});
