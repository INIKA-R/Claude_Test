import { sql, getRequest } from "./db";
import { Allocation } from "../types";

export async function createAllocation(
  allocation: Allocation,
  request?: sql.Request
): Promise<void> {
  const req = await getRequest(request);
  await req
    .input("orderId", sql.VarChar(50), allocation.orderId)
    .input("warehouseId", sql.VarChar(10), allocation.warehouseId)
    .input("allocatedQuantity", sql.Int, allocation.allocatedQuantity)
    .execute("M08944_sp_CreateAllocation");
}
