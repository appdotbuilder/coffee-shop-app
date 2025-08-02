
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, coffeeProductsTable, cartItemsTable } from '../db/schema';
import { type CreateUserInput, type CreateCoffeeProductInput, type AddToCartInput } from '../schema';
import { clearCart } from '../handlers/clear_cart';
import { eq } from 'drizzle-orm';

// Test data
const testUser: CreateUserInput = {
  email: 'test@example.com',
  name: 'Test User',
  role: 'customer'
};

const testProduct: CreateCoffeeProductInput = {
  name: 'Test Coffee',
  description: 'A test coffee product',
  price: 15.99,
  image_url: 'https://example.com/coffee.jpg',
  origin: 'Colombia',
  roast_type: 'medium',
  stock_quantity: 50
};

describe('clearCart', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should clear all items from user cart', async () => {
    // Create prerequisite data
    const [user] = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();

    const [product] = await db.insert(coffeeProductsTable)
      .values({
        ...testProduct,
        price: testProduct.price.toString()
      })
      .returning()
      .execute();

    // Add multiple items to cart
    await db.insert(cartItemsTable)
      .values([
        {
          user_id: user.id,
          product_id: product.id,
          quantity: 2
        },
        {
          user_id: user.id,  
          product_id: product.id,
          quantity: 1
        }
      ])
      .execute();

    // Verify items exist before clearing
    const itemsBeforeClear = await db.select()
      .from(cartItemsTable)
      .where(eq(cartItemsTable.user_id, user.id))
      .execute();

    expect(itemsBeforeClear).toHaveLength(2);

    // Clear the cart
    await clearCart(user.id);

    // Verify cart is empty
    const itemsAfterClear = await db.select()
      .from(cartItemsTable)
      .where(eq(cartItemsTable.user_id, user.id))
      .execute();

    expect(itemsAfterClear).toHaveLength(0);
  });

  it('should only clear items for specified user', async () => {
    // Create two users
    const [user1] = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();

    const [user2] = await db.insert(usersTable)
      .values({
        ...testUser,
        email: 'user2@example.com',
        name: 'User 2'
      })
      .returning()
      .execute();

    const [product] = await db.insert(coffeeProductsTable)
      .values({
        ...testProduct,
        price: testProduct.price.toString()
      })
      .returning()
      .execute();

    // Add items to both users' carts
    await db.insert(cartItemsTable)
      .values([
        {
          user_id: user1.id,
          product_id: product.id,
          quantity: 2
        },
        {
          user_id: user2.id,
          product_id: product.id,
          quantity: 3
        }
      ])
      .execute();

    // Clear only user1's cart
    await clearCart(user1.id);

    // Verify user1's cart is empty
    const user1Items = await db.select()
      .from(cartItemsTable)
      .where(eq(cartItemsTable.user_id, user1.id))
      .execute();

    expect(user1Items).toHaveLength(0);

    // Verify user2's cart is unchanged
    const user2Items = await db.select()
      .from(cartItemsTable)
      .where(eq(cartItemsTable.user_id, user2.id))
      .execute();

    expect(user2Items).toHaveLength(1);
    expect(user2Items[0].quantity).toEqual(3);
  });

  it('should handle clearing empty cart gracefully', async () => {
    // Create user with no cart items
    const [user] = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();

    // Clear empty cart should not throw error
    await expect(clearCart(user.id)).resolves.toBeUndefined();

    // Verify cart remains empty
    const items = await db.select()
      .from(cartItemsTable)
      .where(eq(cartItemsTable.user_id, user.id))
      .execute();

    expect(items).toHaveLength(0);
  });

  it('should handle non-existent user gracefully', async () => {
    const nonExistentUserId = 99999;

    // Clear cart for non-existent user should not throw error
    await expect(clearCart(nonExistentUserId)).resolves.toBeUndefined();
  });
});
