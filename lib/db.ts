import { Pool, type QueryResultRow } from "pg";

declare global {
  // eslint-disable-next-line no-var
  var __pmPool: Pool | undefined;
}

function crearPool() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("Falta DATABASE_URL");
  }
  return new Pool({
    connectionString,
    // Easypanel expone Postgres por red interna sin TLS; en gestionados sí hace falta.
    ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : undefined,
    max: 10,
  });
}

/**
 * Perezoso a propósito: durante `next build` se cargan los módulos de las
 * páginas sin que exista DATABASE_URL, y crear el pool ahí rompería el build.
 */
export function obtenerPool(): Pool {
  if (!globalThis.__pmPool) globalThis.__pmPool = crearPool();
  return globalThis.__pmPool;
}

export async function sql<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params: unknown[] = [],
): Promise<T[]> {
  const res = await obtenerPool().query<T>(text, params);
  return res.rows;
}

export async function uno<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params: unknown[] = [],
): Promise<T | null> {
  const filas = await sql<T>(text, params);
  return filas[0] ?? null;
}

/** Ejecuta varias sentencias dentro de una transacción. */
export async function enTransaccion<T>(fn: (q: typeof sql) => Promise<T>): Promise<T> {
  const cliente = await obtenerPool().connect();
  try {
    await cliente.query("begin");
    const consultar = async <R extends QueryResultRow = QueryResultRow>(
      text: string,
      params: unknown[] = [],
    ) => (await cliente.query<R>(text, params)).rows;
    const resultado = await fn(consultar as typeof sql);
    await cliente.query("commit");
    return resultado;
  } catch (error) {
    await cliente.query("rollback");
    throw error;
  } finally {
    cliente.release();
  }
}
