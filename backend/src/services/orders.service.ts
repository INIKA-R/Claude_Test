import { withTransaction } from "../database/db";
import * as allocationRepository from "../database/allocation.repository";
import * as customerRepository from "../database/customer.repository";
import * as fulfilmentResultRepository from "../database/fulfilmentResult.repository";
import * as inventoryRepository from "../database/inventory.repository";
import * as orderRepository from "../database/order.repository";
import { ApiError } from "../utils/ApiError";
import {
  CreateOrderRequest,
  FulfilmentResponse,
  FulfilmentStatus,
  Inventory,
  WarehouseId,
} from "../types";

// Blocking reason strings — FRD §4 (marked "proposed — confirm" for the last two).
const REASON_CREDIT_HOLD = "Blocked-CreditHold";
const REASON_ELIGIBILITY_UNKNOWN = "Eligibility Unknown";
const REASON_PRODUCT_NOT_AVAILABLE = "Product Not Available";
const REASON_CANNOT_FULFIL_SINGLE_WAREHOUSE = "Cannot Fulfil From Single Warehouse";

// Fixed tie-break priority — FRD §3 Rule 4, always the final tie-breaker.
const WAREHOUSE_PRIORITY: WarehouseId[] = ["WH-A", "WH-B", "WH-C"];

function toFulfilmentResponse(orderId: string, result: {
  status: FulfilmentStatus;
  reason: string | null;
  releasedQuantity: number;
  backorderedQuantity: number;
  allocations: { warehouseId: WarehouseId; allocatedQuantity: number }[];
}): FulfilmentResponse {
  return {
    orderId,
    status: result.status,
    reason: result.reason,
    releasedQuantity: result.releasedQuantity,
    backorderedQuantity: result.backorderedQuantity,
    allocations: result.allocations.map((a) => ({
      orderId,
      warehouseId: a.warehouseId,
      allocatedQuantity: a.allocatedQuantity,
    })),
  };
}

function selectQualifyingWarehouse(
  inventory: Inventory[],
  quantity: number,
  promisedDeliveryDate: string
): Inventory | null {
  const qualifying = inventory.filter(
    (row) => row.availableQuantity >= quantity && row.earliestDispatchDate <= promisedDeliveryDate
  );
  if (qualifying.length === 0) {
    return null;
  }
  // FRD §3 Rule 4: WH-A > WH-B > WH-C, fixed, even if stock/date identical.
  qualifying.sort(
    (a, b) => WAREHOUSE_PRIORITY.indexOf(a.warehouseId) - WAREHOUSE_PRIORITY.indexOf(b.warehouseId)
  );
  return qualifying[0];
}

export async function createOrder(payload: CreateOrderRequest): Promise<FulfilmentResponse> {
  // FRD §3 Rule 8: idempotent replay — resubmitting a completed orderId returns
  // the stored result as-is, with no reprocessing.
  const existing = await fulfilmentResultRepository.getFulfilmentResult(payload.orderId);
  if (existing) {
    return toFulfilmentResponse(existing.orderId, existing);
  }

  const customer = await customerRepository.getCustomerById(payload.customerId);
  if (!customer) {
    throw new ApiError(400, "Customer not found", { customerId: payload.customerId });
  }

  // FRD §3 Rule 1: eligibility gate.
  let blockedReason: string | null = null;
  if (customer.eligibilityStatus === "CreditHold") {
    blockedReason = REASON_CREDIT_HOLD;
  } else if (customer.eligibilityStatus === "Unknown") {
    blockedReason = REASON_ELIGIBILITY_UNKNOWN;
  }

  let selectedWarehouse: Inventory | null = null;
  if (!blockedReason) {
    const inventory = await inventoryRepository.getInventoryByProduct(payload.productId);
    if (inventory.length === 0) {
      blockedReason = REASON_PRODUCT_NOT_AVAILABLE;
    } else {
      // FRD §3 Rules 2-3: no cross-warehouse combination; full qty from one warehouse.
      selectedWarehouse = selectQualifyingWarehouse(
        inventory,
        payload.quantity,
        payload.promisedDeliveryDate
      );
      if (!selectedWarehouse) {
        blockedReason = REASON_CANNOT_FULFIL_SINGLE_WAREHOUSE;
      }
    }
  }

  const order = {
    orderId: payload.orderId,
    customerId: payload.customerId,
    customerType: payload.customerType,
    productId: payload.productId,
    quantity: payload.quantity,
    promisedDeliveryDate: payload.promisedDeliveryDate,
  };

  if (blockedReason) {
    // FRD §3 Rule 7: Blocked order -> persist order + decision only.
    await withTransaction(async (makeRequest) => {
      await orderRepository.createOrder(order, makeRequest());
      await fulfilmentResultRepository.saveFulfilmentResult(
        {
          orderId: payload.orderId,
          status: "Blocked",
          reason: blockedReason,
          releasedQuantity: 0,
          backorderedQuantity: 0,
        },
        makeRequest()
      );
    });

    return toFulfilmentResponse(payload.orderId, {
      status: "Blocked",
      reason: blockedReason,
      releasedQuantity: 0,
      backorderedQuantity: 0,
      allocations: [],
    });
  }

  // FRD §3 Rule 6: Released order -> persist order + decision + allocation; decrement inventory.
  const warehouse = selectedWarehouse as Inventory;
  await withTransaction(async (makeRequest) => {
    await orderRepository.createOrder(order, makeRequest());
    await allocationRepository.createAllocation(
      { orderId: payload.orderId, warehouseId: warehouse.warehouseId, allocatedQuantity: payload.quantity },
      makeRequest()
    );
    await inventoryRepository.decrementInventoryQty(
      payload.productId,
      warehouse.warehouseId,
      payload.quantity,
      makeRequest()
    );
    await fulfilmentResultRepository.saveFulfilmentResult(
      {
        orderId: payload.orderId,
        status: "Released",
        reason: null,
        releasedQuantity: payload.quantity,
        backorderedQuantity: 0,
      },
      makeRequest()
    );
  });

  return toFulfilmentResponse(payload.orderId, {
    status: "Released",
    reason: null,
    releasedQuantity: payload.quantity,
    backorderedQuantity: 0,
    allocations: [{ warehouseId: warehouse.warehouseId, allocatedQuantity: payload.quantity }],
  });
}

export async function getFulfilmentResult(orderId: string): Promise<FulfilmentResponse | null> {
  const result = await fulfilmentResultRepository.getFulfilmentResult(orderId);
  if (!result) {
    return null;
  }
  return toFulfilmentResponse(result.orderId, result);
}
