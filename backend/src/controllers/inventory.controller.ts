import { Request, Response } from "express";
import * as inventoryService from "../services/inventory.service";
import { CreateInventoryRequest, UpdateInventoryRequest, WarehouseId } from "../types";
import { ApiError } from "../utils/ApiError";
import { validateCreateInventoryRequest, validateUpdateInventoryRequest } from "../utils/validation";

export async function listInventory(_req: Request, res: Response): Promise<void> {
  const inventory = await inventoryService.listInventory();
  res.status(200).json(inventory);
}

export async function getInventory(req: Request, res: Response): Promise<void> {
  const inventory = await inventoryService.getInventory(req.params.productId, req.params.warehouseId);
  res.status(200).json(inventory);
}

export async function createInventory(req: Request, res: Response): Promise<void> {
  const errors = validateCreateInventoryRequest(req.body);
  if (errors.length > 0) {
    throw new ApiError(400, "Invalid request", errors);
  }
  const inventory = await inventoryService.createInventory(req.body as CreateInventoryRequest);
  res.status(201).json(inventory);
}

export async function updateInventory(req: Request, res: Response): Promise<void> {
  const errors = validateUpdateInventoryRequest(req.body);
  if (errors.length > 0) {
    throw new ApiError(400, "Invalid request", errors);
  }
  const inventory = await inventoryService.updateInventory(
    req.params.productId,
    req.params.warehouseId as WarehouseId,
    req.body as UpdateInventoryRequest
  );
  res.status(200).json(inventory);
}

export async function deleteInventory(req: Request, res: Response): Promise<void> {
  await inventoryService.deleteInventory(req.params.productId, req.params.warehouseId);
  res.status(204).send();
}
