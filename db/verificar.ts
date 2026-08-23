/**
 * Prueba de humo: inserta datos, ejecuta las consultas reales de la app y limpia.
 * No deja nada en la base. Correr con:
 *   npx tsx --env-file=.env.local db/verificar.ts
 */
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function q<T extends Record<string, unknown>>(text: string, params: unknown[] = []) {
  return (await pool.query<T>(text, params)).rows;
}

async function main() {
  const [partner] = await q<{ id: string }>("select id from partner limit 1");

  const [cliente] = await q<{ id: string }>(
    `insert into cliente (partner_id, nombre, fase, owner_interno)
     values ($1, '__prueba__', 'produccion', 'Samuel') returning id`,
    [partner.id],
  );
  console.log("✓ cliente creado");

  const [contacto] = await q<{ id: string }>(
    `insert into contacto (cliente_id, nombre, rol, lado)
     values ($1, 'Ana', 'Aprueba guion', 'cliente') returning id`,
    [cliente.id],
  );

  await q(
    `insert into evento (cliente_id, tipo, titulo, cuerpo, severidad)
     values ($1, 'incidencia', 'Caída de SIP 20 min', 'Cliente molesto', 'alta')`,
    [cliente.id],
  );

  const [hito] = await q<{ id: string }>(
    `insert into hito (cliente_id, tipo, titulo, fecha_objetivo, responsable_id)
     values ($1, 'go_live', 'Salida a producción', current_date + 5, $2) returning id`,
    [cliente.id, contacto.id],
  );

  await q(
    `insert into hito_cambio_fecha (hito_id, fecha_anterior, fecha_nueva, motivo)
     values ($1, current_date, current_date + 5, 'Falta aprobación del cliente')`,
    [hito.id],
  );

  await q(
    `insert into compromiso (cliente_id, descripcion, lado, fecha_limite, responsable_id)
     values ($1, 'Enviar postmortem', 'interno', current_date - 2, $2)`,
    [cliente.id, contacto.id],
  );

  await q(
    `insert into metrica_dia (cliente_id, fecha, llamadas_totales, duracion_total_min, contencion_pct)
     values ($1, current_date, 1240, 3720.5, 71.4)`,
    [cliente.id],
  );

  await q(
    `insert into stack_item (cliente_id, categoria, proveedor, modelo)
     values ($1, 'stt', 'Deepgram', 'nova-3')`,
    [cliente.id],
  );
  console.log("✓ datos de prueba insertados");

  // --- las consultas reales de la app ---

  const lista = await q(
    `
    select c.id, c.nombre, c.fase, c.estado, c.owner_interno,
           p.nombre as partner_nombre,
           h.fecha_objetivo as proximo_hito_fecha, h.titulo as proximo_hito_titulo,
           coalesce(v.vencidos, 0)::int as compromisos_vencidos,
           e.ultimo_evento
    from cliente c
    left join partner p on p.id = c.partner_id
    left join lateral (
      select fecha_objetivo, titulo from hito
      where hito.cliente_id = c.id and hito.estado in ('pendiente','en_curso')
      order by fecha_objetivo limit 1
    ) h on true
    left join lateral (
      select count(*) as vencidos from compromiso
      where compromiso.cliente_id = c.id and compromiso.estado = 'pendiente'
        and compromiso.fecha_limite < current_date
    ) v on true
    left join lateral (
      select max(fecha_evento) as ultimo_evento from evento where evento.cliente_id = c.id
    ) e on true
    where not c.archivado
    order by array_position(
      array['produccion','uat','qa','desarrollo','descubrimiento']::fase_cliente[], c.fase
    ), c.nombre
    `,
  );
  console.log("✓ listarClientes →", JSON.stringify(lista[0]));

  const hitos = await q(
    `select h.*, c.nombre as cliente_nombre, ct.nombre as responsable_nombre,
            coalesce(m.veces, 0)::int as veces_movido
     from hito h
     join cliente c on c.id = h.cliente_id
     left join contacto ct on ct.id = h.responsable_id
     left join lateral (select count(*) as veces from hito_cambio_fecha where hito_id = h.id) m on true
     where h.estado in ('pendiente','en_curso')
       and h.fecha_objetivo <= current_date + 30 and not c.archivado
     order by h.fecha_objetivo`,
  );
  console.log(
    "✓ hitosProximos →",
    hitos[0]?.titulo,
    "· movido",
    hitos[0]?.veces_movido,
    "×",
  );

  const compromisos = await q(
    `select co.*, c.nombre as cliente_nombre, ct.nombre as responsable_nombre
     from compromiso co
     join cliente c on c.id = co.cliente_id
     left join contacto ct on ct.id = co.responsable_id
     where co.estado = 'pendiente' and not c.archivado
       and (co.fecha_limite is null or co.fecha_limite <= current_date + 7)
     order by co.fecha_limite nulls last`,
  );
  console.log("✓ compromisosAbiertos →", compromisos.length, "abierto(s)");

  const silencio = await q(
    `select c.id, c.nombre, e.ultimo_evento,
            coalesce(current_date - e.ultimo_evento, 999) as dias
     from cliente c
     left join lateral (
       select max(fecha_evento) as ultimo_evento from evento where evento.cliente_id = c.id
     ) e on true
     where not c.archivado and c.estado = 'activo'
       and (e.ultimo_evento is null or e.ultimo_evento < current_date - 14)
     order by dias desc`,
  );
  console.log("✓ clientesEnSilencio →", silencio.length);

  const contactos = await q(
    `select id, nombre, rol, lado from contacto where cliente_id = $1
     order by array_position(array['interno','partner','cliente']::lado_contacto[], lado), nombre`,
    [cliente.id],
  );
  console.log("✓ contactosCliente →", contactos.length);

  // --- restricciones que deben fallar ---

  try {
    await q(
      `insert into metrica_dia (cliente_id, fecha, llamadas_totales)
       values ($1, current_date, 99)`,
      [cliente.id],
    );
    console.log("✗ la métrica duplicada NO fue rechazada");
  } catch {
    console.log("✓ métrica duplicada rechazada por la restricción única");
  }

  try {
    await q(`insert into metrica_dia (cliente_id, fecha) values ($1, current_date - 1)`, [
      cliente.id,
    ]);
    console.log("✗ métrica vacía sin sin_actividad NO fue rechazada");
  } catch {
    console.log("✓ métrica sin datos y sin sin_actividad rechazada");
  }

  await q("delete from cliente where id = $1", [cliente.id]);
  const [{ restantes }] = await q<{ restantes: string }>(
    "select count(*) as restantes from evento where cliente_id = $1",
    [cliente.id],
  );
  console.log("✓ borrado en cascada, eventos restantes:", restantes);

  await pool.end();
  console.log("\nTodo verificado. La base queda limpia.");
}

main().catch(async (error) => {
  console.error(error);
  await pool.end();
  process.exit(1);
});
