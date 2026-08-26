import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

const API = "https://slack.com/api";

export function slackConfigurado(): boolean {
  return Boolean(process.env.SLACK_BOT_TOKEN && process.env.SLACK_CANAL);
}

async function llamar(metodo: string, cuerpo: unknown) {
  const respuesta = await fetch(`${API}/${metodo}`, {
    method: "POST",
    headers: {
      "content-type": "application/json; charset=utf-8",
      authorization: `Bearer ${process.env.SLACK_BOT_TOKEN}`,
    },
    body: JSON.stringify(cuerpo),
  });

  const datos = (await respuesta.json()) as { ok: boolean; error?: string; ts?: string };
  if (!datos.ok) throw new Error(`Slack ${metodo}: ${datos.error ?? "error desconocido"}`);
  return datos;
}

export type Bloque = Record<string, unknown>;

export async function publicar(texto: string, bloques?: Bloque[], hiloTs?: string) {
  return llamar("chat.postMessage", {
    channel: process.env.SLACK_CANAL,
    text: texto,
    blocks: bloques,
    thread_ts: hiloTs,
    unfurl_links: false,
  });
}

export async function abrirModal(triggerId: string, vista: unknown) {
  return llamar("views.open", { trigger_id: triggerId, view: vista });
}

/**
 * Comprueba la firma de Slack sobre el cuerpo crudo.
 *
 * La ventana de cinco minutos es lo que impide reenviar una petición
 * interceptada; sin ella, una firma válida serviría para siempre.
 */
export function firmaValida(cuerpo: string, firma: string | null, marca: string | null) {
  const secreto = process.env.SLACK_SIGNING_SECRET;
  if (!secreto || !firma || !marca) return false;

  const edad = Math.abs(Date.now() / 1000 - Number(marca));
  if (!Number.isFinite(edad) || edad > 300) return false;

  const esperada =
    "v0=" + createHmac("sha256", secreto).update(`v0:${marca}:${cuerpo}`).digest("hex");

  const a = Buffer.from(esperada);
  const b = Buffer.from(firma);
  return a.length === b.length && timingSafeEqual(a, b);
}
