import { sql, getRequest } from "./db";
import { Allocation, FulfilmentResult, FulfilmentStatus, WarehouseId } from "../types";

export async function getFulfilmentResult(
  orderId: string,
  request?: sql.Request
): Promise<FulfilmentResult | null> {
  const req = await getRequest(request);
  const result = await req
    .input("orderId", sql.VarChar(50), orderId)
    .execute("M08944_sp_GetFulfilmentResult");

  const recordsets = result.recordsets as unknown as sql.IRecordSet<any>[];
  const row = recordsets[0]?.[0];
  if (!row) {
    return null;
  }

  const allocations: Allocation[] = (recordsets[1] ?? []).map((allocationRow: any) => ({
    orderId: allocationRow.orderId,
    warehouseId: allocationRow.warehouseId as WarehouseId,
    allocatedQuantity: allocationRow.allocatedQuantity,
  }));

  return {
    orderId: row.orderId,
    status: row.status as FulfilmentStatus,
    reason: row.reason,
    releasedQuantity: row.releasedQuantity,
    backorderedQuantity: row.backorderedQuantity,
    evaluatedAt: row.evaluatedAt instanceof Date ? row.evaluatedAt.toISOString() : row.evaluatedAt,
    allocations,
  };
}

export async function saveFulfilmentResult(
  result: Pick<
    FulfilmentResult,
    "orderId" | "status" | "reason" | "releasedQuantity" | "backorderedQuantity"
  >,
  request?: sql.Request
): Promise<void> {
  const req = await getRequest(request);
  await req
    .input("orderId", sql.VarChar(50), result.orderId)
    .input("status", sql.VarChar(20), result.status)
    .input("reason", sql.VarChar(200), result.reason)
    .input("releasedQuantity", sql.Int, result.releasedQuantity)
    .input("backorderedQuantity", sql.Int, result.backorderedQuantity)
    .execute("M08944_sp_SaveFulfilmentResult");
}

// CHANGE2 (Phase 9): updates an existing FulfilmentResult row once a
// backorder is (partially or fully) fulfilled from new inventory. Unlike
// saveFulfilmentResult (INSERT, order-creation time), this assumes the row
// already exists.
export async function updateFulfilmentResult(
  result: Pick<FulfilmentResult, "orderId" | "status" | "releasedQuantity" | "backorderedQuantity">,
  request?: sql.Request
): Promise<void> {
  const req = await getRequest(request);
  await req
    .input("orderId", sql.VarChar(50), result.orderId)
    .input("status", sql.VarChar(20), result.status)
    .input("releasedQuantity", sql.Int, result.releasedQuantity)
    .input("backorderedQuantity", sql.Int, result.backorderedQuantity)
    .execute("M08944_sp_UpdateFulfilmentResult");
}
