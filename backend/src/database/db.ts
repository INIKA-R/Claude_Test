import sql, { ConnectionPool, config as SqlConfig } from "mssql";

const dbConfig: SqlConfig = {
  server: process.env.DB_SERVER || "localhost",
  port: Number(process.env.DB_PORT) || 1433,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  options: {
    encrypt: process.env.DB_ENCRYPT === "true",
    trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE === "true",
  },
};

let pool: ConnectionPool | null = null;

export async function getPool(): Promise<ConnectionPool> {
  if (pool && pool.connected) {
    return pool;
  }
  pool = await new sql.ConnectionPool(dbConfig).connect();
  return pool;
}

/**
 * Runs `work` with a request-factory bound to a single MSSQL transaction,
 * committing on success and rolling back on any error. Used by services that
 * must persist across more than one stored proc call atomically (e.g. an
 * order + its fulfilment decision + inventory decrement).
 */
export async function withTransaction<T>(
  work: (makeRequest: () => sql.Request) => Promise<T>
): Promise<T> {
  const connectedPool = await getPool();
  const transaction = new sql.Transaction(connectedPool);
  await transaction.begin();
  try {
    const result = await work(() => new sql.Request(transaction));
    await transaction.commit();
    return result;
  } catch (err) {
    await transaction.rollback();
    throw err;
  }
}

export async function getRequest(request?: sql.Request): Promise<sql.Request> {
  if (request) {
    return request;
  }
  const connectedPool = await getPool();
  return connectedPool.request();
}

export { sql };
