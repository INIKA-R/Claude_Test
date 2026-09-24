import { Request, Response } from "express";
import * as ordersService from "../services/orders.service";
import { CreateOrderRequest } from "../types";
import { ApiError } from "../utils/ApiError";
import { validateCreateOrderRequest } from "../utils/validation";

// Route -> Controller -> Service -> DB -> Stored Proc flow (FRD §6).

export async function createOrder(req: Request, res: Response): Promise<void> {
  const errors = validateCreateOrderRequest(req.body);
  if (errors.length > 0) {
    throw new ApiError(400, "Invalid request", errors);
  }

  const payload = req.body as CreateOrderRequest;
  const result = await ordersService.createOrder(payload);
  res.status(200).json(result);
}

export async function getOrder(req: Request, res: Response): Promise<void> {
  const result = await ordersService.getFulfilmentResult(req.params.orderId);
  if (!result) {
    res.status(404).json({ orderId: req.params.orderId, error: "Order not Found" });
    return;
  }
  res.status(200).json(result);
}
