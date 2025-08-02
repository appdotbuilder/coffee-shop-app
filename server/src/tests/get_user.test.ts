
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type CreateUserInput } from '../schema';
import { getUser } from '../handlers/get_user';

// Test user data
const testUserInput: CreateUserInput = {
  email: 'test@example.com',
  name: 'Test User',
  role: 'customer'
};

describe('getUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return user when found', async () => {
    // Create a test user first
    const insertResult = await db.insert(usersTable)
      .values(testUserInput)
      .returning()
      .execute();

    const createdUser = insertResult[0];

    // Get the user by ID
    const result = await getUser(createdUser.id);

    expect(result).not.toBeNull();
    expect(result!.id).toEqual(createdUser.id);
    expect(result!.email).toEqual('test@example.com');
    expect(result!.name).toEqual('Test User');
    expect(result!.role).toEqual('customer');
    expect(result!.created_at).toBeInstanceOf(Date);
  });

  it('should return null when user not found', async () => {
    const result = await getUser(999);

    expect(result).toBeNull();
  });

  it('should return correct user when multiple users exist', async () => {
    // Create multiple test users
    const user1Input: CreateUserInput = {
      email: 'user1@example.com',
      name: 'User One',
      role: 'customer'
    };

    const user2Input: CreateUserInput = {
      email: 'user2@example.com',
      name: 'User Two',
      role: 'admin'
    };

    const user1Result = await db.insert(usersTable)
      .values(user1Input)
      .returning()
      .execute();

    const user2Result = await db.insert(usersTable)
      .values(user2Input)
      .returning()
      .execute();

    // Get the second user
    const result = await getUser(user2Result[0].id);

    expect(result).not.toBeNull();
    expect(result!.id).toEqual(user2Result[0].id);
    expect(result!.email).toEqual('user2@example.com');
    expect(result!.name).toEqual('User Two');
    expect(result!.role).toEqual('admin');
    expect(result!.created_at).toBeInstanceOf(Date);
  });
});
