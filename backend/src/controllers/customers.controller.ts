import { Request, Response } from "express";
import * as customersService from "../services/customers.service";
import { CreateCustomerRequest, UpdateCustomerRequest } from "../types";
import { ApiError } from "../utils/ApiError";
import { validateCreateCustomerRequest, validateUpdateCustomerRequest } from "../utils/validation";

export async function listCustomers(_req: Request, res: Response): Promise<void> {
  const customers = await customersService.listCustomers();
  res.status(200).json(customers);
}

export async function getCustomer(req: Request, res: Response): Promise<void> {
  const customer = await customersService.getCustomer(req.params.customerId);
  res.status(200).json(customer);
}

export async function createCustomer(req: Request, res: Response): Promise<void> {
  const errors = validateCreateCustomerRequest(req.body);
  if (errors.length > 0) {
    throw new ApiError(400, "Invalid request", errors);
  }
  const customer = await customersService.createCustomer(req.body as CreateCustomerRequest);
  res.status(201).json(customer);
}

export async function updateCustomer(req: Request, res: Response): Promise<void> {
  const errors = validateUpdateCustomerRequest(req.body);
  if (errors.length > 0) {
    throw new ApiError(400, "Invalid request", errors);
  }
  const customer = await customersService.updateCustomer(
    req.params.customerId,
    req.body as UpdateCustomerRequest
  );
  res.status(200).json(customer);
}

export async function deleteCustomer(req: Request, res: Response): Promise<void> {
  await customersService.deleteCustomer(req.params.customerId);
  res.status(204).send();
}
