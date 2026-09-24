import { apiClient } from "./apiClient";
import { Inventory, CreateInventoryRequest, UpdateInventoryRequest } from "../types";

export async function listInventory(): Promise<Inventory[]> {
  const { data } = await apiClient.get<Inventory[]>("/inventory");
  return data;
}

export async function createInventory(payload: CreateInventoryRequest): Promise<Inventory> {
  const { data } = await apiClient.post<Inventory>("/inventory", payload);
  return data;
}

export async function updateInventory(
  productId: string,
  warehouseId: string,
  payload: UpdateInventoryRequest
): Promise<Inventory> {
  const { data } = await apiClient.put<Inventory>(
    `/inventory/${productId}/${warehouseId}`,
    payload
  );
  return data;
}

export async function deleteInventory(productId: string, warehouseId: string): Promise<void> {
  await apiClient.delete(`/inventory/${productId}/${warehouseId}`);
}
