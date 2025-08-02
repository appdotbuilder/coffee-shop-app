
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { coffeeProductsTable } from '../db/schema';
import { type CreateCoffeeProductInput } from '../schema';
import { getCoffeeProduct } from '../handlers/get_coffee_product';

// Test coffee product data
const testProduct: CreateCoffeeProductInput = {
  name: 'Ethiopian Yirgacheffe',
  description: 'A bright and floral coffee with citrus notes',
  price: 24.99,
  image_url: 'https://example.com/coffee.jpg',
  origin: 'Ethiopia',
  roast_type: 'light',
  stock_quantity: 50
};

describe('getCoffeeProduct', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return a coffee product by id', async () => {
    // Create a test product
    const insertResult = await db.insert(coffeeProductsTable)
      .values({
        ...testProduct,
        price: testProduct.price.toString()
      })
      .returning()
      .execute();

    const createdProduct = insertResult[0];

    // Get the product
    const result = await getCoffeeProduct(createdProduct.id);

    expect(result).not.toBeNull();
    expect(result!.id).toEqual(createdProduct.id);
    expect(result!.name).toEqual('Ethiopian Yirgacheffe');
    expect(result!.description).toEqual(testProduct.description);
    expect(result!.price).toEqual(24.99);
    expect(typeof result!.price).toBe('number');
    expect(result!.image_url).toEqual(testProduct.image_url);
    expect(result!.origin).toEqual('Ethiopia');
    expect(result!.roast_type).toEqual('light');
    expect(result!.stock_quantity).toEqual(50);
    expect(result!.created_at).toBeInstanceOf(Date);
    expect(result!.updated_at).toBeInstanceOf(Date);
  });

  it('should return null for non-existent product', async () => {
    const result = await getCoffeeProduct(999);
    expect(result).toBeNull();
  });

  it('should handle product with null image_url', async () => {
    // Create product without image_url
    const productWithoutImage = {
      ...testProduct,
      image_url: null
    };

    const insertResult = await db.insert(coffeeProductsTable)
      .values({
        ...productWithoutImage,
        price: productWithoutImage.price.toString()
      })
      .returning()
      .execute();

    const createdProduct = insertResult[0];

    const result = await getCoffeeProduct(createdProduct.id);

    expect(result).not.toBeNull();
    expect(result!.image_url).toBeNull();
    expect(result!.name).toEqual(testProduct.name);
  });

  it('should correctly convert numeric price field', async () => {
    const expensiveProduct = {
      ...testProduct,
      price: 199.95
    };

    const insertResult = await db.insert(coffeeProductsTable)
      .values({
        ...expensiveProduct,
        price: expensiveProduct.price.toString()
      })
      .returning()
      .execute();

    const createdProduct = insertResult[0];

    const result = await getCoffeeProduct(createdProduct.id);

    expect(result).not.toBeNull();
    expect(result!.price).toEqual(199.95);
    expect(typeof result!.price).toBe('number');
  });
});
