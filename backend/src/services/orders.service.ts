import { CreateOrderRequest, FulfilmentResponse } from "../types";

// Business rules (FRD §3) are implemented in a later phase. Scaffolding only.

export async function createOrder(
  _payload: CreateOrderRequest
): Promise<FulfilmentResponse> {
  throw new Error("Not implemented");
}

export async function getFulfilmentResult(
  _orderId: string
): Promise<FulfilmentResponse | null> {
  throw new Error("Not implemented");
}
