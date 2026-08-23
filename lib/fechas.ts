export const ZONA = process.env.TZ_APP ?? "America/Bogota";

/** Fecha de hoy en la zona horaria de la app, como 'YYYY-MM-DD'. */
export function hoy(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: ZONA,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

/** Convierte lo que devuelve pg (Date o string) a 'YYYY-MM-DD'. */
export function aISO(valor: Date | string | null | undefined): string {
  if (!valor) return "";
  if (typeof valor === "string") return valor.slice(0, 10);
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: ZONA,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(valor);
}

const FORMATO_CORTO = new Intl.DateTimeFormat("es-CO", {
  timeZone: ZONA,
  day: "numeric",
  month: "short",
});

const FORMATO_LARGO = new Intl.DateTimeFormat("es-CO", {
  timeZone: ZONA,
  day: "numeric",
  month: "long",
  year: "numeric",
});

function comoFecha(valor: Date | string): Date {
  if (valor instanceof Date) return valor;
  // 'YYYY-MM-DD' se interpreta como UTC medianoche; suficiente para mostrar.
  return new Date(`${valor.slice(0, 10)}T12:00:00Z`);
}

export function fechaCorta(valor: Date | string | null | undefined): string {
  if (!valor) return "—";
  return FORMATO_CORTO.format(comoFecha(valor));
}

export function fechaLarga(valor: Date | string | null | undefined): string {
  if (!valor) return "—";
  return FORMATO_LARGO.format(comoFecha(valor));
}

/** Días que faltan (positivo) o que han pasado (negativo) hasta una fecha. */
export function diasHasta(valor: Date | string | null | undefined): number | null {
  if (!valor) return null;
  const objetivo = new Date(`${aISO(valor)}T00:00:00Z`).getTime();
  const referencia = new Date(`${hoy()}T00:00:00Z`).getTime();
  return Math.round((objetivo - referencia) / 86_400_000);
}

/** "en 3 días", "hoy", "hace 5 días" */
export function textoRelativo(valor: Date | string | null | undefined): string {
  const dias = diasHasta(valor);
  if (dias === null) return "—";
  if (dias === 0) return "hoy";
  if (dias === 1) return "mañana";
  if (dias === -1) return "ayer";
  if (dias > 0) return `en ${dias} días`;
  return `hace ${Math.abs(dias)} días`;
}

/** Primer día del mes de una fecha, como 'YYYY-MM-01'. */
export function inicioMes(valor: Date | string = hoy()): string {
  return `${aISO(valor).slice(0, 7)}-01`;
}
