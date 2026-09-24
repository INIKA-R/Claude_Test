import * as customerRepository from "../database/customer.repository";
import { Customer, CreateCustomerRequest, UpdateCustomerRequest } from "../types";
import { ApiError } from "../utils/ApiError";

export async function listCustomers(): Promise<Customer[]> {
  return customerRepository.getAllCustomers();
}

export async function getCustomer(customerId: string): Promise<Customer> {
  const customer = await customerRepository.getCustomerById(customerId);
  if (!customer) {
    throw new ApiError(404, "Customer not found", { customerId });
  }
  return customer;
}

export async function createCustomer(payload: CreateCustomerRequest): Promise<Customer> {
  const existing = await customerRepository.getCustomerById(payload.customerId);
  if (existing) {
    throw new ApiError(409, "Customer already exists", { customerId: payload.customerId });
  }
  await customerRepository.createCustomer(payload);
  return payload;
}

export async function updateCustomer(
  customerId: string,
  payload: UpdateCustomerRequest
): Promise<Customer> {
  const existing = await customerRepository.getCustomerById(customerId);
  if (!existing) {
    throw new ApiError(404, "Customer not found", { customerId });
  }
  await customerRepository.updateCustomer(customerId, payload.eligibilityStatus);
  return { customerId, eligibilityStatus: payload.eligibilityStatus };
}

export async function deleteCustomer(customerId: string): Promise<void> {
  const existing = await customerRepository.getCustomerById(customerId);
  if (!existing) {
    throw new ApiError(404, "Customer not found", { customerId });
  }
  await customerRepository.deleteCustomer(customerId);
}
