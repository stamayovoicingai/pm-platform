import "server-only";
import { pedirTexto, proveedorActivo } from "../llm";
import { publicar } from "./cliente";
import { sql } from "../db";
import { hoy } from "../fechas";

/**
 * Arma el expediente de un cliente en texto plano. Se incluye el historial de
 * cambios de fecha con su motivo, que es justo lo que no está en ninguna vista
 * y por lo que se suele preguntar.
 */
async function contextoCliente(clienteId: string): Promise<string> {
  const [cliente] = await sql<Record<string, unknown>>(
    `select c.nombre, c.fase, c.estado, c.owner_interno, c.descripcion,
            p.nombre as partner
     from cliente c left join partner p on p.id = c.partner_id
     where c.id = $1`,
    [clienteId],
  );
  if (!cliente) return "";

  const [hitos, eventos, actualizaciones, compromisos, meses, base, contactos] =
    await Promise.all([
      sql<Record<string, unknown>>(
        `select h.titulo, h.tipo, h.estado, h.fecha_objetivo::text as fecha, h.notas,
                coalesce(
                  (select string_agg(
                     cf.fecha_anterior::text || ' → ' || cf.fecha_nueva::text || ' (' || cf.motivo || ')',
                     '; ' order by cf.creado_en)
                   from hito_cambio_fecha cf where cf.hito_id = h.id),
                  'sin cambios') as historial_fechas
         from hito h where h.cliente_id = $1 order by h.fecha_objetivo`,
        [clienteId],
      ),
      sql<Record<string, unknown>>(
        `select id, tipo, severidad, estado_seguimiento as estado,
                fecha_evento::text as fecha, titulo, cuerpo
         from evento where cliente_id = $1 order by fecha_evento`,
        [clienteId],
      ),
      sql<Record<string, unknown>>(
        `select a.evento_id, a.cuerpo, a.estado_anterior, a.estado_nuevo,
                a.creado_en::date::text as fecha
         from evento_actualizacion a
         join evento e on e.id = a.evento_id
         where e.cliente_id = $1 order by a.creado_en`,
        [clienteId],
      ),
      sql<Record<string, unknown>>(
        `select descripcion, lado, estado, fecha_limite::text as fecha
         from compromiso where cliente_id = $1`,
        [clienteId],
      ),
      sql<Record<string, unknown>>(
        `select to_char(periodo,'YYYY-MM') as mes, llamadas_totales, duracion_total_min, contencion_pct
         from metrica_mes where cliente_id = $1 order by periodo desc limit 6`,
        [clienteId],
      ),
      sql<Record<string, unknown>>(
        `select volumen_mensual_promedio, aht_promedio_seg, meta_contencion_pct,
                concurrencia_maxima, entregado_por
         from linea_base where id = $1`,
        [clienteId],
      ),
      sql<Record<string, unknown>>(
        "select nombre, rol, lado from contacto where cliente_id = $1",
        [clienteId],
      ),
    ]);

  const porEvento = new Map<string, string[]>();
  for (const a of actualizaciones) {
    const linea =
      `    · ${a.fecha}: ${a.cuerpo}` +
      (a.estado_nuevo ? ` [pasa a ${a.estado_nuevo}]` : "");
    const lista = porEvento.get(String(a.evento_id)) ?? [];
    lista.push(linea);
    porEvento.set(String(a.evento_id), lista);
  }

  const partes: string[] = [
    `CLIENTE: ${cliente.nombre} · fase ${cliente.fase} · ${cliente.estado}` +
      (cliente.partner ? ` · partner ${cliente.partner}` : "") +
      (cliente.owner_interno ? ` · responsable ${cliente.owner_interno}` : ""),
    cliente.descripcion ? `Descripción: ${cliente.descripcion}` : "",
  ];

  if (hitos.length) {
    partes.push(
      "\nHITOS:",
      ...hitos.map(
        (h) =>
          `  - ${h.titulo} (${h.tipo}) · ${h.fecha} · ${h.estado}` +
          (h.notas ? ` · notas: ${h.notas}` : "") +
          `\n    cambios de fecha: ${h.historial_fechas}`,
      ),
    );
  }

  if (eventos.length) {
    partes.push(
      "\nREGISTROS DEL TIMELINE:",
      ...eventos.map((e) => {
        const hilo = porEvento.get(String(e.id)) ?? [];
        return (
          `  - ${e.fecha} · ${e.tipo} · severidad ${e.severidad}` +
          (e.estado ? ` · ${e.estado}` : " · sin seguimiento") +
          `\n    ${e.titulo}` +
          (e.cuerpo ? `\n    ${e.cuerpo}` : "") +
          (hilo.length ? `\n${hilo.join("\n")}` : "")
        );
      }),
    );
  }

  if (compromisos.length) {
    partes.push(
      "\nCOMPROMISOS:",
      ...compromisos.map(
        (c) => `  - ${c.descripcion} · ${c.lado} · ${c.estado} · ${c.fecha ?? "sin fecha"}`,
      ),
    );
  }

  const lineaBase = base[0];
  if (lineaBase) {
    partes.push(
      `\nLÍNEA BASE DEL PARTNER: ${lineaBase.volumen_mensual_promedio ?? "?"} llamadas/mes · ` +
        `AHT ${lineaBase.aht_promedio_seg ?? "?"}s · meta contención ${lineaBase.meta_contencion_pct ?? "?"}%` +
        (lineaBase.entregado_por ? ` · según ${lineaBase.entregado_por}` : ""),
    );
  }

  if (meses.length) {
    partes.push(
      "\nMÉTRICAS MENSUALES:",
      ...meses.map(
        (m) =>
          `  - ${m.mes}: ${m.llamadas_totales ?? "?"} llamadas · ` +
          `${m.duracion_total_min ?? "?"} min · contención ${m.contencion_pct ?? "?"}%`,
      ),
    );
  }

  if (contactos.length) {
    partes.push(
      `\nCONTACTOS: ${contactos.map((c) => `${c.nombre} (${c.rol ?? c.lado})`).join(", ")}`,
    );
  }

  return partes.filter(Boolean).join("\n");
}

