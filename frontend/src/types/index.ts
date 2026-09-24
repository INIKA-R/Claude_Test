// Mirrors backend/src/types/index.ts (FRD §2, §5). No business logic here.

export type FulfilmentStatus = "Released" | "PartiallyReleased" | "Blocked";

export type CustomerType = "Standard" | "Priority";

export type WarehouseId = "WH-A" | "WH-B" | "WH-C";

export interface Allocation {
  orderId: string;
  warehouseId: WarehouseId;
  allocatedQuantity: number;
}

export interface CreateOrderRequest {
  orderId: string;
  customerId: string;
  customerType: CustomerType;
  productId: string;
  quantity: number;
  promisedDeliveryDate: string;
}

export interface FulfilmentResponse {
  orderId: string;
  status: FulfilmentStatus;
  reason: string | null;
  releasedQuantity: number;
  backorderedQuantity: number;
  allocations: Allocation[];
}
