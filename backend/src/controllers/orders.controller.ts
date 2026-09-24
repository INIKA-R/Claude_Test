import { Request, Response } from "express";
import * as ordersService from "../services/orders.service";

// Route → Controller → Service flow (FRD §6). Logic added in a later phase.

export async function createOrder(req: Request, res: Response): Promise<void> {
  const result = await ordersService.createOrder(req.body);
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
