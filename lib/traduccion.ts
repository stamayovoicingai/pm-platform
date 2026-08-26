import "server-only";
import { createHash } from "node:crypto";
import { pedirJson, proveedorActivo } from "./llm";
import { sql } from "./db";
import type { Idioma } from "./preferencias";

const LIMITE_POR_LOTE = 60;

/**
 * Cortacircuitos. Sin esto, un modelo mal configurado dispara una llamada
 * fallida por cada texto de cada página, llenando los logs y gastando cuota
 * para nada. Tras un fallo se deja de intentar durante un minuto.
 */
let pausaHasta = 0;
const PAUSA_MS = 60_000;

function hash(texto: string) {
  return createHash("sha256").update(texto).digest("hex").slice(0, 32);
}

/**
 * Traduce una lista de textos al idioma pedido, tirando de caché.
 *
 * Nunca lanza: si falta la clave de API o el modelo devuelve algo raro, se
 * devuelve el texto original. Una traducción ausente es un inconveniente;
 * una página caída por no poder traducir, no.
 */
export async function traducir(
  textos: string[],
  idioma: Idioma,
): Promise<Map<string, string>> {
  const salida = new Map<string, string>();
  if (idioma === "es") return salida;

  const unicos = [...new Set(textos.map((t) => t.trim()).filter(Boolean))];
  if (unicos.length === 0) return salida;

  const porHash = new Map(unicos.map((t) => [hash(t), t]));

  const cacheadas = await sql<{ hash: string; texto: string }>(
    "select hash, texto from traduccion where idioma = $1 and hash = any($2::text[])",
    [idioma, [...porHash.keys()]],
  );
  for (const fila of cacheadas) {
    const original = porHash.get(fila.hash);
    if (original) salida.set(original, fila.texto);
  }

  const faltantes = unicos.filter((t) => !salida.has(t));
  if (faltantes.length === 0) return salida;

  if (proveedorActivo() === "ninguno") return salida;
  if (Date.now() < pausaHasta) return salida;

  try {
    for (let i = 0; i < faltantes.length; i += LIMITE_POR_LOTE) {
      const lote = faltantes.slice(i, i + LIMITE_POR_LOTE);
      const traducidos = await pedirTraduccion(lote, idioma);
      if (traducidos.length !== lote.length) continue;

      for (let j = 0; j < lote.length; j++) {
        salida.set(lote[j], traducidos[j]);
      }

      await sql(
        `insert into traduccion (hash, idioma, texto_origen, texto)
         select * from unnest($1::text[], $2::text[], $3::text[], $4::text[])
         on conflict (hash, idioma) do nothing`,
        [
          lote.map(hash),
          lote.map(() => idioma),
          lote,
          lote.map((t) => salida.get(t) ?? t),
        ],
      );
    }
  } catch (error) {
    pausaHasta = Date.now() + PAUSA_MS;
    console.error(
      "Traducción fallida, se muestra el original y se pausa un minuto:",
      error instanceof Error ? error.message : error,
    );
  }

  return salida;
}

async function pedirTraduccion(textos: string[], idioma: Idioma): Promise<string[]> {
  const texto = await pedirJson(
    "Traduces notas internas de un product manager de una empresa de agentes de voz. " +
      "Devuelves EXCLUSIVAMENTE un array JSON de strings, del mismo tamaño y en el mismo " +
      "orden que el array recibido. Conservas nombres propios, nombres de cliente, siglas " +
      "técnicas (SIP, STT, TTS, AHT, SLA, CCT, IVR) y cifras tal cual. No añades " +
      "explicaciones ni comentarios.",
    `Traduce al ${idioma === "en" ? "inglés" : "español"}:\n${JSON.stringify(textos)}`,
  );

  const json = texto.slice(texto.indexOf("["), texto.lastIndexOf("]") + 1);
  const analizado: unknown = JSON.parse(json);

  if (!Array.isArray(analizado) || analizado.some((x) => typeof x !== "string")) {
    throw new Error("El modelo no devolvió un array de strings");
  }
  return analizado as string[];
}

/**
 * Traduce campos concretos de una lista de filas. Los nombres de cliente no
 * pasan por aquí a propósito: son nombres propios y traducirlos sería un error.
 */
export async function traducirFilas<T extends Record<string, unknown>>(
  idioma: Idioma,
  filas: T[],
  campos: (keyof T)[],
): Promise<T[]> {
  if (idioma === "es" || filas.length === 0) return filas;

  const textos: string[] = [];
  for (const fila of filas) {
    for (const campo of campos) {
      const valor = fila[campo];
      if (typeof valor === "string" && valor.trim()) textos.push(valor);
    }
  }

  const mapa = await traducir(textos, idioma);
  if (mapa.size === 0) return filas;

  return filas.map((fila) => {
    const copia = { ...fila };
    for (const campo of campos) {
      const valor = fila[campo];
      if (typeof valor === "string") {
        const traducido = mapa.get(valor.trim());
        if (traducido) copia[campo] = traducido as T[keyof T];
      }
    }
    return copia;
  });
}

/**
 * Igual que `traducirFilas`, para colecciones agrupadas por id — el hilo de
 * actualizaciones de cada evento, por ejemplo. Todo entra en una sola llamada.
 */
export async function traducirAgrupado<T extends Record<string, unknown>>(
  idioma: Idioma,
  grupos: Record<string, T[]>,
  campos: (keyof T)[],
): Promise<Record<string, T[]>> {
  if (idioma === "es") return grupos;

  const claves = Object.keys(grupos);
  const planas = claves.flatMap((clave) => grupos[clave]);
  if (planas.length === 0) return grupos;

  const traducidas = await traducirFilas(idioma, planas, campos);

  const salida: Record<string, T[]> = {};
  let i = 0;
  for (const clave of claves) {
    salida[clave] = grupos[clave].map(() => traducidas[i++]);
  }
  return salida;
}
