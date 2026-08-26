/**
 * Intérpretes de lo que se escribe en el canal. Puros y sin dependencias: son
 * las tres puertas que deciden qué hacer con un mensaje, y hay que poder
 * probarlas sueltas.
 */

export function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[¿?¡!.,:;]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// ---------------------------------------------------------------- consultas

const PALABRAS_CONSULTA = [
  "como va",
  "como esta",
  "que hay",
  "que tiene",
  "estado de",
  "estado",
  "abiertos",
  "abierto",
  "pendientes",
  "pendiente",
  "resumen",
  "status",
  "dame",
  "muestrame",
];

export type Consulta =
  | { tipo: "cliente"; clienteId: string; nombre: string }
  | { tipo: "global" };

/**
 * Distingue "cómo va Sura EPS" de "Sura EPS: se cayó el SIP".
 *
 * Se exige una palabra de consulta: mencionar al cliente no basta, porque casi
 * todas las notas lo mencionan y acabarían respondidas en vez de registradas.
 */
export function interpretarConsulta(
  texto: string,
  clientes: { id: string; nombre: string }[],
): Consulta | null {
  const limpio = normalizar(texto);
  if (limpio.length > 120) return null;

  const esConsulta = PALABRAS_CONSULTA.some(
    (p) => limpio.startsWith(p) || limpio.includes(` ${p} `) || limpio.endsWith(` ${p}`),
  );
  if (!esConsulta) return null;

  // El nombre más largo que aparezca, para que "Sura EPS Afiliaciones" gane a "Sura".
  const encontrado = clientes
    .filter((c) => limpio.includes(normalizar(c.nombre)))
    .sort((a, b) => b.nombre.length - a.nombre.length)[0];

  if (encontrado) {
    return { tipo: "cliente", clienteId: encontrado.id, nombre: encontrado.nombre };
  }

  const global = ["pendientes", "pendiente", "resumen", "abiertos", "que tengo"].some((p) =>
    limpio.includes(p),
  );
  return global ? { tipo: "global" } : null;
}

// ---------------------------------------------------------------- acciones

export type Accion =
  | { tipo: "cerrar"; n: number; nota: string | null }
  | { tipo: "borrar"; n: number }
  | { tipo: "actualizar"; n: number; nota: string };

const CIERRE = [
  "resuelto",
  "resuelta",
  "solucionado",
  "solucionada",
  "ya esta",
  "ya quedo",
  "ya lo resolvieron",
  "cerrado",
  "cerrada",
  "listo",
];

/**
 * Interpreta una respuesta dentro de un hilo donde el bot mostró una lista.
 * El número se refiere a esa lista.
 */
export function interpretarAccion(texto: string): Accion | null {
  const limpio = normalizar(texto);

  const borrar = limpio.match(/^(?:borra|borrar|elimina|eliminar|quita|quitar)\s+(?:el\s+|la\s+)?(\d+)/);
  if (borrar) return { tipo: "borrar", n: Number(borrar[1]) };

  const cerrar = limpio.match(
    /^(?:cierra|cerrar|resuelve|resolver|marca|marcar)\s+(?:el\s+|la\s+|como\s+)*(\d+)\s*(.*)$/,
  );
  if (cerrar) {
    const resto = cerrar[2].trim();
    return { tipo: "cerrar", n: Number(cerrar[1]), nota: resto || null };
  }

  // "el 1 ya lo resolvieron, TP habilitó la IP" · "1: sigue igual"
  const referencia = limpio.match(/^(?:el|la)?\s*(\d+)\s+(.+)$/);
  if (referencia) {
    const n = Number(referencia[1]);
    const nota = texto.trim().replace(/^(?:el|la|El|La)?\s*\d+\s*[:.\-]?\s*/, "").trim();
    if (!nota) return null;

    const cierra = CIERRE.some((c) => normalizar(nota).includes(c));
    return cierra ? { tipo: "cerrar", n, nota } : { tipo: "actualizar", n, nota };
  }

  return null;
}

// ---------------------------------------------------------------- preguntas

const INTERROGATIVOS = [
  "por que",
  "porque",
  "cuando",
  "quien",
  "quienes",
  "cuanto",
  "cuantos",
  "cuantas",
  "que paso",
  "que hubo",
  "cual",
  "cuales",
  "donde",
  "como",
  "que",
  "sabes",
  "recuerdas",
  "dime",
];

/**
 * Detecta que es una pregunta antes de que el clasificador la convierta en una
 * nota. Se pide señal explícita —signo de interrogación o palabra
 * interrogativa al principio— porque "el cliente preguntó cuándo salimos" es
 * una nota que registrar, no una pregunta al bot.
 */
export function esPregunta(texto: string): boolean {
  const bruto = texto.trim();
  if (bruto.includes("?") || bruto.startsWith("¿")) return true;

  const limpio = normalizar(bruto);
  return INTERROGATIVOS.some((p) => limpio.startsWith(`${p} `));
}

/** El cliente nombrado en la pregunta, si hay alguno. */
export function clienteDeLaPregunta(
  texto: string,
  clientes: { id: string; nombre: string }[],
): string | null {
  const limpio = normalizar(texto);
  const encontrado = clientes
    .filter((c) => limpio.includes(normalizar(c.nombre)))
    .sort((a, b) => b.nombre.length - a.nombre.length)[0];
  return encontrado?.id ?? null;
}
