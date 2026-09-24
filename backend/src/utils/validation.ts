const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const ELIGIBILITY_STATUSES = ["Eligible", "CreditHold", "Unknown"];
const CUSTOMER_TYPES = ["Standard", "Priority"];
const WAREHOUSE_IDS = ["WH-A", "WH-B", "WH-C"];

export function isValidDateString(value: unknown): value is string {
  if (typeof value !== "string" || !DATE_PATTERN.test(value)) {
    return false;
  }
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isPositiveInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value > 0;
}

export function validateCreateOrderRequest(body: unknown): string[] {
  const errors: string[] = [];
  if (typeof body !== "object" || body === null) {
    return ["Request body must be a JSON object"];
  }
  const b = body as Record<string, unknown>;

  if (!isNonEmptyString(b.orderId)) errors.push("orderId is required");
  if (!isNonEmptyString(b.customerId)) errors.push("customerId is required");
  if (!isNonEmptyString(b.customerType) || !CUSTOMER_TYPES.includes(b.customerType as string)) {
    errors.push(`customerType is required and must be one of: ${CUSTOMER_TYPES.join(", ")}`);
  }
  if (!isNonEmptyString(b.productId)) errors.push("productId is required");
  if (!isPositiveInteger(b.quantity)) errors.push("quantity is required and must be an integer > 0");
  if (!isValidDateString(b.promisedDeliveryDate)) {
    errors.push("promisedDeliveryDate is required and must match YYYY-MM-DD");
  }

  return errors;
}

export function validateCreateCustomerRequest(body: unknown): string[] {
  const errors: string[] = [];
  if (typeof body !== "object" || body === null) {
    return ["Request body must be a JSON object"];
  }
  const b = body as Record<string, unknown>;

  if (!isNonEmptyString(b.customerId)) errors.push("customerId is required");
  if (!isNonEmptyString(b.eligibilityStatus) || !ELIGIBILITY_STATUSES.includes(b.eligibilityStatus as string)) {
    errors.push(`eligibilityStatus is required and must be one of: ${ELIGIBILITY_STATUSES.join(", ")}`);
  }

  return errors;
}

export function validateUpdateCustomerRequest(body: unknown): string[] {
  const errors: string[] = [];
  if (typeof body !== "object" || body === null) {
    return ["Request body must be a JSON object"];
  }
  const b = body as Record<string, unknown>;

  if (!isNonEmptyString(b.eligibilityStatus) || !ELIGIBILITY_STATUSES.includes(b.eligibilityStatus as string)) {
    errors.push(`eligibilityStatus is required and must be one of: ${ELIGIBILITY_STATUSES.join(", ")}`);
  }

  return errors;
}

export function validateCreateInventoryRequest(body: unknown): string[] {
  const errors: string[] = [];
  if (typeof body !== "object" || body === null) {
    return ["Request body must be a JSON object"];
  }
  const b = body as Record<string, unknown>;

  if (!isNonEmptyString(b.productId)) errors.push("productId is required");
  if (!isNonEmptyString(b.warehouseId) || !WAREHOUSE_IDS.includes(b.warehouseId as string)) {
    errors.push(`warehouseId is required and must be one of: ${WAREHOUSE_IDS.join(", ")}`);
  }
  if (typeof b.availableQuantity !== "number" || !Number.isInteger(b.availableQuantity) || b.availableQuantity < 0) {
    errors.push("availableQuantity is required and must be an integer >= 0");
  }
  if (!isValidDateString(b.earliestDispatchDate)) {
    errors.push("earliestDispatchDate is required and must match YYYY-MM-DD");
  }

  return errors;
}

export function validateUpdateInventoryRequest(body: unknown): string[] {
  const errors: string[] = [];
  if (typeof body !== "object" || body === null) {
    return ["Request body must be a JSON object"];
  }
  const b = body as Record<string, unknown>;

  if (typeof b.availableQuantity !== "number" || !Number.isInteger(b.availableQuantity) || b.availableQuantity < 0) {
    errors.push("availableQuantity is required and must be an integer >= 0");
  }
  if (!isValidDateString(b.earliestDispatchDate)) {
    errors.push("earliestDispatchDate is required and must match YYYY-MM-DD");
  }

  return errors;
}
