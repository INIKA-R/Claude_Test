import { sql, getRequest } from "./db";

export async function getConfigValue(
  configKey: string,
  request?: sql.Request
): Promise<string | null> {
  const req = await getRequest(request);
  const result = await req
    .input("configKey", sql.VarChar(100), configKey)
    .execute("M08944_sp_GetConfigValue");
  const row = result.recordset[0];
  return row ? row.configValue : null;
}
