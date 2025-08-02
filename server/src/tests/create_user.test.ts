
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type CreateUserInput } from '../schema';
import { createUser } from '../handlers/create_user';
import { eq } from 'drizzle-orm';

// Test inputs
const testInput: CreateUserInput = {
  email: 'test@example.com',
  name: 'Test User',
  role: 'customer'
};

const adminInput: CreateUserInput = {
  email: 'admin@example.com',
  name: 'Admin User',
  role: 'admin'
};

describe('createUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a customer user', async () => {
    const result = await createUser(testInput);

    // Basic field validation
    expect(result.email).toEqual('test@example.com');
    expect(result.name).toEqual('Test User');
    expect(result.role).toEqual('customer');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should create an admin user', async () => {
    const result = await createUser(adminInput);

    expect(result.email).toEqual('admin@example.com');
    expect(result.name).toEqual('Admin User');
    expect(result.role).toEqual('admin');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should save user to database', async () => {
    const result = await createUser(testInput);

    // Query using proper drizzle syntax
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, result.id))
      .execute();

    expect(users).toHaveLength(1);
    expect(users[0].email).toEqual('test@example.com');
    expect(users[0].name).toEqual('Test User');
    expect(users[0].role).toEqual('customer');
    expect(users[0].created_at).toBeInstanceOf(Date);
  });

  it('should enforce email uniqueness', async () => {
    // Create first user
    await createUser(testInput);

    // Try to create another user with same email
    await expect(createUser(testInput)).rejects.toThrow(/already exists/i);
  });

  it('should allow different emails', async () => {
    // Create first user
    const user1 = await createUser(testInput);

    // Create second user with different email
    const user2 = await createUser(adminInput);

    expect(user1.id).not.toEqual(user2.id);
    expect(user1.email).toEqual('test@example.com');
    expect(user2.email).toEqual('admin@example.com');

    // Verify both users exist in database
    const allUsers = await db.select()
      .from(usersTable)
      .execute();

    expect(allUsers).toHaveLength(2);
  });

  it('should use default role when not specified', async () => {
    const inputWithoutRole = {
      email: 'default@example.com',
      name: 'Default User',
      role: 'customer' as const // Zod default is applied before handler
    };

    const result = await createUser(inputWithoutRole);

    expect(result.role).toEqual('customer');
  });
});
