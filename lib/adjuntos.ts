/** Reglas de los archivos adjuntos, compartidas entre servidor y cliente. */

export const LIMITE_BYTES = 10 * 1024 * 1024; // 10 MB
export const MAX_ARCHIVOS_POR_SUBIDA = 3;

export function tamanoLegible(bytes: number | string): string {
  const n = typeof bytes === "string" ? Number(bytes) : bytes;
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Nunca devolvemos el tipo MIME que declara el navegador. Un archivo llamado
 * `informe.html` con `text/html` se ejecutaría en el dominio de la app si el
 * navegador decidiera abrirlo; devolver siempre un tipo opaco, junto con
 * Content-Disposition: attachment, hace que el archivo se descargue y no se
 * interprete.
 */
export const TIPO_DESCARGA = "application/octet-stream";

/** Quita rutas y caracteres que rompen la cabecera Content-Disposition. */
export function nombreSeguro(nombre: string): string {
  const base = nombre.split(/[/\\]/).pop() ?? "archivo";
  const limpio = base.replace(/["\r\n]/g, "").trim();
  return limpio.slice(0, 200) || "archivo";
}
