
import { db } from '../db';
import { ordersTable, orderItemsTable, coffeeProductsTable, usersTable } from '../db/schema';
import { type OrderWithItems } from '../schema';
import { eq, and } from 'drizzle-orm';

export const getOrder = async (id: number, userId?: number): Promise<OrderWithItems | null> => {
  try {
    // Build base query with all necessary joins
    const baseQuery = db.select()
      .from(ordersTable)
      .innerJoin(usersTable, eq(ordersTable.user_id, usersTable.id))
      .leftJoin(orderItemsTable, eq(orderItemsTable.order_id, ordersTable.id))
      .leftJoin(coffeeProductsTable, eq(orderItemsTable.product_id, coffeeProductsTable.id));

    // Apply conditions
    const conditions = [eq(ordersTable.id, id)];
    if (userId !== undefined) {
      conditions.push(eq(ordersTable.user_id, userId));
    }

    const query = conditions.length === 1 
      ? baseQuery.where(conditions[0])
      : baseQuery.where(and(...conditions));

    const results = await query.execute();

    if (results.length === 0) {
      return null;
    }

    // Group results to build the order with items structure
    const firstResult = results[0];
    const order = {
      id: firstResult.orders.id,
      user_id: firstResult.orders.user_id,
      total_amount: parseFloat(firstResult.orders.total_amount),
      status: firstResult.orders.status,
      created_at: firstResult.orders.created_at,
      updated_at: firstResult.orders.updated_at,
      user: {
        id: firstResult.users.id,
        email: firstResult.users.email,
        name: firstResult.users.name,
        role: firstResult.users.role,
        created_at: firstResult.users.created_at
      },
      items: [] as any[]
    };

    // Build items array, handling cases where order has no items
    const itemsMap = new Map();
    for (const result of results) {
      if (result.order_items && result.coffee_products) {
        const itemId = result.order_items.id;
        if (!itemsMap.has(itemId)) {
          itemsMap.set(itemId, {
            id: result.order_items.id,
            order_id: result.order_items.order_id,
            product_id: result.order_items.product_id,
            quantity: result.order_items.quantity,
            price_at_time: parseFloat(result.order_items.price_at_time),
            created_at: result.order_items.created_at,
            product: {
              id: result.coffee_products.id,
              name: result.coffee_products.name,
              description: result.coffee_products.description,
              price: parseFloat(result.coffee_products.price),
              image_url: result.coffee_products.image_url,
              origin: result.coffee_products.origin,
              roast_type: result.coffee_products.roast_type,
              stock_quantity: result.coffee_products.stock_quantity,
              created_at: result.coffee_products.created_at,
              updated_at: result.coffee_products.updated_at
            }
          });
        }
      }
    }

    order.items = Array.from(itemsMap.values());

    return order as OrderWithItems;
  } catch (error) {
    console.error('Get order failed:', error);
    throw error;
  }
};
