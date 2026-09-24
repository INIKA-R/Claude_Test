import { sql, getRequest } from "./db";
import { Order } from "../types";

export async function createOrder(order: Order, request?: sql.Request): Promise<void> {
  const req = await getRequest(request);
  await req
    .input("orderId", sql.VarChar(50), order.orderId)
    .input("customerId", sql.VarChar(50), order.customerId)
    .input("customerType", sql.VarChar(20), order.customerType)
    .input("productId", sql.VarChar(50), order.productId)
    .input("quantity", sql.Int, order.quantity)
    .input("promisedDeliveryDate", sql.Date, order.promisedDeliveryDate)
    .execute("M08944_sp_CreateOrder");
}
