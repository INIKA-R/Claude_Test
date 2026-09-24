import * as inventoryRepository from "../database/inventory.repository";
import { CreateInventoryRequest, Inventory, UpdateInventoryRequest, WarehouseId } from "../types";
import { ApiError } from "../utils/ApiError";

export async function listInventory(): Promise<Inventory[]> {
  return inventoryRepository.getAllInventory();
}

export async function getInventory(productId: string, warehouseId: string): Promise<Inventory> {
  const inventory = await inventoryRepository.getInventoryByKey(productId, warehouseId);
  if (!inventory) {
    throw new ApiError(404, "Inventory row not found", { productId, warehouseId });
  }
  return inventory;
}

export async function createInventory(payload: CreateInventoryRequest): Promise<Inventory> {
  const existing = await inventoryRepository.getInventoryByKey(payload.productId, payload.warehouseId);
  if (existing) {
    throw new ApiError(409, "Inventory row already exists", {
      productId: payload.productId,
      warehouseId: payload.warehouseId,
    });
  }
  await inventoryRepository.createInventory(payload);
  return payload;
}

export async function updateInventory(
  productId: string,
  warehouseId: WarehouseId,
  payload: UpdateInventoryRequest
): Promise<Inventory> {
  const existing = await inventoryRepository.getInventoryByKey(productId, warehouseId);
  if (!existing) {
    throw new ApiError(404, "Inventory row not found", { productId, warehouseId });
  }
  await inventoryRepository.updateInventory(productId, warehouseId, payload);
  return { productId, warehouseId, ...payload };
}

export async function deleteInventory(productId: string, warehouseId: string): Promise<void> {
  const existing = await inventoryRepository.getInventoryByKey(productId, warehouseId);
  if (!existing) {
    throw new ApiError(404, "Inventory row not found", { productId, warehouseId });
  }
  await inventoryRepository.deleteInventory(productId, warehouseId);
}
