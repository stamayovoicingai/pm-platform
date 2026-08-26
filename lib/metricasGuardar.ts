import "server-only";
import { enTransaccion } from "./db";

export type EntradaDia = {
  clienteId: string;
  llamadas: number | null;
  minutos: number | null;
  contencion: number | null;
  sinActividad: boolean;
  notas?: string | null;
};

/**
 * Guarda el día. Compartido por la app y por el modal de Slack: dos caminos de
 * entrada, una sola regla sobre qué se considera una fila válida.
 */
export async function guardarDiaMetricas(fecha: string, entradas: EntradaDia[]) {
  await enTransaccion(async (q) => {
    for (const e of entradas) {
      const vacio = e.llamadas === null && e.minutos === null && e.contencion === null;

      // Enviar el formulario en blanco no borra lo ya registrado.
      if (vacio && !e.sinActividad) continue;

      if (!e.sinActividad && e.llamadas === null) {
        throw new Error("Si el día tuvo actividad, hacen falta al menos las llamadas");
      }

      await q(
        `insert into metrica_dia
           (cliente_id, fecha, llamadas_totales, duracion_total_min,
            contencion_pct, sin_actividad, notas, origen)
         values ($1, $2, $3, $4, $5, $6, $7, $8)
         on conflict (cliente_id, fecha) do update set
           llamadas_totales   = excluded.llamadas_totales,
           duracion_total_min = excluded.duracion_total_min,
           contencion_pct     = excluded.contencion_pct,
           sin_actividad      = excluded.sin_actividad,
           notas              = excluded.notas`,
        [
          e.clienteId,
          fecha,
          e.sinActividad ? null : e.llamadas,
          e.sinActividad ? null : e.minutos,
          e.sinActividad ? null : e.contencion,
          e.sinActividad,
          e.notas ?? null,
          "app",
        ],
      );
    }
  });
}
