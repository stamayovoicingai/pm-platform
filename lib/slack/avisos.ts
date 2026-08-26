import "server-only";
import { publicar, type Bloque } from "./cliente";
import { sql } from "../db";
import { metricasDelDia } from "../consultas/metricas";
import { hitosProximos } from "../consultas/hitos";
import { compromisosAbiertos } from "../consultas/compromisos";
import { eventosAbiertos } from "../consultas/eventos";
import { hoy, fechaCorta, textoRelativo, diasHasta } from "../fechas";
import { ETIQUETA_HITO, ETIQUETA_EVENTO } from "../dominio";

const base = () => process.env.APP_URL?.replace(/\/$/, "") ?? "";

const seccion = (texto: string): Bloque => ({
  type: "section",
  text: { type: "mrkdwn", text: texto },
});

const contexto = (texto: string): Bloque => ({
  type: "context",
  elements: [{ type: "mrkdwn", text: texto }],
});

/**
 * Recordatorio de las 19:00. Solo nombra a los clientes que faltan por
 * registrar: repetir los que ya están hechos convertiría el aviso en ruido.
 */
export async function avisoMetricas() {
  const fecha = hoy();
  const clientes = await metricasDelDia(fecha);
  const faltan = clientes.filter((c) => c.fecha === null);

  if (clientes.length === 0) return;

  if (faltan.length === 0) {
    await publicar(
      `Día ${fechaCorta(fecha)} completo: los ${clientes.length} clientes registrados.`,
    );
    return;
  }

  const bloques: Bloque[] = [
    seccion(
      `*Registro del día ${fechaCorta(fecha)}*\nFaltan ${faltan.length} de ` +
        `${clientes.length}: ${faltan.map((c) => c.cliente_nombre).join(", ")}`,
    ),
    {
      type: "actions",
      elements: [
        {
          type: "button",
          text: { type: "plain_text", text: "Registrar el día" },
          style: "primary",
          action_id: "abrir_metricas",
          value: fecha,
        },
        {
          type: "button",
          text: { type: "plain_text", text: "Abrir la app" },
          url: `${base()}/metricas`,
          action_id: "ir_metricas",
        },
      ],
    },
  ];

  await publicar(`Faltan ${faltan.length} clientes por registrar hoy`, bloques);
}

/** Aviso de la mañana: lo que vence y lo que sigue abierto. */
export async function avisoGeneral() {
  const antelacion = 3;
  const [hitos, compromisos, abiertos] = await Promise.all([
    hitosProximos(antelacion),
    compromisosAbiertos(1),
    eventosAbiertos(),
  ]);

  const vencidos = compromisos.filter(
    (c) => c.fecha_limite && (diasHasta(c.fecha_limite) ?? 0) < 0,
  );
  const proximos = compromisos.filter((c) => !vencidos.includes(c));
  const graves = abiertos.filter((e) => e.severidad === "alta");

  if (hitos.length === 0 && compromisos.length === 0 && graves.length === 0) return;

  const bloques: Bloque[] = [seccion("*Hoy*")];

  if (hitos.length > 0) {
    bloques.push(
      seccion(
        "*Hitos*\n" +
          hitos
            .map(
              (h) =>
                `• *${h.cliente_nombre}* — ${h.titulo} (${ETIQUETA_HITO[h.tipo]}) · ` +
                `${textoRelativo(h.fecha_objetivo)}` +
                (h.veces_movido > 0 ? ` · movido ${h.veces_movido}×` : ""),
            )
            .join("\n"),
      ),
    );
  }

  if (vencidos.length > 0) {
    bloques.push(
      seccion(
        "*Compromisos vencidos*\n" +
          vencidos
            .map((c) => `• *${c.cliente_nombre}* — ${c.descripcion} · ${textoRelativo(c.fecha_limite)}`)
            .join("\n"),
      ),
    );
  }

  if (proximos.length > 0) {
    bloques.push(
      seccion(
        "*Vencen pronto*\n" +
          proximos
            .map(
              (c) =>
                `• *${c.cliente_nombre}* — ${c.descripcion} · ` +
                `${c.fecha_limite ? textoRelativo(c.fecha_limite) : "sin fecha"}`,
            )
            .join("\n"),
      ),
    );
  }

  if (graves.length > 0) {
    bloques.push(
      seccion(
        "*Asuntos abiertos graves*\n" +
          graves
            .map((e) => `• *${e.cliente_nombre}* — ${ETIQUETA_EVENTO[e.tipo]}: ${e.titulo}`)
            .join("\n"),
      ),
    );
  }

  bloques.push(contexto(`<${base()}|Abrir la plataforma>`));
  await publicar("Resumen de la mañana", bloques);
}

