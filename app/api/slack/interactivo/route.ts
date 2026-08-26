import { firmaValida, publicar, abrirModal } from "@/lib/slack/cliente";
import { sql, uno, enTransaccion } from "@/lib/db";
import { metricasDelDia } from "@/lib/consultas/metricas";
import { guardarDiaMetricas } from "@/lib/metricasGuardar";
import { interpretarBloque } from "@/lib/metricasTexto";
import { hoy, fechaCorta } from "@/lib/fechas";
import type { Propuesta } from "@/lib/slack/clasificar";

export const dynamic = "force-dynamic";

type Payload = {
  type: string;
  trigger_id?: string;
  user?: { id: string };
  actions?: { action_id: string; value?: string }[];
  message?: { thread_ts?: string; ts?: string };
  container?: { thread_ts?: string; message_ts?: string };
  view?: {
    callback_id: string;
    private_metadata: string;
    state: { values: Record<string, Record<string, { value?: string }>> };
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
    console.warn("Slack: interactividad rechazada por firma inválida.");
    return new Response("Firma inválida", { status: 401 });
  }

  const payload = JSON.parse(
    new URLSearchParams(cuerpo).get("payload") ?? "{}",
  ) as Payload;

  if (payload.type === "view_submission") {
    return manejarModal(payload);
  }

  if (payload.type === "block_actions") {
    const accion = payload.actions?.[0];
    if (!accion) return new Response("", { status: 200 });

    const hilo = payload.container?.thread_ts ?? payload.container?.message_ts;

    if (accion.action_id === "abrir_metricas" && payload.trigger_id) {
      await abrirModalMetricas(payload.trigger_id, accion.value ?? hoy());
    } else if (accion.action_id === "guardar_propuesta" && accion.value) {
      void resolver(accion.value, true, hilo);
    } else if (accion.action_id === "descartar_propuesta" && accion.value) {
      void resolver(accion.value, false, hilo);
    }
  }

  return new Response("", { status: 200 });
}

// ---------------------------------------------------------------- propuestas

async function resolver(id: string, aceptar: boolean, hilo?: string) {
  try {
    const fila = await uno<{ payload: Propuesta; estado: string }>(
      "select payload, estado from propuesta_slack where id = $1",
      [id],
    );
    if (!fila || fila.estado !== "pendiente") return;

    if (!aceptar) {
      await sql(
        "update propuesta_slack set estado = 'descartada', resuelto_en = now() where id = $1",
        [id],
      );
      await publicar("Descartado.", undefined, hilo);
      return;
    }

    const p = fila.payload;
    if (!p.cliente_id) {
      await publicar(
        "No puedo guardarlo sin saber a qué cliente pertenece.",
        undefined,
        hilo,
      );
      return;
    }

    const eventoId = await enTransaccion(async (q) => {
      const [evento] = await q<{ id: string }>(
        `insert into evento
           (cliente_id, tipo, titulo, cuerpo, severidad, estado_seguimiento, origen)
         values ($1, $2, $3, $4, $5, $6, 'slack')
         returning id`,
        [
          p.cliente_id,
          p.tipo,
          p.titulo,
          p.cuerpo,
          p.severidad,
          p.seguir ? "abierto" : null,
        ],
      );

      if (p.compromiso) {
        await q(
          `insert into compromiso (cliente_id, descripcion, lado, fecha_limite, evento_origen_id)
           values ($1, $2, 'interno', $3, $4)`,
          [p.cliente_id, p.compromiso.descripcion, p.compromiso.fecha_limite, evento.id],
        );
      }

      await q(
        `update propuesta_slack set estado = 'aceptada', evento_id = $2, resuelto_en = now()
         where id = $1`,
        [id, evento.id],
      );

      return evento.id;
    });

    const url = process.env.APP_URL?.replace(/\/$/, "") ?? "";
    await publicar(
      `Guardado en *${p.cliente_nombre}*` +
        (p.compromiso ? " con su compromiso" : "") +
        (url ? ` · <${url}/clientes/${p.cliente_id}/timeline|ver>` : ""),
      undefined,
      hilo,
    );
    void eventoId;
  } catch (error) {
    console.error("Resolviendo propuesta de Slack:", error);
    await publicar("No pude guardarlo. Está en los logs.", undefined, hilo).catch(() => {});
  }
}

// ---------------------------------------------------------------- métricas

async function abrirModalMetricas(triggerId: string, fecha: string) {
  const clientes = await metricasDelDia(fecha);
  const faltan = clientes.filter((c) => c.fecha === null);
  const pendientes = faltan.length > 0 ? faltan : clientes;

  await abrirModal(triggerId, {
    type: "modal",
    callback_id: "metricas_dia",
    private_metadata: fecha,
    title: { type: "plain_text", text: "Registro del día" },
    submit: { type: "plain_text", text: "Guardar" },
    close: { type: "plain_text", text: "Cerrar" },
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text:
            `*${fechaCorta(fecha)}* — una línea por cliente:\n` +
            "`nombre  llamadas  minutos  contención`",
        },
      },
      {
        type: "input",
        block_id: "bloque",
        label: { type: "plain_text", text: "Datos" },
        element: {
          type: "plain_text_input",
          action_id: "texto",
          multiline: true,
          initial_value: pendientes.map((c) => `${c.cliente_nombre} `).join("\n"),
        },
        hint: {
          type: "plain_text",
          text: "Deja una línea sin números si ese cliente no tuvo actividad.",
        },
      },
    ],
  });
}

async function manejarModal(payload: Payload) {
  const vista = payload.view!;
  if (vista.callback_id !== "metricas_dia") return new Response("", { status: 200 });

  const fecha = vista.private_metadata || hoy();
  const texto = vista.state.values.bloque?.texto?.value ?? "";

  const clientes = await metricasDelDia(fecha);
  const { lineas, ignorados } = interpretarBloque(
    texto,
    clientes.map((c) => ({ id: c.cliente_id, nombre: c.cliente_nombre })),
  );

  if (lineas.length === 0) {
    return Response.json({
      response_action: "errors",
      errors: { bloque: "No reconocí ninguna línea con cliente y números." },
    });
  }

  try {
    await guardarDiaMetricas(
      fecha,
      lineas.map((l) => ({
        clienteId: l.clienteId,
        llamadas: l.llamadas === "" ? null : Number(l.llamadas),
        minutos: l.minutos === "" ? null : Number(l.minutos),
        contencion: l.contencion === "" ? null : Number(l.contencion),
        sinActividad: l.llamadas === "",
      })),
    );
  } catch (error) {
    return Response.json({
      response_action: "errors",
      errors: { bloque: error instanceof Error ? error.message : "No se pudo guardar" },
    });
  }

  void publicar(
    `Registrado el día ${fechaCorta(fecha)}: ${lineas.length} cliente` +
      `${lineas.length === 1 ? "" : "s"}` +
      (ignorados.length > 0 ? ` · sin reconocer: ${ignorados.join(" · ")}` : ""),
  ).catch(() => {});

  return Response.json({ response_action: "clear" });
}
