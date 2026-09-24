import { sql, withTransaction } from "../database/db";
import * as allocationRepository from "../database/allocation.repository";
import * as backorderRepository from "../database/backorder.repository";
import * as fulfilmentResultRepository from "../database/fulfilmentResult.repository";
import * as inventoryRepository from "../database/inventory.repository";
import { ApiError } from "../utils/ApiError";
import { FulfilmentStatus, InventoryAvailabilityRequest, InventoryAvailabilityResponse, WarehouseId } from "../types";

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

// CHANGE2: records newly available inventory for a product/warehouse, net of
// whatever gets allocated to a backorder in the same call. Reuses the Stage
// 1/2 decrement proc with a negative delta to apply the net increase — same
// "adjust availableQuantity" SQL operation, no new proc needed for this.
async function recordNewInventoryArrival(
  productId: string,
  warehouseId: WarehouseId,
  submittedAvailableQuantity: number,
  allocatedQuantity: number,
  makeRequest: () => sql.Request
): Promise<void> {
  const existing = await inventoryRepository.getInventoryByKey(productId, warehouseId, makeRequest());
  const netIncrease = submittedAvailableQuantity - allocatedQuantity; // never negative: allocatedQuantity never exceeds what was submitted

  if (existing) {
    if (netIncrease !== 0) {
      await inventoryRepository.decrementInventoryQty(productId, warehouseId, -netIncrease, makeRequest());
    }
    return;
  }

  // No inventory row existed yet for this product/warehouse — not covered by
  // the change request, which assumes one already exists. Create it now;
  // earliestDispatchDate defaults to today since the stock is being reported
  // available right now. Flagged the same way Phase 2's FRD gaps were.
  await inventoryRepository.createInventory(
    { productId, warehouseId, availableQuantity: netIncrease, earliestDispatchDate: today() },
    makeRequest()
  );
}

export async function applyInventoryAvailability(
  payload: InventoryAvailabilityRequest
): Promise<InventoryAvailabilityResponse> {
  const backorder = await backorderRepository.getOldestOpenBackorderByProduct(payload.productId);

  if (!backorder) {
    // Still record the new stock even though there's nothing to apply it to.
    await withTransaction(async (makeRequest) => {
      await recordNewInventoryArrival(payload.productId, payload.warehouseId, payload.availableQuantity, 0, makeRequest);
    });
    return {
      orderId: null,
      backorderStatus: "NoOpenBackorder",
      releasedQuantity: 0,
      backorderedQuantity: 0,
      allocation: null,
    };
  }

  const fulfilmentResult = await fulfilmentResultRepository.getFulfilmentResult(backorder.orderId);
  if (!fulfilmentResult) {
    throw new ApiError(500, "Backorder exists without a fulfilment result", { orderId: backorder.orderId });
  }

  // Never allocate more than the remaining backorder quantity.
  const allocatedQuantity = Math.min(payload.availableQuantity, backorder.remainingQuantity);
  const remainingQuantity = backorder.remainingQuantity - allocatedQuantity;
  const backorderStatus = remainingQuantity === 0 ? "Closed" : "Open";
  const releasedQuantity = fulfilmentResult.releasedQuantity + allocatedQuantity;
  const backorderedQuantity = fulfilmentResult.backorderedQuantity - allocatedQuantity;
  const orderStatus: FulfilmentStatus = backorderedQuantity === 0 ? "Released" : "PartiallyReleased";

  await withTransaction(async (makeRequest) => {
    await allocationRepository.createAllocation(
      { orderId: backorder.orderId, warehouseId: payload.warehouseId, allocatedQuantity },
      makeRequest()
    );
    await recordNewInventoryArrival(
      payload.productId,
      payload.warehouseId,
      payload.availableQuantity,
      allocatedQuantity,
      makeRequest
    );
    await backorderRepository.updateBackorder(backorder.orderId, remainingQuantity, backorderStatus, makeRequest());
    await fulfilmentResultRepository.updateFulfilmentResult(
      { orderId: backorder.orderId, status: orderStatus, releasedQuantity, backorderedQuantity },
      makeRequest()
    );
  });

  return {
    orderId: backorder.orderId,
    backorderStatus,
    releasedQuantity,
    backorderedQuantity,
    allocation: { warehouseId: payload.warehouseId, allocatedQuantity },
  };
}
