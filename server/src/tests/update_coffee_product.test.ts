
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { coffeeProductsTable } from '../db/schema';
import { type CreateCoffeeProductInput, type UpdateCoffeeProductInput } from '../schema';
import { updateCoffeeProduct } from '../handlers/update_coffee_product';
import { eq } from 'drizzle-orm';

// Test product input
const testProduct: CreateCoffeeProductInput = {
  name: 'Original Product',
  description: 'Original description',
  price: 15.99,
  image_url: 'https://example.com/image.jpg',
  origin: 'Ethiopia',
  roast_type: 'medium',
  stock_quantity: 50
};

describe('updateCoffeeProduct', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should update all product fields', async () => {
    // Create initial product
    const createResult = await db.insert(coffeeProductsTable)
      .values({
        ...testProduct,
        price: testProduct.price.toString()
      })
      .returning()
      .execute();

    const productId = createResult[0].id;
    const originalUpdatedAt = createResult[0].updated_at;

    // Update product with all fields
    const updateInput: UpdateCoffeeProductInput = {
      id: productId,
      name: 'Updated Product',
      description: 'Updated description',
      price: 25.99,
      image_url: 'https://example.com/new-image.jpg',
      origin: 'Colombia',
      roast_type: 'dark',
      stock_quantity: 75
    };

    const result = await updateCoffeeProduct(updateInput);

    // Verify all fields were updated
    expect(result.id).toEqual(productId);
    expect(result.name).toEqual('Updated Product');
    expect(result.description).toEqual('Updated description');
    expect(result.price).toEqual(25.99);
    expect(typeof result.price).toBe('number');
    expect(result.image_url).toEqual('https://example.com/new-image.jpg');
    expect(result.origin).toEqual('Colombia');
    expect(result.roast_type).toEqual('dark');
    expect(result.stock_quantity).toEqual(75);
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.updated_at > originalUpdatedAt).toBe(true);
  });

  it('should update only specified fields', async () => {
    // Create initial product
    const createResult = await db.insert(coffeeProductsTable)
      .values({
        ...testProduct,
        price: testProduct.price.toString()
      })
      .returning()
      .execute();

    const productId = createResult[0].id;

    // Update only name and price
    const updateInput: UpdateCoffeeProductInput = {
      id: productId,
      name: 'Partially Updated',
      price: 20.50
    };

    const result = await updateCoffeeProduct(updateInput);

    // Verify only specified fields were updated
    expect(result.name).toEqual('Partially Updated');
    expect(result.price).toEqual(20.50);
    expect(result.description).toEqual(testProduct.description); // Unchanged
    expect(result.origin).toEqual(testProduct.origin); // Unchanged
    expect(result.roast_type).toEqual(testProduct.roast_type); // Unchanged
    expect(result.stock_quantity).toEqual(testProduct.stock_quantity); // Unchanged
  });

  it('should update product in database', async () => {
    // Create initial product
    const createResult = await db.insert(coffeeProductsTable)
      .values({
        ...testProduct,
        price: testProduct.price.toString()
      })
      .returning()
      .execute();

    const productId = createResult[0].id;

    // Update product
    const updateInput: UpdateCoffeeProductInput = {
      id: productId,
      name: 'Database Updated',
      price: 18.75
    };

    await updateCoffeeProduct(updateInput);

    // Verify database was updated
    const products = await db.select()
      .from(coffeeProductsTable)
      .where(eq(coffeeProductsTable.id, productId))
      .execute();

    expect(products).toHaveLength(1);
    expect(products[0].name).toEqual('Database Updated');
    expect(parseFloat(products[0].price)).toEqual(18.75);
  });

  it('should handle null image_url update', async () => {
    // Create initial product
    const createResult = await db.insert(coffeeProductsTable)
      .values({
        ...testProduct,
        price: testProduct.price.toString()
      })
      .returning()
      .execute();

    const productId = createResult[0].id;

    // Update with null image_url
    const updateInput: UpdateCoffeeProductInput = {
      id: productId,
      image_url: null
    };

    const result = await updateCoffeeProduct(updateInput);

    expect(result.image_url).toBeNull();
  });

  it('should throw error for non-existent product', async () => {
    const updateInput: UpdateCoffeeProductInput = {
      id: 99999,
      name: 'Non-existent Product'
    };

    expect(updateCoffeeProduct(updateInput)).rejects.toThrow(/not found/i);
  });

  it('should always update updated_at timestamp', async () => {
    // Create initial product
    const createResult = await db.insert(coffeeProductsTable)
      .values({
        ...testProduct,
        price: testProduct.price.toString()
      })
      .returning()
      .execute();

    const productId = createResult[0].id;
    const originalUpdatedAt = createResult[0].updated_at;

    // Small delay to ensure timestamp difference
    await new Promise(resolve => setTimeout(resolve, 10));

    // Update with minimal change
    const updateInput: UpdateCoffeeProductInput = {
      id: productId,
      stock_quantity: 51
    };

    const result = await updateCoffeeProduct(updateInput);

    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.updated_at > originalUpdatedAt).toBe(true);
  });
});
