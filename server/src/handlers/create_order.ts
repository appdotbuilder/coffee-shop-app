
import { db } from '../db';
import { usersTable, cartItemsTable, coffeeProductsTable, ordersTable, orderItemsTable } from '../db/schema';
import { type CreateOrderInput, type OrderWithItems } from '../schema';
import { eq, and, SQL } from 'drizzle-orm';

export const createOrder = async (input: CreateOrderInput): Promise<OrderWithItems> => {
  try {
    // Verify user exists
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, input.user_id))
      .execute();

    if (users.length === 0) {
      throw new Error('User not found');
    }

    const user = users[0];

    // Get cart items with product details
    const cartItems = await db.select()
      .from(cartItemsTable)
      .innerJoin(coffeeProductsTable, eq(cartItemsTable.product_id, coffeeProductsTable.id))
      .where(eq(cartItemsTable.user_id, input.user_id))
      .execute();

    if (cartItems.length === 0) {
      throw new Error('Cart is empty');
    }

    // Validate stock availability and calculate total
    let totalAmount = 0;
    const orderItemsData: Array<{
      product_id: number;
      quantity: number;
      price_at_time: string;
    }> = [];

    for (const cartItem of cartItems) {
      const product = cartItem.coffee_products;
      const quantity = cartItem.cart_items.quantity;

      if (product.stock_quantity < quantity) {
        throw new Error(`Insufficient stock for product: ${product.name}`);
      }

      const price = parseFloat(product.price);
      totalAmount += price * quantity;

      orderItemsData.push({
        product_id: product.id,
        quantity: quantity,
        price_at_time: price.toString()
      });
    }

    // Create order
    const orderResult = await db.insert(ordersTable)
      .values({
        user_id: input.user_id,
        total_amount: totalAmount.toString(),
        status: 'pending'
      })
      .returning()
      .execute();

    const order = orderResult[0];

    // Create order items
    const orderItemsWithOrderId = orderItemsData.map(item => ({
      ...item,
      order_id: order.id
    }));

    const createdOrderItems = await db.insert(orderItemsTable)
      .values(orderItemsWithOrderId)
      .returning()
      .execute();

    // Update product stock quantities
    for (const cartItem of cartItems) {
      const product = cartItem.coffee_products;
      const quantity = cartItem.cart_items.quantity;
      
      await db.update(coffeeProductsTable)
        .set({
          stock_quantity: product.stock_quantity - quantity,
          updated_at: new Date()
        })
        .where(eq(coffeeProductsTable.id, product.id))
        .execute();
    }

    // Clear user's cart
    await db.delete(cartItemsTable)
      .where(eq(cartItemsTable.user_id, input.user_id))
      .execute();

    // Get complete order with items and products
    const completeOrderItems = await db.select()
      .from(orderItemsTable)
      .innerJoin(coffeeProductsTable, eq(orderItemsTable.product_id, coffeeProductsTable.id))
      .where(eq(orderItemsTable.order_id, order.id))
      .execute();

    // Build the response
    const orderWithItems: OrderWithItems = {
      id: order.id,
      user_id: order.user_id,
      total_amount: parseFloat(order.total_amount),
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
      items: completeOrderItems.map(item => ({
        id: item.order_items.id,
        order_id: item.order_items.order_id,
        product_id: item.order_items.product_id,
        quantity: item.order_items.quantity,
        price_at_time: parseFloat(item.order_items.price_at_time),
        created_at: item.order_items.created_at,
        product: {
          id: item.coffee_products.id,
          name: item.coffee_products.name,
          description: item.coffee_products.description,
          price: parseFloat(item.coffee_products.price),
          image_url: item.coffee_products.image_url,
          origin: item.coffee_products.origin,
          roast_type: item.coffee_products.roast_type,
          stock_quantity: item.coffee_products.stock_quantity,
          created_at: item.coffee_products.created_at,
          updated_at: item.coffee_products.updated_at
        }
      }))
    };

    return orderWithItems;
  } catch (error) {
    console.error('Order creation failed:', error);
    throw error;
  }
};
