// Domain types mirroring FRD §2 entities. No business logic here.

export type EligibilityStatus = "Eligible" | "CreditHold" | "Unknown";

export type WarehouseId = "WH-A" | "WH-B" | "WH-C";

export type CustomerType = "Standard" | "Priority";

export type FulfilmentStatus = "Released" | "PartiallyReleased" | "Blocked";

export interface Customer {
  customerId: string;
  eligibilityStatus: EligibilityStatus;
}

export interface Inventory {
  productId: string;
  warehouseId: WarehouseId;
  availableQuantity: number;
  earliestDispatchDate: string; // YYYY-MM-DD
}

export interface Order {
  orderId: string;
  customerId: string;
  customerType: CustomerType;
  productId: string;
  quantity: number;
  promisedDeliveryDate: string; // YYYY-MM-DD
}

export interface Allocation {
  orderId: string;
  warehouseId: WarehouseId;
  allocatedQuantity: number;
}

export interface FulfilmentResult {
  orderId: string;
  status: FulfilmentStatus;
  reason: string | null;
  releasedQuantity: number;
  backorderedQuantity: number;
  evaluatedAt: string;
  allocations: Allocation[];
}

// Request/response shapes per FRD §5

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

export interface ApiErrorResponse {
  error: string;
  details?: unknown;
}

// Customer/Inventory master-data CRUD request shapes (not specified in FRD §5;
// designed to match the entity fields in FRD §2).

export interface CreateCustomerRequest {
  customerId: string;
  eligibilityStatus: EligibilityStatus;
}

export interface UpdateCustomerRequest {
  eligibilityStatus: EligibilityStatus;
}

export interface CreateInventoryRequest {
  productId: string;
  warehouseId: WarehouseId;
  availableQuantity: number;
  earliestDispatchDate: string;
}

export interface UpdateInventoryRequest {
  availableQuantity: number;
  earliestDispatchDate: string;
}
