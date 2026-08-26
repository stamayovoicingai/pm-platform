import "server-only";
import { pedirJson, proveedorActivo } from "../llm";
import { sql } from "../db";
import { TIPOS_EVENTO_MANUAL, SEVERIDADES, ETIQUETA_EVENTO } from "../dominio";

export type Propuesta = {
  cliente_id: string | null;
  cliente_nombre: string | null;
  tipo: string;
  severidad: string;
  titulo: string;
  cuerpo: string | null;
  seguir: boolean;
  compromiso: { descripcion: string; fecha_limite: string | null } | null;
};

const INSTRUCCIONES = `Conviertes una nota suelta de un product manager en un registro estructurado.

Devuelves EXCLUSIVAMENTE un objeto JSON con estas claves:
- cliente: nombre exacto de la lista de clientes, o null si no se menciona ninguno
- tipo: uno de [TIPOS]
- severidad: una de [SEVERIDADES]
- titulo: una frase corta, en el idioma original, sin el nombre del cliente
- cuerpo: el detalle si aporta algo más que el título, o null
- seguir: true si describe algo que sigue vivo y hay que cerrar, false si ya ocurrió
- compromiso: si alguien queda en hacer algo, {"descripcion": "...", "fecha_limite": "YYYY-MM-DD" o null}; si no, null

Reglas:
- No inventes clientes ni fechas. Si la fecha es relativa ("el viernes"), resuélvela con la fecha de hoy que se te da.
- Conserva siglas técnicas y cifras tal cual.
- El título va en el mismo idioma en que está escrita la nota.`;

/**
 * Interpreta un mensaje del canal. Devuelve null si no hay proveedor de IA o si
 * el modelo responde algo que no encaja: es preferible no proponer nada a
 * proponer basura que haya que corregir a mano.
 */
export async function clasificar(texto: string, hoy: string): Promise<Propuesta | null> {
  if (proveedorActivo() === "ninguno") return null;

  const clientes = await sql<{ id: string; nombre: string }>(
    "select id, nombre from cliente where not archivado order by nombre",
  );

  const instrucciones = INSTRUCCIONES.replace(
    "[TIPOS]",
    TIPOS_EVENTO_MANUAL.map((t) => `${t} (${ETIQUETA_EVENTO[t]})`).join(", "),
  ).replace("[SEVERIDADES]", SEVERIDADES.join(", "));

  try {
    const respuesta = await pedirJson(
      instrucciones,
      `Hoy es ${hoy}.\nClientes: ${clientes.map((c) => c.nombre).join(" | ")}\n\nNota: ${texto}`,
      2000,
    );

    const json = respuesta.slice(respuesta.indexOf("{"), respuesta.lastIndexOf("}") + 1);
    const bruto = JSON.parse(json) as Record<string, unknown>;

    const nombre = typeof bruto.cliente === "string" ? bruto.cliente : null;
    const cliente = nombre
      ? clientes.find((c) => c.nombre.toLowerCase() === nombre.toLowerCase())
      : undefined;

    const tipo = String(bruto.tipo ?? "nota");
    const severidad = String(bruto.severidad ?? "info");
    const titulo = String(bruto.titulo ?? "").trim();
    if (!titulo) return null;

    const compromiso =
      bruto.compromiso && typeof bruto.compromiso === "object"
        ? (bruto.compromiso as { descripcion?: unknown; fecha_limite?: unknown })
        : null;

    return {
      cliente_id: cliente?.id ?? null,
      cliente_nombre: cliente?.nombre ?? null,
      tipo: TIPOS_EVENTO_MANUAL.includes(tipo as never) ? tipo : "nota",
      severidad: SEVERIDADES.includes(severidad as never) ? severidad : "info",
      titulo,
      cuerpo: typeof bruto.cuerpo === "string" && bruto.cuerpo.trim() ? bruto.cuerpo : null,
      seguir: bruto.seguir === true,
      compromiso:
        compromiso && typeof compromiso.descripcion === "string"
          ? {
              descripcion: compromiso.descripcion,
              fecha_limite:
                typeof compromiso.fecha_limite === "string" &&
                /^\d{4}-\d{2}-\d{2}$/.test(compromiso.fecha_limite)
                  ? compromiso.fecha_limite
                  : null,
            }
          : null,
    };
  } catch (error) {
    console.error("Clasificación fallida:", error);
    return null;
  }
}
