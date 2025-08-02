
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { cartItemsTable, usersTable, coffeeProductsTable } from '../db/schema';
import { type UpdateCartItemInput, type CreateUserInput, type CreateCoffeeProductInput } from '../schema';
import { updateCartItem } from '../handlers/update_cart_item';
import { eq } from 'drizzle-orm';

// Test data
const testUser: CreateUserInput = {
  email: 'test@example.com',
  name: 'Test User',
  role: 'customer'
};

const testProduct: CreateCoffeeProductInput = {
  name: 'Ethiopian Coffee',
  description: 'Premium Ethiopian coffee beans',
  price: 24.99,
  image_url: null,
  origin: 'Ethiopia',
  roast_type: 'medium',
  stock_quantity: 50
};

describe('updateCartItem', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should update cart item quantity', async () => {
    // Create prerequisite data
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    const user = userResult[0];

    const productResult = await db.insert(coffeeProductsTable)
      .values({
        ...testProduct,
        price: testProduct.price.toString()
      })
      .returning()
      .execute();
    const product = productResult[0];

    // Create cart item
    const cartItemResult = await db.insert(cartItemsTable)
      .values({
        user_id: user.id,
        product_id: product.id,
        quantity: 2
      })
      .returning()
      .execute();
    const cartItem = cartItemResult[0];

    // Update cart item
    const updateInput: UpdateCartItemInput = {
      id: cartItem.id,
      quantity: 5
    };

    const result = await updateCartItem(updateInput);

    // Verify result
    expect(result.id).toEqual(cartItem.id);
    expect(result.user_id).toEqual(user.id);
    expect(result.product_id).toEqual(product.id);
    expect(result.quantity).toEqual(5);
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should save updated quantity to database', async () => {
    // Create prerequisite data
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    const user = userResult[0];

    const productResult = await db.insert(coffeeProductsTable)
      .values({
        ...testProduct,
        price: testProduct.price.toString()
      })
      .returning()
      .execute();
    const product = productResult[0];

    // Create cart item
    const cartItemResult = await db.insert(cartItemsTable)
      .values({
        user_id: user.id,
        product_id: product.id,
        quantity: 3
      })
      .returning()
      .execute();
    const cartItem = cartItemResult[0];

    // Update cart item
    const updateInput: UpdateCartItemInput = {
      id: cartItem.id,
      quantity: 8
    };

    await updateCartItem(updateInput);

    // Verify in database
    const updatedItems = await db.select()
      .from(cartItemsTable)
      .where(eq(cartItemsTable.id, cartItem.id))
      .execute();

    expect(updatedItems).toHaveLength(1);
    expect(updatedItems[0].quantity).toEqual(8);
    expect(updatedItems[0].user_id).toEqual(user.id);
    expect(updatedItems[0].product_id).toEqual(product.id);
  });

  it('should throw error for non-existent cart item', async () => {
    const updateInput: UpdateCartItemInput = {
      id: 999,
      quantity: 5
    };

    expect(updateCartItem(updateInput)).rejects.toThrow(/not found/i);
  });

  it('should handle quantity of 1', async () => {
    // Create prerequisite data
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    const user = userResult[0];

    const productResult = await db.insert(coffeeProductsTable)
      .values({
        ...testProduct,
        price: testProduct.price.toString()
      })
      .returning()
      .execute();
    const product = productResult[0];

    // Create cart item
    const cartItemResult = await db.insert(cartItemsTable)
      .values({
        user_id: user.id,
        product_id: product.id,
        quantity: 10
      })
      .returning()
      .execute();
    const cartItem = cartItemResult[0];

    // Update to quantity 1
    const updateInput: UpdateCartItemInput = {
      id: cartItem.id,
      quantity: 1
    };

    const result = await updateCartItem(updateInput);

    expect(result.quantity).toEqual(1);

    // Verify in database
    const updatedItems = await db.select()
      .from(cartItemsTable)
      .where(eq(cartItemsTable.id, cartItem.id))
      .execute();

    expect(updatedItems[0].quantity).toEqual(1);
  });
});
