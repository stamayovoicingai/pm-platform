import Pastilla from "./Pastilla";
import { moverFechaHito, cambiarEstadoHito } from "@/app/acciones";
import { ETIQUETA_HITO, ETIQUETA_ESTADO_HITO, ESTADOS_HITO } from "@/lib/dominio";
import { fechaCorta, textoRelativo, diasHasta, aISO } from "@/lib/fechas";
import type { HitoFila, CambioFecha } from "@/lib/consultas/hitos";

export default function BloqueHito({
  hito,
  historial,
}: {
  hito: HitoFila;
  historial: CambioFecha[];
}) {
  const abierto = hito.estado === "pendiente" || hito.estado === "en_curso";
  const dias = diasHasta(hito.fecha_objetivo);
  const urgente = abierto && dias !== null && dias <= 3;

  return (
    <div className="tarjeta">
      <div className="flex items-start gap-3 px-4 py-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-sm font-medium ${abierto ? "" : "line-through"}`}>
              {hito.titulo}
            </span>
            <Pastilla>{ETIQUETA_HITO[hito.tipo]}</Pastilla>
            {!abierto && <Pastilla>{ETIQUETA_ESTADO_HITO[hito.estado]}</Pastilla>}
            {hito.veces_movido > 0 && (
              <Pastilla fondo="var(--oportunidad-suave)" texto="var(--oportunidad)">
                movido {hito.veces_movido}×
              </Pastilla>
            )}
          </div>
          {hito.notas && (
            <p className="text-xs mt-1" style={{ color: "var(--texto-3)" }}>
              {hito.notas}
            </p>
          )}
        </div>

        <div className="text-right shrink-0">
          <div className="text-sm font-medium">{fechaCorta(hito.fecha_objetivo)}</div>
          {abierto && (
            <div
              className="text-xs"
              style={{ color: urgente ? "var(--riesgo)" : "var(--texto-3)" }}
            >
              {textoRelativo(hito.fecha_objetivo)}
            </div>
          )}
        </div>
      </div>

      <div
        className="px-4 py-2 flex flex-wrap items-center gap-2"
        style={{ borderTop: "1px solid var(--borde)" }}
      >
        <details className="grow">
          <summary
            className="text-xs cursor-pointer select-none"
            style={{ color: "var(--texto-2)" }}
          >
            Mover fecha
            {historial.length > 0 && ` · ${historial.length} cambio${historial.length === 1 ? "" : "s"}`}
          </summary>

          <form action={moverFechaHito} className="mt-3 space-y-2">
            <input type="hidden" name="id" value={hito.id} />
            <input type="hidden" name="cliente_id" value={hito.cliente_id} />
            <div className="grid sm:grid-cols-[10rem_1fr_auto] gap-2 items-end">
              <div>
                <label className="etiqueta">Nueva fecha</label>
                <input
                  type="date"
                  name="fecha_nueva"
                  required
                  defaultValue={aISO(hito.fecha_objetivo)}
                  className="campo"
                />
              </div>
              <div>
                <label className="etiqueta">Motivo</label>
                <input
                  name="motivo"
                  required
                  className="campo"
                  placeholder="Falta aprobación del cliente"
                />
              </div>
              <button type="submit" className="boton">
                Mover
              </button>
            </div>
          </form>

          {historial.length > 0 && (
            <ul className="mt-3 space-y-1.5">
              {historial.map((c) => (
                <li key={c.id} className="text-xs" style={{ color: "var(--texto-3)" }}>
                  {fechaCorta(c.fecha_anterior)} → {fechaCorta(c.fecha_nueva)} ·{" "}
                  <span style={{ color: "var(--texto-2)" }}>{c.motivo}</span>
                </li>
              ))}
            </ul>
          )}
        </details>

        <form action={cambiarEstadoHito} className="flex items-center gap-1.5 shrink-0">
          <input type="hidden" name="id" value={hito.id} />
          <input type="hidden" name="cliente_id" value={hito.cliente_id} />
          <select
            name="estado"
            defaultValue={hito.estado}
            className="text-xs rounded-md px-2 py-1"
            style={{
              background: "var(--superficie)",
              border: "1px solid var(--borde-fuerte)",
              color: "var(--texto)",
            }}
          >
            {ESTADOS_HITO.map((e) => (
              <option key={e} value={e}>
                {ETIQUETA_ESTADO_HITO[e]}
              </option>
            ))}
          </select>
          <button type="submit" className="text-xs" style={{ color: "var(--texto-2)" }}>
            Aplicar
          </button>
        </form>
      </div>
    </div>
  );
}
