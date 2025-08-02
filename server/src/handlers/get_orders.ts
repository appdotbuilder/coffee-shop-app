
import { db } from '../db';
import { ordersTable, orderItemsTable, coffeeProductsTable, usersTable } from '../db/schema';
import { type OrderWithItems } from '../schema';
import { eq, desc } from 'drizzle-orm';

export const getOrders = async (userId?: number): Promise<OrderWithItems[]> => {
  try {
    // Build the complete query with all joins
    let baseQuery = db.select()
      .from(ordersTable)
      .innerJoin(usersTable, eq(ordersTable.user_id, usersTable.id))
      .leftJoin(orderItemsTable, eq(ordersTable.id, orderItemsTable.order_id))
      .leftJoin(coffeeProductsTable, eq(orderItemsTable.product_id, coffeeProductsTable.id))
      .orderBy(desc(ordersTable.created_at));

    // Apply user filter if provided
    const results = userId !== undefined 
      ? await baseQuery.where(eq(ordersTable.user_id, userId)).execute()
      : await baseQuery.execute();

    // Group results by order ID and structure the data
    const ordersMap = new Map<number, OrderWithItems>();

    for (const result of results) {
      const order = result.orders;
      const user = result.users;
      const orderItem = result.order_items;
      const product = result.coffee_products;

      if (!ordersMap.has(order.id)) {
        ordersMap.set(order.id, {
          id: order.id,
          user_id: order.user_id,
          total_amount: parseFloat(order.total_amount), // Convert numeric to number
          status: order.status,
          created_at: order.created_at,
          updated_at: order.updated_at,
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            created_at: user.created_at
          },
          items: []
        });
      }

      // Add order item if it exists (left join might return null)
      if (orderItem && product) {
        const existingOrder = ordersMap.get(order.id)!;
        existingOrder.items.push({
          id: orderItem.id,
          order_id: orderItem.order_id,
          product_id: orderItem.product_id,
          quantity: orderItem.quantity,
          price_at_time: parseFloat(orderItem.price_at_time), // Convert numeric to number
          created_at: orderItem.created_at,
          product: {
            id: product.id,
            name: product.name,
            description: product.description,
            price: parseFloat(product.price), // Convert numeric to number
            image_url: product.image_url,
            origin: product.origin,
            roast_type: product.roast_type,
            stock_quantity: product.stock_quantity,
            created_at: product.created_at,
            updated_at: product.updated_at
          }
        });
      }
    }

    return Array.from(ordersMap.values());
  } catch (error) {
    console.error('Get orders failed:', error);
    throw error;
  }
};
