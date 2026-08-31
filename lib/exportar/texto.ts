/**
 * Utilidades de maquetación para los archivos del export.
 *
 * Todo se escribe a 76 columnas: es el ancho al que un párrafo sigue siendo
 * cómodo de leer y, sobre todo, el que cabe sin reflujo en cualquier visor de
 * texto, incluido el Bloc de notas y la vista previa del correo.
 */

export const ANCHO = 76;

export function titulo(texto: string): string {
  return `${texto.toUpperCase()}\n${"═".repeat(ANCHO)}`;
}

export function seccion(texto: string): string {
  return `\n${texto.toUpperCase()}\n${"─".repeat(ANCHO)}`;
}

/** `Etiqueta          valor`, con la columna de valores siempre alineada. */
export function campo(etiqueta: string, valor: string | null | undefined): string {
  return `${etiqueta.padEnd(22)}${valor === null || valor === undefined || valor === "" ? "—" : valor}`;
}

/** Parte un texto en líneas de `ancho` sin cortar palabras. */
export function envolver(texto: string, sangria = 0, ancho = ANCHO): string {
  const margen = " ".repeat(sangria);
  const util = ancho - sangria;

  return texto
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((parrafo) => {
      if (parrafo.trim() === "") return "";
      const lineas: string[] = [];
      let actual = "";
      for (const palabra of parrafo.trim().split(/\s+/)) {
        if (actual === "") actual = palabra;
        else if (actual.length + 1 + palabra.length <= util) actual += ` ${palabra}`;
        else {
          lineas.push(margen + actual);
          actual = palabra;
        }
      }
      if (actual) lineas.push(margen + actual);
      return lineas.join("\n");
    })
    .join("\n");
}

export function miles(valor: number | string | null | undefined): string {
  if (valor === null || valor === undefined || valor === "") return "—";
  const n = Number(valor);
  if (!Number.isFinite(n)) return "—";
  return n.toLocaleString("es-CO", { maximumFractionDigits: 0 });
}

export function decimal(valor: number | string | null | undefined, cifras = 1): string {
  if (valor === null || valor === undefined || valor === "") return "—";
  const n = Number(valor);
  if (!Number.isFinite(n)) return "—";
  return n.toLocaleString("es-CO", {
    minimumFractionDigits: cifras,
    maximumFractionDigits: cifras,
  });
}

export function porcentaje(valor: number | string | null | undefined): string {
  if (valor === null || valor === undefined || valor === "") return "—";
  const n = Number(valor);
  return Number.isFinite(n) ? `${n.toFixed(1)}%` : "—";
}

/** Variación entre dos periodos, con signo. */
export function delta(
  actual: number | string | null,
  previo: number | string | null,
): string {
  const a = Number(actual);
  const p = Number(previo);
  if (!Number.isFinite(a) || !Number.isFinite(p) || p === 0) return "—";
  const d = ((a - p) / p) * 100;
  return `${d > 0 ? "+" : ""}${d.toFixed(0)}%`;
}

/** Tabla de ancho fijo. `alinear` marca con `d` las columnas numéricas. */
export function tabla(
  cabeceras: string[],
  filas: string[][],
  alinear: ("i" | "d")[] = [],
): string {
  const anchos = cabeceras.map((cabecera, i) =>
    Math.max(cabecera.length, ...filas.map((f) => (f[i] ?? "").length)),
  );

  const pintar = (celdas: string[]) =>
    celdas
      .map((celda, i) =>
        alinear[i] === "d"
          ? (celda ?? "").padStart(anchos[i])
          : (celda ?? "").padEnd(anchos[i]),
      )
      .join("  ")
      .trimEnd();

  return [
    pintar(cabeceras),
    anchos.map((a) => "-".repeat(a)).join("  "),
    ...filas.map(pintar),
  ].join("\n");
}

/** Un campo CSV según RFC 4180: comillas solo cuando hacen falta. */
export function csvCampo(valor: unknown): string {
  if (valor === null || valor === undefined) return "";
  const texto = String(valor).replace(/\r\n?|\n/g, " ").trim();
  return /[",;]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto;
}

export function csv(cabeceras: string[], filas: unknown[][]): string {
  return [cabeceras, ...filas].map((fila) => fila.map(csvCampo).join(",")).join("\r\n");
}

/**
 * Nombre utilizable como archivo en Windows, macOS y Linux a la vez.
 * Windows es el más restrictivo: nada de `\ / : * ? " < > |`.
 */
export function nombreArchivo(texto: string): string {
  const limpio = texto
    .replace(/[\\/:*?"<>|]/g, "-")
    .replace(/\s+/g, " ")
    .replace(/^[.\s]+|[.\s]+$/g, "")
    .slice(0, 80);
  return limpio || "sin-nombre";
}

/**
 * `prefijo` en la primera línea y el resto del texto sangrado debajo, para que
 * un título largo no rompa el ancho de la página.
 */
export function colgante(prefijo: string, texto: string, ancho = ANCHO): string {
  const envuelto = envolver(texto, prefijo.length, ancho);
  return prefijo + envuelto.slice(prefijo.length);
}

/**
 * Recorta a `max` caracteres para que quepa en una columna.
 *
 * Solo se usa en las tablas de resumen, donde lo que importa es reconocer la
 * fila: el texto completo está siempre en la ficha del cliente.
 */
export function recortar(texto: string, max: number): string {
  const limpio = texto.replace(/\s+/g, " ").trim();
  return limpio.length <= max ? limpio : `${limpio.slice(0, max - 1).trimEnd()}…`;
}
