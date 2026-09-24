import { Request, Response } from "express";
import * as inventoryAvailabilityService from "../services/inventoryAvailability.service";
import { InventoryAvailabilityRequest } from "../types";
import { ApiError } from "../utils/ApiError";
import { validateInventoryAvailabilityRequest } from "../utils/validation";

export async function createInventoryAvailability(req: Request, res: Response): Promise<void> {
  const errors = validateInventoryAvailabilityRequest(req.body);
  if (errors.length > 0) {
    throw new ApiError(400, "Invalid request", errors);
  }

  const payload = req.body as InventoryAvailabilityRequest;
  const result = await inventoryAvailabilityService.applyInventoryAvailability(payload);
  res.status(200).json(result);
}
