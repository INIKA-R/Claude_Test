import { apiClient } from "./apiClient";
import { InventoryAvailabilityRequest, InventoryAvailabilityResponse } from "../types";

export async function createInventoryAvailability(
  payload: InventoryAvailabilityRequest
): Promise<InventoryAvailabilityResponse> {
  const { data } = await apiClient.post<InventoryAvailabilityResponse>("/inventory-availability", payload);
  return data;
}
