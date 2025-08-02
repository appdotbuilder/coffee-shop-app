
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { coffeeProductsTable } from '../db/schema';
import { type CreateCoffeeProductInput } from '../schema';
import { createCoffeeProduct } from '../handlers/create_coffee_product';
import { eq } from 'drizzle-orm';

// Test input with all required fields
const testInput: CreateCoffeeProductInput = {
  name: 'Ethiopian Yirgacheffe',
  description: 'Bright and floral coffee with citrus notes',
  price: 24.99,
  image_url: 'https://example.com/ethiopian-coffee.jpg',
  origin: 'Ethiopia',
  roast_type: 'light',
  stock_quantity: 50
};

// Test input with null image_url
const testInputWithNullImage: CreateCoffeeProductInput = {
  name: 'Colombian Supremo',
  description: 'Rich and balanced coffee with chocolate undertones',
  price: 19.99,
  image_url: null,
  origin: 'Colombia',
  roast_type: 'medium',
  stock_quantity: 75
};

describe('createCoffeeProduct', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a coffee product with all fields', async () => {
    const result = await createCoffeeProduct(testInput);

    // Basic field validation
    expect(result.name).toEqual('Ethiopian Yirgacheffe');
    expect(result.description).toEqual(testInput.description);
    expect(result.price).toEqual(24.99);
    expect(typeof result.price).toBe('number');
    expect(result.image_url).toEqual('https://example.com/ethiopian-coffee.jpg');
    expect(result.origin).toEqual('Ethiopia');
    expect(result.roast_type).toEqual('light');
    expect(result.stock_quantity).toEqual(50);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should create a coffee product with null image_url', async () => {
    const result = await createCoffeeProduct(testInputWithNullImage);

    expect(result.name).toEqual('Colombian Supremo');
    expect(result.image_url).toBeNull();
    expect(result.origin).toEqual('Colombia');
    expect(result.roast_type).toEqual('medium');
    expect(result.price).toEqual(19.99);
    expect(typeof result.price).toBe('number');
  });

  it('should save coffee product to database', async () => {
    const result = await createCoffeeProduct(testInput);

    // Query using proper drizzle syntax
    const products = await db.select()
      .from(coffeeProductsTable)
      .where(eq(coffeeProductsTable.id, result.id))
      .execute();

    expect(products).toHaveLength(1);
    expect(products[0].name).toEqual('Ethiopian Yirgacheffe');
    expect(products[0].description).toEqual(testInput.description);
    expect(parseFloat(products[0].price)).toEqual(24.99);
    expect(products[0].image_url).toEqual('https://example.com/ethiopian-coffee.jpg');
    expect(products[0].origin).toEqual('Ethiopia');
    expect(products[0].roast_type).toEqual('light');
    expect(products[0].stock_quantity).toEqual(50);
    expect(products[0].created_at).toBeInstanceOf(Date);
    expect(products[0].updated_at).toBeInstanceOf(Date);
  });

  it('should handle different roast types', async () => {
    const darkRoastInput: CreateCoffeeProductInput = {
      ...testInput,
      name: 'Dark Roast Blend',
      roast_type: 'dark'
    };

    const result = await createCoffeeProduct(darkRoastInput);

    expect(result.roast_type).toEqual('dark');
    expect(result.name).toEqual('Dark Roast Blend');
  });

  it('should handle zero stock quantity', async () => {
    const outOfStockInput: CreateCoffeeProductInput = {
      ...testInput,
      name: 'Out of Stock Coffee',
      stock_quantity: 0
    };

    const result = await createCoffeeProduct(outOfStockInput);

    expect(result.stock_quantity).toEqual(0);
    expect(result.name).toEqual('Out of Stock Coffee');
  });
});
