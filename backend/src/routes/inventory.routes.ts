import { Router } from "express";
import * as inventoryController from "../controllers/inventory.controller";
import { asyncHandler } from "../utils/asyncHandler";

const router = Router();

router.get("/", asyncHandler(inventoryController.listInventory));
router.post("/", asyncHandler(inventoryController.createInventory));
router.get("/:productId/:warehouseId", asyncHandler(inventoryController.getInventory));
router.put("/:productId/:warehouseId", asyncHandler(inventoryController.updateInventory));
router.delete("/:productId/:warehouseId", asyncHandler(inventoryController.deleteInventory));

export default router;
