import { apiClient } from "./apiClient";
import { Customer, CreateCustomerRequest, UpdateCustomerRequest } from "../types";

export async function listCustomers(): Promise<Customer[]> {
  const { data } = await apiClient.get<Customer[]>("/customers");
  return data;
}

export async function createCustomer(payload: CreateCustomerRequest): Promise<Customer> {
  const { data } = await apiClient.post<Customer>("/customers", payload);
  return data;
}

export async function updateCustomer(
  customerId: string,
  payload: UpdateCustomerRequest
): Promise<Customer> {
  const { data } = await apiClient.put<Customer>(`/customers/${customerId}`, payload);
  return data;
}

export async function deleteCustomer(customerId: string): Promise<void> {
  await apiClient.delete(`/customers/${customerId}`);
}
