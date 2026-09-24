import { Router } from "express";
import * as ordersController from "../controllers/orders.controller";
import { asyncHandler } from "../utils/asyncHandler";

const router = Router();

// POST /orders — FRD §5
router.post("/", asyncHandler(ordersController.createOrder));

// GET /orders/:orderId — FRD §5
router.get("/:orderId", asyncHandler(ordersController.getOrder));

export default router;
