import { Router } from "express";
import * as inventoryAvailabilityController from "../controllers/inventoryAvailability.controller";
import { asyncHandler } from "../utils/asyncHandler";

const router = Router();

router.post("/", asyncHandler(inventoryAvailabilityController.createInventoryAvailability));

export default router;
