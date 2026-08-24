import {
  guardarObjetivoMes,
  guardarMetricaMes,
  borrarMetricaMes,
} from "@/app/acciones";
import { Vacio } from "./Seccion";
import type { ResumenMes, ObjetivoMes, MetricaMes } from "@/lib/consultas/metricas";
import { aISO, inicioMes } from "@/lib/fechas";

const MESES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

function nombreMes(periodo: string) {
  const iso = aISO(periodo);
  const [anio, mes] = iso.split("-");
  return `${MESES[Number(mes) - 1]} ${anio}`;
}

function num(valor: string | null, decimales = 0) {
  if (valor === null) return "—";
  return Number(valor).toLocaleString("es-CO", {
    minimumFractionDigits: decimales,
    maximumFractionDigits: decimales,
  });
}

/** Variación porcentual contra el mes anterior de la serie. */
function delta(actual: string | null, previo: string | null) {
  if (actual === null || previo === null) return null;
  const a = Number(actual);
  const p = Number(previo);
  if (!Number.isFinite(a) || !Number.isFinite(p) || p === 0) return null;
  return ((a - p) / p) * 100;
}

function Delta({ valor }: { valor: number | null }) {
  if (valor === null) return null;
  const signo = valor > 0 ? "+" : "";
  const color =
    Math.abs(valor) < 5
      ? "var(--texto-3)"
      : valor > 0
        ? "var(--acento)"
        : "var(--riesgo)";
  return (
    <span className="text-xs ml-1" style={{ color }}>
      {signo}
      {valor.toFixed(0)}%
    </span>
  );
}

