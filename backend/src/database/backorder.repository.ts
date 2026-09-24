import { sql, getRequest } from "./db";
import { Backorder, BackorderStatus } from "../types";

export async function createBackorder(
  orderId: string,
  backorderedQuantity: number,
  request?: sql.Request
): Promise<void> {
  const req = await getRequest(request);
  await req
    .input("orderId", sql.VarChar(50), orderId)
    .input("backorderedQuantity", sql.Int, backorderedQuantity)
    .execute("M08944_sp_CreateBackorder");
}

export async function getOldestOpenBackorderByProduct(
  productId: string,
  request?: sql.Request
): Promise<Backorder | null> {
  const req = await getRequest(request);
  const result = await req
    .input("productId", sql.VarChar(50), productId)
    .execute("M08944_sp_GetOldestOpenBackorderByProduct");
  const row = result.recordset[0];
  if (!row) {
    return null;
  }
  return {
    orderId: row.orderId,
    backorderedQuantity: row.backorderedQuantity,
    remainingQuantity: row.remainingQuantity,
    status: row.status as BackorderStatus,
    createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : row.createdAt,
  };
}

export async function updateBackorder(
  orderId: string,
  remainingQuantity: number,
  status: BackorderStatus,
  request?: sql.Request
): Promise<void> {
  const req = await getRequest(request);
  await req
    .input("orderId", sql.VarChar(50), orderId)
    .input("remainingQuantity", sql.Int, remainingQuantity)
    .input("status", sql.VarChar(20), status)
    .execute("M08944_sp_UpdateBackorder");
}