/** Aviso de cierre del día si no se registró nada en toda la jornada. */
export async function avisoSinRegistro() {
  const [{ n }] = await sql<{ n: string }>(
    "select count(*) as n from evento where fecha_evento = current_date",
  );
  if (Number(n) > 0) return;

  await publicar(
    "Hoy no has registrado nada. Si pasó algo con algún cliente, escríbelo aquí y lo clasifico.",
  );
}

/** Resumen del lunes: una línea por cliente con movimiento. */
export async function resumenSemanal() {
  const filas = await sql<{
    nombre: string;
    eventos: number;
    abiertos: number;
    llamadas: string | null;
  }>(
    `
    select c.nombre,
           (select count(*) from evento e
             where e.cliente_id = c.id and e.fecha_evento >= current_date - 7)::int as eventos,
           (select count(*) from evento e
             where e.cliente_id = c.id
               and e.estado_seguimiento in ('abierto','en_curso'))::int as abiertos,
           (select sum(llamadas_totales) from metrica_dia m
             where m.cliente_id = c.id and m.fecha >= current_date - 7) as llamadas
    from cliente c
    where not c.archivado and c.estado = 'activo'
    order by c.nombre
    `,
  );

  const conMovimiento = filas.filter(
    (f) => f.eventos > 0 || f.abiertos > 0 || f.llamadas !== null,
  );
  if (conMovimiento.length === 0) return;

  await publicar("Resumen de la semana", [
    seccion("*La semana en una línea por cliente*"),
    seccion(
      conMovimiento
        .map(
          (f) =>
            `• *${f.nombre}* — ${f.eventos} registro${f.eventos === 1 ? "" : "s"}` +
            (f.abiertos > 0 ? ` · ${f.abiertos} abierto${f.abiertos === 1 ? "" : "s"}` : "") +
            (f.llamadas ? ` · ${Number(f.llamadas).toLocaleString("es-CO")} llamadas` : ""),
        )
        .join("\n"),
    ),
    contexto(`<${base()}|Abrir la plataforma>`),
  ]);
}

/** El día 1: qué hay que cerrar del mes que acaba de terminar. */
export async function cierreDeMes() {
  const clientes = await sql<{ nombre: string; dias: number; objetivo: boolean }>(
    `
    select c.nombre,
           (select count(*) from metrica_dia m
             where m.cliente_id = c.id
               and m.fecha >= date_trunc('month', current_date - 1)::date
               and m.fecha < date_trunc('month', current_date)::date)::int as dias,
           exists (select 1 from objetivo_mes o
                    where o.cliente_id = c.id
                      and o.periodo = date_trunc('month', current_date - 1)::date) as objetivo
    from cliente c
    where c.fase = 'produccion' and c.estado = 'activo' and not c.archivado
    order by c.nombre
    `,
  );

  if (clientes.length === 0) return;

  await publicar("Cierre de mes", [
    seccion("*Cierre del mes anterior*"),
    seccion(
      clientes
        .map(
          (c) =>
            `• *${c.nombre}* — ${c.dias} días registrados` +
            (c.objetivo ? "" : " · sin objetivo cargado"),
        )
        .join("\n"),
    ),
    contexto(`<${base()}/metricas|Revisar métricas>`),
  ]);
}
