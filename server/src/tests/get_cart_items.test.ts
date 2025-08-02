
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, coffeeProductsTable, cartItemsTable } from '../db/schema';
import { getCartItems } from '../handlers/get_cart_items';

describe('getCartItems', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when user has no cart items', async () => {
    // Create a user
    const users = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        name: 'Test User',
        role: 'customer'
      })
      .returning()
      .execute();

    const result = await getCartItems(users[0].id);

    expect(result).toEqual([]);
  });

  it('should return cart items with product details for a user', async () => {
    // Create a user
    const users = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        name: 'Test User',
        role: 'customer'
      })
      .returning()
      .execute();

    // Create a coffee product
    const products = await db.insert(coffeeProductsTable)
      .values({
        name: 'Ethiopian Yirgacheffe',
        description: 'A bright and floral coffee',
        price: '24.99',
        image_url: 'https://example.com/coffee.jpg',
        origin: 'Ethiopia',
        roast_type: 'light',
        stock_quantity: 50
      })
      .returning()
      .execute();

    // Add item to cart
    const cartItems = await db.insert(cartItemsTable)
      .values({
        user_id: users[0].id,
        product_id: products[0].id,
        quantity: 2
      })
      .returning()
      .execute();

    const result = await getCartItems(users[0].id);

    expect(result).toHaveLength(1);
    expect(result[0].id).toEqual(cartItems[0].id);
    expect(result[0].user_id).toEqual(users[0].id);
    expect(result[0].product_id).toEqual(products[0].id);
    expect(result[0].quantity).toEqual(2);
    expect(result[0].created_at).toBeInstanceOf(Date);

    // Check product details
    expect(result[0].product.id).toEqual(products[0].id);
    expect(result[0].product.name).toEqual('Ethiopian Yirgacheffe');
    expect(result[0].product.description).toEqual('A bright and floral coffee');
    expect(result[0].product.price).toEqual(24.99);
    expect(typeof result[0].product.price).toEqual('number');
    expect(result[0].product.image_url).toEqual('https://example.com/coffee.jpg');
    expect(result[0].product.origin).toEqual('Ethiopia');
    expect(result[0].product.roast_type).toEqual('light');
    expect(result[0].product.stock_quantity).toEqual(50);
    expect(result[0].product.created_at).toBeInstanceOf(Date);
    expect(result[0].product.updated_at).toBeInstanceOf(Date);
  });

  it('should return multiple cart items for a user', async () => {
    // Create a user
    const users = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        name: 'Test User',
        role: 'customer'
      })
      .returning()
      .execute();

    // Create two coffee products
    const products = await db.insert(coffeeProductsTable)
      .values([
        {
          name: 'Ethiopian Yirgacheffe',
          description: 'A bright and floral coffee',
          price: '24.99',
          image_url: null,
          origin: 'Ethiopia',
          roast_type: 'light',
          stock_quantity: 50
        },
        {
          name: 'Colombian Supremo',
          description: 'Rich and balanced',
          price: '22.50',
          image_url: 'https://example.com/colombian.jpg',
          origin: 'Colombia',
          roast_type: 'medium',
          stock_quantity: 30
        }
      ])
      .returning()
      .execute();

    // Add items to cart
    await db.insert(cartItemsTable)
      .values([
        {
          user_id: users[0].id,
          product_id: products[0].id,
          quantity: 1
        },
        {
          user_id: users[0].id,
          product_id: products[1].id,
          quantity: 3
        }
      ])
      .execute();

    const result = await getCartItems(users[0].id);

    expect(result).toHaveLength(2);
    
    // Find items by product name for consistent testing
    const ethiopianItem = result.find(item => item.product.name === 'Ethiopian Yirgacheffe');
    const colombianItem = result.find(item => item.product.name === 'Colombian Supremo');

    expect(ethiopianItem).toBeDefined();
    expect(ethiopianItem!.quantity).toEqual(1);
    expect(ethiopianItem!.product.price).toEqual(24.99);
    expect(ethiopianItem!.product.image_url).toBeNull();

    expect(colombianItem).toBeDefined();
    expect(colombianItem!.quantity).toEqual(3);
    expect(colombianItem!.product.price).toEqual(22.5);
    expect(colombianItem!.product.image_url).toEqual('https://example.com/colombian.jpg');
  });

  it('should only return cart items for the specified user', async () => {
    // Create two users
    const users = await db.insert(usersTable)
      .values([
        {
          email: 'user1@example.com',
          name: 'User One',
          role: 'customer'
        },
        {
          email: 'user2@example.com',
          name: 'User Two',
          role: 'customer'
        }
      ])
      .returning()
      .execute();

    // Create a coffee product
    const products = await db.insert(coffeeProductsTable)
      .values({
        name: 'Test Coffee',
        description: 'A test coffee',
        price: '20.00',
        image_url: null,
        origin: 'Test Origin',
        roast_type: 'medium',
        stock_quantity: 100
      })
      .returning()
      .execute();

    // Add items to cart for both users
    await db.insert(cartItemsTable)
      .values([
        {
          user_id: users[0].id,
          product_id: products[0].id,
          quantity: 1
        },
        {
          user_id: users[1].id,
          product_id: products[0].id,
          quantity: 2
        }
      ])
      .execute();

    // Get cart items for first user
    const result1 = await getCartItems(users[0].id);
    expect(result1).toHaveLength(1);
    expect(result1[0].user_id).toEqual(users[0].id);
    expect(result1[0].quantity).toEqual(1);

    // Get cart items for second user
    const result2 = await getCartItems(users[1].id);
    expect(result2).toHaveLength(1);
    expect(result2[0].user_id).toEqual(users[1].id);
    expect(result2[0].quantity).toEqual(2);
  });
});
