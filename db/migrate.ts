/**
 * Aplica las migraciones de db/migrations en orden alfabético.
 * Cada una se ejecuta una sola vez y queda registrada en la tabla `migracion`.
 */
import { readdir, readFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { Pool } from "pg";

const aquí = dirname(fileURLToPath(import.meta.url));

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("Falta DATABASE_URL");
    process.exit(1);
  }

  const pool = new Pool({
    connectionString,
    ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : undefined,
  });

  await pool.query(`
    create table if not exists migracion (
      nombre      text primary key,
      aplicada_en timestamptz not null default now()
    )
  `);

  const { rows } = await pool.query<{ nombre: string }>("select nombre from migracion");
  const aplicadas = new Set(rows.map((r) => r.nombre));

  const carpeta = join(aquí, "migrations");
  const archivos = (await readdir(carpeta)).filter((f) => f.endsWith(".sql")).sort();

  let nuevas = 0;
  for (const archivo of archivos) {
    if (aplicadas.has(archivo)) continue;

    const sql = await readFile(join(carpeta, archivo), "utf8");
    const cliente = await pool.connect();
    try {
      await cliente.query("begin");
      await cliente.query(sql);
      await cliente.query("insert into migracion (nombre) values ($1)", [archivo]);
      await cliente.query("commit");
      console.log(`✓ ${archivo}`);
      nuevas++;
    } catch (error) {
      await cliente.query("rollback");
      console.error(`✗ ${archivo}`);
      throw error;
    } finally {
      cliente.release();
    }
  }

  console.log(nuevas === 0 ? "Sin migraciones pendientes." : `${nuevas} migración(es) aplicada(s).`);
  await pool.end();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
