import { withTransaction } from "../database/db";
import * as allocationRepository from "../database/allocation.repository";
import * as backorderRepository from "../database/backorder.repository";
import * as configRepository from "../database/config.repository";
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
// Change requirement (Priority partial fulfilment): reason for a Priority order
// whose combined dispatch-eligible stock is below the release threshold. Not
// given a literal string by the change request — proposed here, same as the
// FRD §4 reasons above were proposed in Phase 2.
const REASON_CANNOT_FULFIL_PRIORITY_THRESHOLD = "Cannot Fulfil Priority Threshold";

// Fixed tie-break priority — FRD §3 Rule 4, always the final tie-breaker.
// Also the fixed combination order for Priority orders (Business Change).
const WAREHOUSE_PRIORITY: WarehouseId[] = ["WH-A", "WH-B", "WH-C"];

const PRIORITY_RELEASE_THRESHOLD_CONFIG_KEY = "PriorityReleaseThresholdPct";
const DEFAULT_PRIORITY_RELEASE_THRESHOLD = 0.7;

async function getPriorityReleaseThreshold(): Promise<number> {
  const raw = await configRepository.getConfigValue(PRIORITY_RELEASE_THRESHOLD_CONFIG_KEY);
  const parsed = raw === null ? NaN : Number(raw);
  return Number.isFinite(parsed) ? parsed : DEFAULT_PRIORITY_RELEASE_THRESHOLD;
}

interface PriorityFulfilmentPlan {
  qualifies: boolean;
  releasedQuantity: number;
  backorderedQuantity: number;
  allocations: { warehouseId: WarehouseId; allocatedQuantity: number }[];
}

// Business Change: Priority orders combine dispatch-eligible stock across
// WH-A, WH-B and WH-C (fixed order) instead of requiring one warehouse to
// cover the full quantity. Released if the combined amount clears the
// configurable threshold (exactly the threshold qualifies); never allocates
// more than requested.
function planPriorityFulfilment(
  inventory: Inventory[],
  quantity: number,
  promisedDeliveryDate: string,
  threshold: number
): PriorityFulfilmentPlan {
  const eligibleByWarehouse = new Map(
    inventory
      .filter((row) => row.earliestDispatchDate <= promisedDeliveryDate)
      .map((row) => [row.warehouseId, row] as const)
  );
  const orderedRows = WAREHOUSE_PRIORITY.map((warehouseId) => eligibleByWarehouse.get(warehouseId)).filter(
    (row): row is Inventory => row !== undefined
  );

  const availableSum = orderedRows.reduce((sum, row) => sum + row.availableQuantity, 0);
  if (availableSum < quantity * threshold) {
    return { qualifies: false, releasedQuantity: 0, backorderedQuantity: 0, allocations: [] };
  }

  const releasedQuantity = Math.min(availableSum, quantity);
  const allocations: { warehouseId: WarehouseId; allocatedQuantity: number }[] = [];
  let remaining = releasedQuantity;
  for (const row of orderedRows) {
    if (remaining <= 0) break;
    const allocatedQuantity = Math.min(row.availableQuantity, remaining);
    if (allocatedQuantity > 0) {
      allocations.push({ warehouseId: row.warehouseId, allocatedQuantity });
      remaining -= allocatedQuantity;
    }
  }

  return {
    qualifies: true,
    releasedQuantity,
    backorderedQuantity: quantity - releasedQuantity,
    allocations,
  };
}

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
  let priorityPlan: PriorityFulfilmentPlan | null = null;
  if (!blockedReason) {
    const inventory = await inventoryRepository.getInventoryByProduct(payload.productId);
    if (inventory.length === 0) {
      blockedReason = REASON_PRODUCT_NOT_AVAILABLE;
    } else if (payload.customerType === "Priority") {
      // Business Change: Priority orders combine inventory across warehouses
      // instead of requiring a single-warehouse match (Standard, below).
      const threshold = await getPriorityReleaseThreshold();
      priorityPlan = planPriorityFulfilment(
        inventory,
        payload.quantity,
        payload.promisedDeliveryDate,
        threshold
      );
      if (!priorityPlan.qualifies) {
        blockedReason = REASON_CANNOT_FULFIL_PRIORITY_THRESHOLD;
      }
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

  if (priorityPlan) {
    // Business Change: Priority Released/PartiallyReleased -> persist order +
    // decision + one allocation per warehouse used, decrementing each; persist
    // an Open backorder when any quantity remains unfulfilled.
    const plan = priorityPlan;
    const status: FulfilmentStatus = plan.backorderedQuantity > 0 ? "PartiallyReleased" : "Released";
    await withTransaction(async (makeRequest) => {
      await orderRepository.createOrder(order, makeRequest());
      for (const allocation of plan.allocations) {
        await allocationRepository.createAllocation(
          {
            orderId: payload.orderId,
            warehouseId: allocation.warehouseId,
            allocatedQuantity: allocation.allocatedQuantity,
          },
          makeRequest()
        );
        await inventoryRepository.decrementInventoryQty(
          payload.productId,
          allocation.warehouseId,
          allocation.allocatedQuantity,
          makeRequest()
        );
      }
      if (plan.backorderedQuantity > 0) {
        await backorderRepository.createBackorder(payload.orderId, plan.backorderedQuantity, makeRequest());
      }
      await fulfilmentResultRepository.saveFulfilmentResult(
        {
          orderId: payload.orderId,
          status,
          reason: null,
          releasedQuantity: plan.releasedQuantity,
          backorderedQuantity: plan.backorderedQuantity,
        },
        makeRequest()
      );
    });

    return toFulfilmentResponse(payload.orderId, {
      status,
      reason: null,
      releasedQuantity: plan.releasedQuantity,
      backorderedQuantity: plan.backorderedQuantity,
      allocations: plan.allocations,
    });
  }

  // FRD §3 Rule 6: Standard Released order -> persist order + decision + allocation; decrement inventory.
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