/** Panorámica de todos los clientes, para preguntas que no nombran ninguno. */
async function contextoGeneral(): Promise<string> {
  const filas = await sql<Record<string, unknown>>(
    `select c.nombre, c.fase,
            (select count(*) from evento e where e.cliente_id = c.id
              and e.estado_seguimiento in ('abierto','en_curso'))::int as abiertos,
            (select count(*) from compromiso co where co.cliente_id = c.id
              and co.estado = 'pendiente')::int as compromisos,
            (select string_agg(h.titulo || ' ' || h.fecha_objetivo::text, '; ' order by h.fecha_objetivo)
             from hito h where h.cliente_id = c.id and h.estado in ('pendiente','en_curso')) as hitos
     from cliente c where not c.archivado order by c.nombre`,
  );

  return [
    "PANORÁMICA DE TODOS LOS CLIENTES:",
    ...filas.map(
      (f) =>
        `  - ${f.nombre} · ${f.fase} · ${f.abiertos} abiertos · ` +
        `${f.compromisos} compromisos · hitos: ${f.hitos ?? "ninguno"}`,
    ),
  ].join("\n");
}

const INSTRUCCIONES = `Respondes preguntas de un product manager sobre sus propios registros.

Reglas:
- Respondes SOLO con lo que aparece en el expediente. Si no está, dices claramente que no está registrado y sugieres dónde podría anotarse.
- No inventas fechas, nombres ni motivos.
- Respondes en español, en dos o tres frases. Nada de listas largas ni preámbulos.
- Cuando cites algo, di de dónde sale: el motivo de un cambio de fecha, una actualización concreta, un registro del timeline.
- Formato de Slack: *negrita* con un asterisco a cada lado. Nada de markdown de encabezados.`;

export async function responderPregunta(
  texto: string,
  clienteId: string | null,
  hiloTs: string,
) {
  if (proveedorActivo() === "ninguno") {
    await publicar(
      "No tengo un modelo configurado, así que no puedo responder preguntas todavía.",
      undefined,
      hiloTs,
    );
    return;
  }

  const contexto = clienteId ? await contextoCliente(clienteId) : await contextoGeneral();

  try {
    const respuesta = await pedirTexto(
      INSTRUCCIONES,
      `Hoy es ${hoy()}.\n\n=== EXPEDIENTE ===\n${contexto}\n\n=== PREGUNTA ===\n${texto}`,
    );
    await publicar(respuesta.slice(0, 2800), undefined, hiloTs);
  } catch (error) {
    console.error("Pregunta fallida:", error);
    await publicar(
      "No pude responder ahora mismo. El error está en los logs.",
      undefined,
      hiloTs,
    );
  }
}
