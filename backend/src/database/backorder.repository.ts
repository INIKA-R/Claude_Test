import { sql, getRequest } from "./db";

export async function createBackorder(
  orderId: string,
  backorderedQuantity: number,
  request?: sql.Request
): Promise<void> {
  const req = await getRequest(request);
  await req
    .input("orderId", sql.VarChar(50), orderId)
    .input("backorderedQuantity", sql.Int, backorderedQuantity)
    .execute("M08944_sp_CreateBackorder");
}
