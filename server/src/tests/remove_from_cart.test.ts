
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { cartItemsTable, usersTable, coffeeProductsTable } from '../db/schema';
import { type CreateUserInput, type CreateCoffeeProductInput, type AddToCartInput } from '../schema';
import { removeFromCart } from '../handlers/remove_from_cart';
import { eq } from 'drizzle-orm';

// Test data
const testUser: CreateUserInput = {
  email: 'test@example.com',
  name: 'Test User',
  role: 'customer'
};

const testProduct: CreateCoffeeProductInput = {
  name: 'Test Coffee',
  description: 'A coffee for testing',
  price: 12.99,
  image_url: null,
  origin: 'Colombia',
  roast_type: 'medium',
  stock_quantity: 50
};

const testCartItem: AddToCartInput = {
  user_id: 1, // Will be set after user creation
  product_id: 1, // Will be set after product creation
  quantity: 2
};

describe('removeFromCart', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should remove a cart item', async () => {
    // Create user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    const userId = userResult[0].id;

    // Create product
    const productResult = await db.insert(coffeeProductsTable)
      .values({
        ...testProduct,
        price: testProduct.price.toString()
      })
      .returning()
      .execute();
    const productId = productResult[0].id;

    // Create cart item
    const cartItemResult = await db.insert(cartItemsTable)
      .values({
        user_id: userId,
        product_id: productId,
        quantity: testCartItem.quantity
      })
      .returning()
      .execute();
    const cartItemId = cartItemResult[0].id;

    // Remove cart item
    await removeFromCart(cartItemId);

    // Verify cart item was removed
    const cartItems = await db.select()
      .from(cartItemsTable)
      .where(eq(cartItemsTable.id, cartItemId))
      .execute();

    expect(cartItems).toHaveLength(0);
  });

  it('should not affect other cart items', async () => {
    // Create user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    const userId = userResult[0].id;

    // Create products
    const product1Result = await db.insert(coffeeProductsTable)
      .values({
        ...testProduct,
        name: 'Coffee 1',
        price: testProduct.price.toString()
      })
      .returning()
      .execute();
    const product1Id = product1Result[0].id;

    const product2Result = await db.insert(coffeeProductsTable)
      .values({
        ...testProduct,
        name: 'Coffee 2',
        price: testProduct.price.toString()
      })
      .returning()
      .execute();
    const product2Id = product2Result[0].id;

    // Create multiple cart items
    const cartItem1Result = await db.insert(cartItemsTable)
      .values({
        user_id: userId,
        product_id: product1Id,
        quantity: 2
      })
      .returning()
      .execute();
    const cartItem1Id = cartItem1Result[0].id;

    const cartItem2Result = await db.insert(cartItemsTable)
      .values({
        user_id: userId,
        product_id: product2Id,
        quantity: 3
      })
      .returning()
      .execute();
    const cartItem2Id = cartItem2Result[0].id;

    // Remove only the first cart item
    await removeFromCart(cartItem1Id);

    // Verify first cart item was removed
    const deletedCartItems = await db.select()
      .from(cartItemsTable)
      .where(eq(cartItemsTable.id, cartItem1Id))
      .execute();
    expect(deletedCartItems).toHaveLength(0);

    // Verify second cart item still exists
    const remainingCartItems = await db.select()
      .from(cartItemsTable)
      .where(eq(cartItemsTable.id, cartItem2Id))
      .execute();
    expect(remainingCartItems).toHaveLength(1);
    expect(remainingCartItems[0].quantity).toEqual(3);
  });

  it('should handle removing non-existent cart item gracefully', async () => {
    const nonExistentId = 999;

    // Should not throw an error
    await expect(removeFromCart(nonExistentId)).resolves.toBeUndefined();

    // Verify no cart items exist
    const cartItems = await db.select()
      .from(cartItemsTable)
      .execute();
    expect(cartItems).toHaveLength(0);
  });
});
