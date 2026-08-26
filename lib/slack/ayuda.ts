import "server-only";
import { publicar, type Bloque } from "./cliente";
import { sql } from "../db";

export { pideAyuda } from "./deteccion";

const seccion = (texto: string): Bloque => ({
  type: "section",
  text: { type: "mrkdwn", text: texto },
});

export async function publicarAyuda(hiloTs?: string) {
  const clientes = await sql<{ nombre: string }>(
    "select nombre from cliente where not archivado order by nombre",
  );

  const enProduccion = await sql<{ nombre: string }>(
    `select nombre from cliente
     where fase = 'produccion' and estado = 'activo' and not archivado
     order by nombre`,
  );

  const base = process.env.APP_URL?.replace(/\/$/, "") ?? "";
  const ejemplo = enProduccion[0]?.nombre ?? clientes[0]?.nombre ?? "Nombre del cliente";

  const bloques: Bloque[] = [
    seccion("*Qué puedes hacer desde aquí*"),

    seccion(
      "*1 · Registrar escribiendo normal*\n" +
        "Escribe en el canal como se lo contarías a alguien. No hay formato ni comandos.\n\n" +
        `> ${ejemplo}: se cayó el SIP 20 minutos, el cliente está molesto, ` +
        "piden postmortem el viernes\n\n" +
        "Te respondo en el hilo con lo que entendí —cliente, tipo, gravedad, si hay que " +
        "seguirlo y si alguien quedó en hacer algo— y dos botones. *Nada se guarda hasta " +
        "que le das a Guardar.*\n" +
        "Menciona siempre el cliente: sin él no puedo guardarlo.",
    ),

    seccion(
      "*2 · Cerrar lo que sigue abierto*\n" +
        "Una incidencia o un bloqueo quedan abiertos hasta que los cierras. Para " +
        "actualizarlos, entra a la ficha del cliente en la app: cada uno tiene un hilo " +
        "donde añades qué pasó y cambias el estado a en curso, resuelto o descartado.",
    ),

    seccion(
      "*3 · Registrar el día*\n" +
        "A las 19:00 te aviso qué clientes faltan, con un botón que abre el formulario. " +
        "Una línea por cliente:\n" +
        "```\n" +
        (enProduccion.length > 0
          ? enProduccion
              .slice(0, 3)
              .map((c, i) => `${c.nombre}  ${1240 - i * 300}  ${3720 - i * 900}  ${71 - i * 4}`)
              .join("\n")
          : "Cliente  llamadas  minutos  contención") +
        "\n```\n" +
        "Es nombre, llamadas, minutos y porcentaje de contención. Si un cliente no tuvo " +
        "actividad, deja su línea sin números — no es lo mismo que un cero.",
    ),

    seccion(
      "*4 · Lo que te voy a mandar sin que lo pidas*\n" +
        "• *09:00* — hitos a 3 días, compromisos vencidos o que vencen, y lo abierto que sea grave\n" +
        "• *19:00* — qué falta por registrar del día\n" +
        "• *21:30* — solo si no registraste nada en todo el día\n" +
        "• *Lunes* — una línea por cliente con el movimiento de la semana\n" +
        "• *Día 1* — cierre de mes: días registrados y objetivos que falten",
    ),

    seccion(
      `*Clientes que conozco:* ${clientes.map((c) => c.nombre).join(" · ")}` +
        (base ? `\n\n<${base}|Abrir la plataforma>` : ""),
    ),

    {
      type: "context",
      elements: [
        {
          type: "mrkdwn",
          text: "Escribe *ayuda* cuando quieras volver a ver esto.",
        },
      ],
    },
  ];

  await publicar("Qué puedes hacer desde aquí", bloques, hiloTs);
}
