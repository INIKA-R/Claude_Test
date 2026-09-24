import { sql, getRequest } from "./db";
import { Inventory, WarehouseId } from "../types";

function toInventory(row: any): Inventory {
  return {
    productId: row.productId,
    warehouseId: row.warehouseId,
    availableQuantity: row.availableQuantity,
    earliestDispatchDate:
      row.earliestDispatchDate instanceof Date
        ? row.earliestDispatchDate.toISOString().slice(0, 10)
        : row.earliestDispatchDate,
  };
}

export async function getInventoryByProduct(
  productId: string,
  request?: sql.Request
): Promise<Inventory[]> {
  const req = await getRequest(request);
  const result = await req
    .input("productId", sql.VarChar(50), productId)
    .execute("M08944_sp_GetInventoryByProduct");
  return result.recordset.map(toInventory);
}

export async function getInventoryByKey(
  productId: string,
  warehouseId: string,
  request?: sql.Request
): Promise<Inventory | null> {
  const req = await getRequest(request);
  const result = await req
    .input("productId", sql.VarChar(50), productId)
    .input("warehouseId", sql.VarChar(10), warehouseId)
    .execute("M08944_sp_GetInventoryByKey");
  const row = result.recordset[0];
  return row ? toInventory(row) : null;
}

export async function getAllInventory(request?: sql.Request): Promise<Inventory[]> {
  const req = await getRequest(request);
  const result = await req.execute("M08944_sp_GetAllInventory");
  return result.recordset.map(toInventory);
}

export async function createInventory(
  inventory: Inventory,
  request?: sql.Request
): Promise<void> {
  const req = await getRequest(request);
  await req
    .input("productId", sql.VarChar(50), inventory.productId)
    .input("warehouseId", sql.VarChar(10), inventory.warehouseId)
    .input("availableQuantity", sql.Int, inventory.availableQuantity)
    .input("earliestDispatchDate", sql.Date, inventory.earliestDispatchDate)
    .execute("M08944_sp_CreateInventory");
}

export async function updateInventory(
  productId: string,
  warehouseId: WarehouseId,
  fields: { availableQuantity: number; earliestDispatchDate: string },
  request?: sql.Request
): Promise<void> {
  const req = await getRequest(request);
  await req
    .input("productId", sql.VarChar(50), productId)
    .input("warehouseId", sql.VarChar(10), warehouseId)
    .input("availableQuantity", sql.Int, fields.availableQuantity)
    .input("earliestDispatchDate", sql.Date, fields.earliestDispatchDate)
    .execute("M08944_sp_UpdateInventory");
}

export async function deleteInventory(
  productId: string,
  warehouseId: string,
  request?: sql.Request
): Promise<void> {
  const req = await getRequest(request);
  await req
    .input("productId", sql.VarChar(50), productId)
    .input("warehouseId", sql.VarChar(10), warehouseId)
    .execute("M08944_sp_DeleteInventory");
}

export async function decrementInventoryQty(
  productId: string,
  warehouseId: WarehouseId,
  quantity: number,
  request?: sql.Request
): Promise<void> {
  const req = await getRequest(request);
  await req
    .input("productId", sql.VarChar(50), productId)
    .input("warehouseId", sql.VarChar(10), warehouseId)
    .input("quantity", sql.Int, quantity)
    .execute("M08944_sp_UpdateInventoryQty");
}