export default function ResumenMetricas({
  clienteId,
  resumen,
  objetivos,
  meses,
}: {
  clienteId: string;
  resumen: ResumenMes[];
  objetivos: ObjetivoMes[];
  meses: MetricaMes[];
}) {
  const periodoActual = inicioMes();
  const objetivoActual = objetivos.find((o) => aISO(o.periodo) === periodoActual);

  return (
    <>
      {resumen.length === 0 ? (
        <Vacio>
          Sin métricas registradas. Se capturan en la pantalla de Métricas, y solo para
          clientes en fase producción.
        </Vacio>
      ) : (
        <div className="tarjeta overflow-x-auto">
          <table className="w-full text-sm" style={{ minWidth: "34rem" }}>
            <thead>
              <tr style={{ color: "var(--texto-3)" }}>
                <th className="text-left font-medium px-4 py-2.5">Mes</th>
                <th className="text-right font-medium px-3 py-2.5">Llamadas</th>
                <th className="text-right font-medium px-3 py-2.5">Minutos</th>
                <th className="text-right font-medium px-3 py-2.5">Media</th>
                <th className="text-right font-medium px-3 py-2.5">Contención</th>
                <th className="text-right font-medium px-4 py-2.5">Objetivo</th>
              </tr>
            </thead>
            <tbody>
              {resumen.map((mes, i) => {
                const previo = resumen[i + 1];
                const cumplimiento =
                  mes.llamadas_comprometidas && Number(mes.llamadas_comprometidas) > 0
                    ? (Number(mes.llamadas) / Number(mes.llamadas_comprometidas)) * 100
                    : null;
                return (
                  <tr key={String(mes.periodo)} style={{ borderTop: "1px solid var(--borde)" }}>
                    <td className="px-4 py-2.5">
                      {nombreMes(String(mes.periodo))}
                      <span
                        className="text-xs ml-1.5"
                        style={{ color: "var(--texto-3)" }}
                        title={
                          mes.fuente === "mes"
                            ? "Total del mes cargado a mano"
                            : "Sumado de los días registrados"
                        }
                      >
                        {mes.fuente === "mes"
                          ? "mensual"
                          : `${mes.dias_con_actividad}d`}
                      </span>
                    </td>
                    <td className="text-right px-3 py-2.5 whitespace-nowrap">
                      {num(mes.llamadas)}
                      <Delta valor={delta(mes.llamadas, previo?.llamadas ?? null)} />
                    </td>
                    <td className="text-right px-3 py-2.5 whitespace-nowrap">
                      {num(mes.minutos)}
                      <Delta valor={delta(mes.minutos, previo?.minutos ?? null)} />
                    </td>
                    <td className="text-right px-3 py-2.5">
                      {num(mes.duracion_promedio, 1)}
                    </td>
                    <td className="text-right px-3 py-2.5">
                      {mes.contencion_promedio === null
                        ? "—"
                        : `${num(mes.contencion_promedio, 1)}%`}
                    </td>
                    <td className="text-right px-4 py-2.5">
                      {cumplimiento === null ? "—" : `${cumplimiento.toFixed(0)}%`}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <details className="tarjeta mt-3">
        <summary
          className="px-4 py-2.5 text-sm cursor-pointer select-none"
          style={{ color: "var(--texto-2)" }}
        >
          Cargar un mes completo
        </summary>
        <div className="px-4 pb-4 pt-1 space-y-3">
          <p className="text-xs" style={{ color: "var(--texto-3)" }}>
            Para meses de los que tienes el total pero no el día a día. Un mes cargado
            aquí manda sobre la suma de sus días.
          </p>

          <form action={guardarMetricaMes} className="space-y-3">
            <input type="hidden" name="cliente_id" value={clienteId} />
            <div className="grid sm:grid-cols-4 gap-3">
              <div>
                <label className="etiqueta">Mes</label>
                <input type="month" name="periodo" required className="campo" />
              </div>
              <div>
                <label className="etiqueta">Llamadas</label>
                <input name="llamadas_totales" inputMode="numeric" className="campo" />
              </div>
              <div>
                <label className="etiqueta">Minutos</label>
                <input name="duracion_total_min" inputMode="decimal" className="campo" />
              </div>
              <div>
                <label className="etiqueta">Contención %</label>
                <input name="contencion_pct" inputMode="decimal" className="campo" />
              </div>
            </div>
            <button type="submit" className="boton">
              Guardar mes
            </button>
          </form>

          {meses.length > 0 && (
            <ul className="space-y-1 pt-1">
              {meses.map((m) => (
                <li
                  key={m.id}
                  className="flex items-center justify-between gap-3 text-sm"
                  style={{ color: "var(--texto-2)" }}
                >
                  <span>
                    {nombreMes(String(m.periodo))} · {num(
                      m.llamadas_totales === null ? null : String(m.llamadas_totales),
                    )}{" "}
                    llamadas
                  </span>
                  <form action={borrarMetricaMes}>
                    <input type="hidden" name="id" value={m.id} />
                    <input type="hidden" name="cliente_id" value={clienteId} />
                    <button
                      type="submit"
                      className="text-xs"
                      style={{ color: "var(--texto-3)" }}
                    >
                      Quitar
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          )}
        </div>
      </details>

      <details className="tarjeta mt-3">
        <summary
          className="px-4 py-2.5 text-sm cursor-pointer select-none"
          style={{ color: "var(--texto-2)" }}
        >
          Objetivo del mes
        </summary>
        <form action={guardarObjetivoMes} className="px-4 pb-4 pt-1 space-y-3">
          <input type="hidden" name="cliente_id" value={clienteId} />
          <input type="hidden" name="periodo" value={periodoActual} />
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="etiqueta">Llamadas comprometidas</label>
              <input
                name="llamadas_comprometidas"
                inputMode="numeric"
                className="campo"
                defaultValue={objetivoActual?.llamadas_comprometidas ?? ""}
              />
            </div>
            <div>
              <label className="etiqueta">Minutos comprometidos</label>
              <input
                name="minutos_comprometidos"
                inputMode="decimal"
                className="campo"
                defaultValue={objetivoActual?.minutos_comprometidos ?? ""}
              />
            </div>
          </div>
          <p className="text-xs" style={{ color: "var(--texto-3)" }}>
            Lo vendido para {nombreMes(periodoActual)}. Dejar ambos vacíos borra el objetivo.
          </p>
          <button type="submit" className="boton">
            Guardar objetivo
          </button>
        </form>
      </details>
    </>
  );
}
