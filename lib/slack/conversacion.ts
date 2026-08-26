import "server-only";
import { publicar, type Bloque } from "./cliente";
import { sql, uno, enTransaccion } from "../db";
import { textoRelativo, fechaCorta } from "../fechas";
import { ETIQUETA_EVENTO, ETIQUETA_HITO, ETIQUETA_SEGUIMIENTO } from "../dominio";
import type { Consulta, Accion } from "./interpretar";

export type Item = {
  n: number;
  clase: "evento" | "compromiso" | "hito";
  id: string;
  titulo: string;
};

const seccion = (texto: string): Bloque => ({
  type: "section",
  text: { type: "mrkdwn", text: texto },
});

// ---------------------------------------------------------------- consultar

export async function responderConsulta(
  consulta: Consulta,
  canal: string,
  hiloTs: string,
) {
  if (consulta.tipo === "global") return responderGlobal(hiloTs);

  const { clienteId, nombre } = consulta;

  const [eventos, compromisos, hitos, mes] = await Promise.all([
    sql<{ id: string; tipo: string; titulo: string; severidad: string; estado: string }>(
      `select id, tipo, titulo, severidad, estado_seguimiento as estado
       from evento
       where cliente_id = $1 and estado_seguimiento in ('abierto','en_curso')
       order by array_position(array['alta','media','info']::severidad_evento[], severidad),
                fecha_evento`,
      [clienteId],
    ),
    sql<{ id: string; descripcion: string; fecha_limite: string | null }>(
      `select id, descripcion, fecha_limite from compromiso
       where cliente_id = $1 and estado = 'pendiente'
       order by fecha_limite nulls last`,
      [clienteId],
    ),
    sql<{ id: string; tipo: string; titulo: string; fecha_objetivo: string }>(
      `select id, tipo, titulo, fecha_objetivo from hito
       where cliente_id = $1 and estado in ('pendiente','en_curso')
       order by fecha_objetivo limit 3`,
      [clienteId],
    ),
    uno<{ fase: string; llamadas: string | null }>(
      `select c.fase,
              coalesce(
                (select llamadas_totales::text from metrica_mes
                  where cliente_id = c.id and periodo = date_trunc('month', current_date)::date),
                (select sum(llamadas_totales)::text from metrica_dia
                  where cliente_id = c.id and fecha >= date_trunc('month', current_date)::date)
              ) as llamadas
       from cliente c where c.id = $1`,
      [clienteId],
    ),
  ]);

  const items: Item[] = [];
  let n = 0;
  const bloques: Bloque[] = [seccion(`*${nombre}* · ${mes?.fase ?? ""}`)];

  if (eventos.length > 0) {
    const lineas = eventos.map((e) => {
      items.push({ n: ++n, clase: "evento", id: e.id, titulo: e.titulo });
      return (
        ` \`${n}\` *${ETIQUETA_EVENTO[e.tipo as keyof typeof ETIQUETA_EVENTO]}*` +
        (e.severidad === "alta" ? " · alta" : "") +
        ` · ${ETIQUETA_SEGUIMIENTO[e.estado as keyof typeof ETIQUETA_SEGUIMIENTO].toLowerCase()}` +
        ` — ${e.titulo}`
      );
    });
    bloques.push(seccion(`*Abiertos*\n${lineas.join("\n")}`));
  }

  if (compromisos.length > 0) {
    const lineas = compromisos.map((c) => {
      items.push({ n: ++n, clase: "compromiso", id: c.id, titulo: c.descripcion });
      return (
        ` \`${n}\` ${c.descripcion}` +
        (c.fecha_limite ? ` · ${textoRelativo(c.fecha_limite)}` : " · sin fecha")
      );
    });
    bloques.push(seccion(`*Compromisos*\n${lineas.join("\n")}`));
  }

  if (hitos.length > 0) {
    const lineas = hitos.map((h) => {
      items.push({ n: ++n, clase: "hito", id: h.id, titulo: h.titulo });
      return (
        ` \`${n}\` ${h.titulo} (${ETIQUETA_HITO[h.tipo as keyof typeof ETIQUETA_HITO]})` +
        ` · ${fechaCorta(h.fecha_objetivo)}, ${textoRelativo(h.fecha_objetivo)}`
      );
    });
    bloques.push(seccion(`*Hitos*\n${lineas.join("\n")}`));
  }

  if (items.length === 0) {
    bloques.push(seccion("_Nada abierto, ningún compromiso pendiente y ningún hito._"));
  }

  bloques.push(
    seccion(
      `Mes en curso: ${mes?.llamadas ? Number(mes.llamadas).toLocaleString("es-CO") + " llamadas" : "sin métricas"}`,
    ),
  );

  if (items.length > 0) {
    bloques.push({
      type: "context",
      elements: [
        {
          type: "mrkdwn",
          text:
            "Responde en este hilo: `el 1 ya lo resolvieron, ...` para actualizar y cerrar, " +
            "`cierra el 2`, o `borra el 3`.",
        },
      ],
    });
  }

  // Se guarda la lista antes de publicarla: si el orden fuera el contrario y
  // fallara el guardado, el usuario vería unos números que no significan nada.
  await sql(
    `insert into conversacion_slack (hilo_ts, canal, cliente_id, items)
     values ($1, $2, $3, $4)
     on conflict (hilo_ts) do update set items = excluded.items, creado_en = now()`,
    [hiloTs, canal, clienteId, JSON.stringify(items)],
  );

  await publicar(`Estado de ${nombre}`, bloques, hiloTs);
}

