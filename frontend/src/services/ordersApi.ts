import { apiClient } from "./apiClient";
import { CreateOrderRequest, FulfilmentResponse } from "../types";

export async function createOrder(payload: CreateOrderRequest): Promise<FulfilmentResponse> {
  const { data } = await apiClient.post<FulfilmentResponse>("/orders", payload);
  return data;
}

export async function getOrder(orderId: string): Promise<FulfilmentResponse> {
  const { data } = await apiClient.get<FulfilmentResponse>(`/orders/${orderId}`);
  return data;
}
