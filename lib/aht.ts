/**
 * El AHT llega como segundos (`310`) o como mm:ss (`5:10`), que es como suele
 * venir en las actas del partner. Internamente siempre son segundos.
 */
const MINIMO_PLAUSIBLE_SEG = 20;

export function aSegundos(valor: string): number | null {
  const limpio = valor.trim();
  if (limpio === "") return null;

  const conDosPuntos = limpio.match(/^(\d+):([0-5]?\d)$/);
  if (conDosPuntos) {
    return Number(conDosPuntos[1]) * 60 + Number(conDosPuntos[2]);
  }

  const n = Number(limpio.replace(",", "."));
  if (!Number.isFinite(n) || n <= 0) {
    throw new Error(`AHT: "${valor}" no es válido. Usa segundos (310) o mm:ss (5:10)`);
  }

  // Un número suelto son segundos. Por debajo de este suelo casi siempre es
  // alguien escribiendo minutos ("5.2"), y guardarlo tal cual envenenaría la
  // comparación sin que nadie se entere.
  if (n < MINIMO_PLAUSIBLE_SEG) {
    throw new Error(
      `AHT: ${valor} segundos es demasiado bajo para una llamada. ` +
        `Si querías decir minutos, escríbelo como mm:ss (por ejemplo 5:12)`,
    );
  }

  return Math.round(n);
}

export function mmss(segundos: number | null): string {
  if (segundos === null) return "—";
  const m = Math.floor(segundos / 60);
  const s = Math.round(segundos % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}
