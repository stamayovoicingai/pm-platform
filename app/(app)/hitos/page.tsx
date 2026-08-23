import Link from "next/link";
import { todosLosHitos } from "@/lib/consultas/hitos";
import Pastilla from "@/components/Pastilla";
import { Vacio } from "@/components/Seccion";
import { ETIQUETA_HITO, ETIQUETA_ESTADO_HITO } from "@/lib/dominio";
import { fechaCorta, textoRelativo, diasHasta } from "@/lib/fechas";

export const dynamic = "force-dynamic";

export default async function Hitos() {
  const hitos = await todosLosHitos();
  const abiertos = hitos.filter((h) => h.estado === "pendiente" || h.estado === "en_curso");
  const cerrados = hitos.filter((h) => h.estado !== "pendiente" && h.estado !== "en_curso");
  const movidos = hitos.filter((h) => h.veces_movido > 0);

  const promedioMovimientos =
    movidos.length > 0
      ? movidos.reduce((suma, h) => suma + h.veces_movido, 0) / movidos.length
      : 0;

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Hitos</h1>
        <p className="text-sm mt-1" style={{ color: "var(--texto-2)" }}>
          {abiertos.length} abiertos
          {movidos.length > 0 &&
            ` · ${movidos.length} con fecha movida (${promedioMovimientos.toFixed(1)} veces de media)`}
        </p>
      </div>

      {abiertos.length === 0 ? (
        <Vacio>No hay hitos abiertos.</Vacio>
      ) : (
        <div className="tarjeta divide-y" style={{ borderColor: "var(--borde)" }}>
          {abiertos.map((h) => {
            const dias = diasHasta(h.fecha_objetivo);
            const urgente = dias !== null && dias <= 3;
            return (
              <Link
                key={h.id}
                href={`/clientes/${h.cliente_id}`}
                className="flex items-center gap-3 px-4 py-3 hover:bg-[var(--superficie-2)] transition-colors"
                style={{ borderColor: "var(--borde)" }}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium">{h.titulo}</span>
                    <Pastilla>{ETIQUETA_HITO[h.tipo]}</Pastilla>
                    {h.veces_movido > 0 && (
                      <Pastilla fondo="var(--oportunidad-suave)" texto="var(--oportunidad)">
                        movido {h.veces_movido}×
                      </Pastilla>
                    )}
                  </div>
                  <p className="text-xs mt-0.5" style={{ color: "var(--texto-3)" }}>
                    {h.cliente_nombre}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-sm font-medium">{fechaCorta(h.fecha_objetivo)}</div>
                  <div
                    className="text-xs"
                    style={{ color: urgente ? "var(--riesgo)" : "var(--texto-3)" }}
                  >
                    {textoRelativo(h.fecha_objetivo)}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {cerrados.length > 0 && (
        <details className="mt-5">
          <summary
            className="text-xs cursor-pointer select-none"
            style={{ color: "var(--texto-3)" }}
          >
            {cerrados.length} cerrado{cerrados.length === 1 ? "" : "s"}
          </summary>
          <div className="tarjeta divide-y mt-2" style={{ borderColor: "var(--borde)" }}>
            {cerrados.map((h) => (
              <Link
                key={h.id}
                href={`/clientes/${h.cliente_id}`}
                className="flex items-center justify-between gap-3 px-4 py-2.5"
                style={{ borderColor: "var(--borde)", color: "var(--texto-2)" }}
              >
                <span className="text-sm line-through">{h.titulo}</span>
                <span className="text-xs shrink-0" style={{ color: "var(--texto-3)" }}>
                  {h.cliente_nombre} · {ETIQUETA_ESTADO_HITO[h.estado]}
                </span>
              </Link>
            ))}
          </div>
        </details>
      )}
    </>
  );
}
