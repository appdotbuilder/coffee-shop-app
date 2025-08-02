
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { coffeeProductsTable } from '../db/schema';
import { type CreateCoffeeProductInput } from '../schema';
import { getCoffeeProducts } from '../handlers/get_coffee_products';

// Test coffee products
const testProducts: CreateCoffeeProductInput[] = [
  {
    name: 'Ethiopian Yirgacheffe',
    description: 'Bright and floral single-origin coffee',
    price: 24.99,
    image_url: 'https://example.com/ethiopian.jpg',
    origin: 'Ethiopia',
    roast_type: 'light',
    stock_quantity: 50
  },
  {
    name: 'Colombian Supremo',
    description: 'Rich and balanced medium roast',
    price: 19.99,
    image_url: null,
    origin: 'Colombia',
    roast_type: 'medium',
    stock_quantity: 30
  },
  {
    name: 'French Roast',
    description: 'Bold and smoky dark roast',
    price: 17.99,
    image_url: 'https://example.com/french.jpg',
    origin: 'Brazil',
    roast_type: 'dark',
    stock_quantity: 0
  }
];

describe('getCoffeeProducts', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no products exist', async () => {
    const result = await getCoffeeProducts();
    expect(result).toEqual([]);
  });

  it('should return all coffee products', async () => {
    // Insert test products
    await db.insert(coffeeProductsTable)
      .values(testProducts.map(product => ({
        ...product,
        price: product.price.toString() // Convert number to string for insertion
      })))
      .execute();

    const result = await getCoffeeProducts();

    expect(result).toHaveLength(3);
    
    // Verify first product
    const ethiopian = result.find(p => p.name === 'Ethiopian Yirgacheffe');
    expect(ethiopian).toBeDefined();
    expect(ethiopian!.description).toEqual('Bright and floral single-origin coffee');
    expect(ethiopian!.price).toEqual(24.99);
    expect(typeof ethiopian!.price).toEqual('number');
    expect(ethiopian!.origin).toEqual('Ethiopia');
    expect(ethiopian!.roast_type).toEqual('light');
    expect(ethiopian!.stock_quantity).toEqual(50);
    expect(ethiopian!.id).toBeDefined();
    expect(ethiopian!.created_at).toBeInstanceOf(Date);
    expect(ethiopian!.updated_at).toBeInstanceOf(Date);

    // Verify product with null image_url
    const colombian = result.find(p => p.name === 'Colombian Supremo');
    expect(colombian).toBeDefined();
    expect(colombian!.image_url).toBeNull();
    expect(colombian!.price).toEqual(19.99);
    expect(typeof colombian!.price).toEqual('number');

    // Verify out of stock product
    const french = result.find(p => p.name === 'French Roast');
    expect(french).toBeDefined();
    expect(french!.stock_quantity).toEqual(0);
    expect(french!.roast_type).toEqual('dark');
  });

  it('should handle products with different roast types', async () => {
    await db.insert(coffeeProductsTable)
      .values(testProducts.map(product => ({
        ...product,
        price: product.price.toString()
      })))
      .execute();

    const result = await getCoffeeProducts();

    const roastTypes = result.map(p => p.roast_type);
    expect(roastTypes).toContain('light');
    expect(roastTypes).toContain('medium');
    expect(roastTypes).toContain('dark');
  });

  it('should preserve all database fields correctly', async () => {
    // Insert single product
    await db.insert(coffeeProductsTable)
      .values({
        name: 'Test Coffee',
        description: 'Test description',
        price: '15.50',
        image_url: 'https://example.com/test.jpg',
        origin: 'Test Origin',
        roast_type: 'medium',
        stock_quantity: 25
      })
      .execute();

    const result = await getCoffeeProducts();

    expect(result).toHaveLength(1);
    const product = result[0];
    
    // Verify all fields are present and correctly typed
    expect(typeof product.id).toEqual('number');
    expect(typeof product.name).toEqual('string');
    expect(typeof product.description).toEqual('string');
    expect(typeof product.price).toEqual('number');
    expect(typeof product.image_url).toEqual('string');
    expect(typeof product.origin).toEqual('string');
    expect(typeof product.roast_type).toEqual('string');
    expect(typeof product.stock_quantity).toEqual('number');
    expect(product.created_at).toBeInstanceOf(Date);
    expect(product.updated_at).toBeInstanceOf(Date);
  });
});
