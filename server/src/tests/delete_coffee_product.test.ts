
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { coffeeProductsTable, usersTable, cartItemsTable, ordersTable, orderItemsTable } from '../db/schema';
import { type CreateCoffeeProductInput, type CreateUserInput } from '../schema';
import { deleteCoffeeProduct } from '../handlers/delete_coffee_product';
import { eq } from 'drizzle-orm';

// Test data
const testProduct: CreateCoffeeProductInput = {
  name: 'Test Coffee',
  description: 'A test coffee product',
  price: 15.99,
  image_url: 'https://example.com/coffee.jpg',
  origin: 'Colombia',
  roast_type: 'medium',
  stock_quantity: 50
};

const testUser: CreateUserInput = {
  email: 'test@example.com',
  name: 'Test User',
  role: 'customer'
};

describe('deleteCoffeeProduct', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should delete a coffee product', async () => {
    // Create test product
    const createdProducts = await db.insert(coffeeProductsTable)
      .values({
        ...testProduct,
        price: testProduct.price.toString()
      })
      .returning()
      .execute();

    const productId = createdProducts[0].id;

    // Delete the product
    await deleteCoffeeProduct(productId);

    // Verify product is deleted
    const products = await db.select()
      .from(coffeeProductsTable)
      .where(eq(coffeeProductsTable.id, productId))
      .execute();

    expect(products).toHaveLength(0);
  });

  it('should throw error when product does not exist', async () => {
    const nonExistentId = 999;

    await expect(deleteCoffeeProduct(nonExistentId))
      .rejects.toThrow(/product not found/i);
  });

  it('should cascade delete related cart items', async () => {
    // Create test user
    const createdUsers = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();

    const userId = createdUsers[0].id;

    // Create test product
    const createdProducts = await db.insert(coffeeProductsTable)
      .values({
        ...testProduct,
        price: testProduct.price.toString()
      })
      .returning()
      .execute();

    const productId = createdProducts[0].id;

    // Create cart item with the product
    await db.insert(cartItemsTable)
      .values({
        user_id: userId,
        product_id: productId,
        quantity: 2
      })
      .execute();

    // Verify cart item exists before deletion
    const cartItemsBefore = await db.select()
      .from(cartItemsTable)
      .where(eq(cartItemsTable.product_id, productId))
      .execute();

    expect(cartItemsBefore).toHaveLength(1);

    // Delete the product
    await deleteCoffeeProduct(productId);

    // Verify cart items are also deleted
    const cartItemsAfter = await db.select()
      .from(cartItemsTable)
      .where(eq(cartItemsTable.product_id, productId))
      .execute();

    expect(cartItemsAfter).toHaveLength(0);

    // Verify product is deleted
    const products = await db.select()
      .from(coffeeProductsTable)
      .where(eq(coffeeProductsTable.id, productId))
      .execute();

    expect(products).toHaveLength(0);
  });

  it('should prevent deletion when product is referenced in orders', async () => {
    // Create test user
    const createdUsers = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();

    const userId = createdUsers[0].id;

    // Create test product
    const createdProducts = await db.insert(coffeeProductsTable)
      .values({
        ...testProduct,
        price: testProduct.price.toString()
      })
      .returning()
      .execute();

    const productId = createdProducts[0].id;

    // Create test order
    const createdOrders = await db.insert(ordersTable)
      .values({
        user_id: userId,
        total_amount: '31.98',
        status: 'pending'
      })
      .returning()
      .execute();

    const orderId = createdOrders[0].id;

    // Create order item with the product
    await db.insert(orderItemsTable)
      .values({
        order_id: orderId,
        product_id: productId,
        quantity: 2,
        price_at_time: '15.99'
      })
      .execute();

    // Attempt to delete the product should fail
    await expect(deleteCoffeeProduct(productId))
      .rejects.toThrow(/cannot delete product that is referenced in orders/i);

    // Verify product still exists
    const products = await db.select()
      .from(coffeeProductsTable)
      .where(eq(coffeeProductsTable.id, productId))
      .execute();

    expect(products).toHaveLength(1);
  });
});
