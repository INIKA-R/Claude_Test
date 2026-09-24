import { sql, getRequest } from "./db";
import { Customer, EligibilityStatus } from "../types";

export async function getCustomerById(
  customerId: string,
  request?: sql.Request
): Promise<Customer | null> {
  const req = await getRequest(request);
  const result = await req
    .input("customerId", sql.VarChar(50), customerId)
    .execute("M08944_sp_GetCustomer");

  const row = result.recordset[0];
  return row ? { customerId: row.customerId, eligibilityStatus: row.eligibilityStatus } : null;
}

export async function getAllCustomers(request?: sql.Request): Promise<Customer[]> {
  const req = await getRequest(request);
  const result = await req.execute("M08944_sp_GetAllCustomers");
  return result.recordset.map((row) => ({
    customerId: row.customerId,
    eligibilityStatus: row.eligibilityStatus,
  }));
}

export async function createCustomer(
  customer: Customer,
  request?: sql.Request
): Promise<void> {
  const req = await getRequest(request);
  await req
    .input("customerId", sql.VarChar(50), customer.customerId)
    .input("eligibilityStatus", sql.VarChar(20), customer.eligibilityStatus)
    .execute("M08944_sp_CreateCustomer");
}

export async function updateCustomer(
  customerId: string,
  eligibilityStatus: EligibilityStatus,
  request?: sql.Request
): Promise<void> {
  const req = await getRequest(request);
  await req
    .input("customerId", sql.VarChar(50), customerId)
    .input("eligibilityStatus", sql.VarChar(20), eligibilityStatus)
    .execute("M08944_sp_UpdateCustomer");
}

export async function deleteCustomer(
  customerId: string,
  request?: sql.Request
): Promise<void> {
  const req = await getRequest(request);
  await req.input("customerId", sql.VarChar(50), customerId).execute("M08944_sp_DeleteCustomer");
}
