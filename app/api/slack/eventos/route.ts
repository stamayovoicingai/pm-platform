import { firmaValida, publicar, type Bloque } from "@/lib/slack/cliente";
import { clasificar } from "@/lib/slack/clasificar";
import { sql, uno } from "@/lib/db";
import { hoy, fechaCorta } from "@/lib/fechas";
import { ETIQUETA_EVENTO, ETIQUETA_SEVERIDAD, type TipoEvento, type Severidad } from "@/lib/dominio";

export const dynamic = "force-dynamic";

type EventoSlack = {
  type: string;
  challenge?: string;
  event?: {
    type: string;
    subtype?: string;
    bot_id?: string;
    text?: string;
    user?: string;
    channel?: string;
    ts?: string;
    thread_ts?: string;
  };
};

export async function POST(peticion: Request) {
  const cuerpo = await peticion.text();

  if (
    !firmaValida(
      cuerpo,
      peticion.headers.get("x-slack-signature"),
      peticion.headers.get("x-slack-request-timestamp"),
    )
  ) {
    return new Response("Firma inválida", { status: 401 });
  }

  const datos = JSON.parse(cuerpo) as EventoSlack;

  if (datos.type === "url_verification") {
    return Response.json({ challenge: datos.challenge });
  }

  const evento = datos.event;
  const esMensajeDePersona =
    evento?.type === "message" &&
    !evento.bot_id &&
    !evento.subtype &&
    !evento.thread_ts &&
    Boolean(evento.text?.trim());

  // Slack reintenta si no respondemos en tres segundos, y clasificar tarda más.
  // Se responde ya y el trabajo sigue: el servidor es un proceso vivo, no una
  // función que muere al devolver.
  if (esMensajeDePersona) {
    void procesar(evento!.text!, evento!.channel!, evento!.ts!, evento!.user);
  }

  return new Response("", { status: 200 });
}

async function procesar(texto: string, canal: string, ts: string, usuario?: string) {
  try {
    const propuesta = await clasificar(texto, hoy());
    if (!propuesta) return;

    const fila = await uno<{ id: string }>(
      `insert into propuesta_slack (canal, hilo_ts, usuario, texto, payload)
       values ($1, $2, $3, $4, $5) returning id`,
      [canal, ts, usuario ?? null, texto, JSON.stringify(propuesta)],
    );

    const detalle = [
      `*${propuesta.cliente_nombre ?? "Sin cliente"}* · ` +
        `${ETIQUETA_EVENTO[propuesta.tipo as TipoEvento]}` +
        ` · severidad ${ETIQUETA_SEVERIDAD[propuesta.severidad as Severidad].toLowerCase()}` +
        (propuesta.seguir ? " · con seguimiento" : ""),
      `*${propuesta.titulo}*`,
      propuesta.cuerpo ?? "",
      propuesta.compromiso
        ? `Compromiso: ${propuesta.compromiso.descripcion}` +
          (propuesta.compromiso.fecha_limite
            ? ` · vence ${fechaCorta(propuesta.compromiso.fecha_limite)}`
            : "")
        : "",
    ]
      .filter(Boolean)
      .join("\n");

    const bloques: Bloque[] = [
      { type: "section", text: { type: "mrkdwn", text: detalle } },
      {
        type: "actions",
        elements: [
          {
            type: "button",
            text: { type: "plain_text", text: "Guardar" },
            style: "primary",
            action_id: "guardar_propuesta",
            value: fila!.id,
          },
          {
            type: "button",
            text: { type: "plain_text", text: "Descartar" },
            action_id: "descartar_propuesta",
            value: fila!.id,
          },
        ],
      },
    ];

    if (!propuesta.cliente_id) {
      bloques.push({
        type: "context",
        elements: [
          {
            type: "mrkdwn",
            text: "No identifiqué el cliente. Guardarlo así no es posible: responde nombrándolo.",
          },
        ],
      });
    }

    await publicar("Esto es lo que entendí", bloques, ts);
  } catch (error) {
    console.error("Procesando mensaje de Slack:", error);
  }
}

export async function GET() {
  const [{ n }] = await sql<{ n: string }>(
    "select count(*)::text as n from propuesta_slack where estado = 'pendiente'",
  );
  return Response.json({ ok: true, propuestas_pendientes: Number(n) });
}