async function responderGlobal(hiloTs: string) {
  const filas = await sql<{
    nombre: string;
    abiertos: number;
    compromisos: number;
    proximo: string | null;
  }>(
    `select c.nombre,
            (select count(*) from evento e where e.cliente_id = c.id
              and e.estado_seguimiento in ('abierto','en_curso'))::int as abiertos,
            (select count(*) from compromiso co where co.cliente_id = c.id
              and co.estado = 'pendiente')::int as compromisos,
            (select min(fecha_objetivo)::text from hito h where h.cliente_id = c.id
              and h.estado in ('pendiente','en_curso')) as proximo
     from cliente c
     where not c.archivado and c.estado = 'activo'
     order by c.nombre`,
  );

  const conAlgo = filas.filter((f) => f.abiertos > 0 || f.compromisos > 0 || f.proximo);

  await publicar(
    "Qué hay pendiente",
    [
      seccion("*Qué hay pendiente*"),
      seccion(
        conAlgo.length === 0
          ? "_Nada abierto en ningún cliente._"
          : conAlgo
              .map(
                (f) =>
                  `• *${f.nombre}*` +
                  (f.abiertos > 0 ? ` · ${f.abiertos} abierto${f.abiertos === 1 ? "" : "s"}` : "") +
                  (f.compromisos > 0 ? ` · ${f.compromisos} compromiso${f.compromisos === 1 ? "" : "s"}` : "") +
                  (f.proximo ? ` · hito ${textoRelativo(f.proximo)}` : ""),
              )
              .join("\n"),
      ),
      {
        type: "context",
        elements: [
          {
            type: "mrkdwn",
            text: "Pregunta por uno concreto para poder actuar sobre sus elementos: `cómo va Colsubsidio`",
          },
        ],
      },
    ],
    hiloTs,
  );
}

// ---------------------------------------------------------------- actuar

export async function conversacionDelHilo(hiloTs: string) {
  return uno<{ items: Item[]; cliente_id: string | null }>(
    "select items, cliente_id from conversacion_slack where hilo_ts = $1",
    [hiloTs],
  );
}

export async function itemsDelHilo(hiloTs: string): Promise<Item[] | null> {
  return (await conversacionDelHilo(hiloTs))?.items ?? null;
}

export async function ejecutarAccion(accion: Accion, hiloTs: string) {
  const items = await itemsDelHilo(hiloTs);
  if (!items) return;

  const item = items.find((i) => i.n === accion.n);
  if (!item) {
    await publicar(
      `No hay un \`${accion.n}\` en esa lista. Va del 1 al ${items.length}.`,
      undefined,
      hiloTs,
    );
    return;
  }

  if (accion.tipo === "borrar") {
    await publicar(
      `Voy a borrar *${item.titulo}*. Esto no tiene vuelta atrás.`,
      [
        seccion(`Voy a borrar *${item.titulo}*.\nEsto no tiene vuelta atrás.`),
        {
          type: "actions",
          elements: [
            {
              type: "button",
              text: { type: "plain_text", text: "Borrar" },
              style: "danger",
              action_id: "confirmar_borrado",
              value: `${hiloTs}|${accion.n}`,
            },
            {
              type: "button",
              text: { type: "plain_text", text: "Cancelar" },
              action_id: "cancelar_borrado",
              value: "x",
            },
          ],
        },
      ],
      hiloTs,
    );
    return;
  }

  if (accion.tipo === "actualizar") {
    if (item.clase !== "evento") {
      await publicar(
        `\`${accion.n}\` es un ${item.clase}, y ahí no hay hilo de actualizaciones. ` +
          `Puedes cerrarlo con \`cierra el ${accion.n}\`.`,
        undefined,
        hiloTs,
      );
      return;
    }

    await sql(
      `insert into evento_actualizacion (evento_id, cuerpo, estado_anterior, origen)
       values ($1, $2, (select estado_seguimiento from evento where id = $1), 'slack')`,
      [item.id, accion.nota],
    );
    await publicar(`Anotado en *${item.titulo}*.`, undefined, hiloTs);
    return;
  }

  // cerrar
  await enTransaccion(async (q) => {
    if (item.clase === "evento") {
      await q(
        `insert into evento_actualizacion
           (evento_id, cuerpo, estado_anterior, estado_nuevo, origen)
         values ($1, $2, (select estado_seguimiento from evento where id = $1), 'resuelto', 'slack')`,
        [item.id, accion.nota ?? "Cerrado desde Slack"],
      );
      await q("update evento set estado_seguimiento = 'resuelto' where id = $1", [item.id]);
    } else if (item.clase === "compromiso") {
      await q(
        "update compromiso set estado = 'cumplido', cerrado_en = now() where id = $1",
        [item.id],
      );
    } else {
      await q("update hito set estado = 'cumplido' where id = $1", [item.id]);
    }
  });

  await publicar(`Cerrado: *${item.titulo}*.`, undefined, hiloTs);
}

export async function borrarItem(hiloTs: string, n: number) {
  const items = await itemsDelHilo(hiloTs);
  const item = items?.find((i) => i.n === n);
  if (!item) return;

  const tabla =
    item.clase === "evento" ? "evento" : item.clase === "compromiso" ? "compromiso" : "hito";

  await sql(`delete from ${tabla} where id = $1`, [item.id]);
  await publicar(`Borrado: *${item.titulo}*.`, undefined, hiloTs);
}
