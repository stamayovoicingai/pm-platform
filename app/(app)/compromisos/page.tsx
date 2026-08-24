import Link from "next/link";
import { todosLosCompromisos } from "@/lib/consultas/compromisos";
import { cambiarEstadoCompromiso } from "@/app/acciones";
import Pastilla from "@/components/Pastilla";
import SelectEnvia from "@/components/SelectEnvia";
import { Vacio } from "@/components/Seccion";
import { ETIQUETA_LADO, ESTADOS_COMPROMISO, ETIQUETA_ESTADO_COMPROMISO } from "@/lib/dominio";
import { textoRelativo, diasHasta, fechaCorta } from "@/lib/fechas";

export const dynamic = "force-dynamic";

const OPCIONES = ESTADOS_COMPROMISO.map((e) => ({
  valor: e,
  etiqueta: ETIQUETA_ESTADO_COMPROMISO[e],
}));

export default async function Compromisos() {
  const todos = await todosLosCompromisos();
  const abiertos = todos.filter((c) => c.estado === "pendiente");
  const cerrados = todos.filter((c) => c.estado !== "pendiente");
  const vencidos = abiertos.filter(
    (c) => c.fecha_limite && (diasHasta(c.fecha_limite) ?? 0) < 0,
  );

  return (
    <>
      <div className="mb-5">
        <h1 className="text-xl font-semibold tracking-tight">Compromisos</h1>
        <p className="text-sm mt-0.5" style={{ color: "var(--texto-2)" }}>
          {abiertos.length} abiertos · {vencidos.length} vencidos
        </p>
      </div>

      {abiertos.length === 0 ? (
        <Vacio>Nada pendiente.</Vacio>
      ) : (
        <div className="tarjeta divide-y" style={{ borderColor: "var(--borde)" }}>
          {abiertos.map((c) => {
            const dias = diasHasta(c.fecha_limite);
            const vencido = dias !== null && dias < 0;
            return (
              <div
                key={c.id}
                className="flex items-center gap-3 px-3 py-2 hover:bg-[var(--superficie-2)] transition-colors"
                style={{ borderColor: "var(--borde)" }}
              >
                <Link
                  href={`/clientes/${c.cliente_id}/compromisos`}
                  className="text-xs shrink-0 w-32 truncate"
                  style={{ color: "var(--texto-3)" }}
                >
                  {c.cliente_nombre}
                </Link>

                <span className="text-sm flex-1 min-w-0 truncate">{c.descripcion}</span>

                <Pastilla>{ETIQUETA_LADO[c.lado]}</Pastilla>

                <span
                  className="text-xs shrink-0 w-24 text-right"
                  style={{ color: vencido ? "var(--riesgo)" : "var(--texto-3)" }}
                  title={c.fecha_limite ? fechaCorta(c.fecha_limite) : undefined}
                >
                  {c.fecha_limite ? textoRelativo(c.fecha_limite) : "sin fecha"}
                </span>

                <form action={cambiarEstadoCompromiso} className="shrink-0">
                  <input type="hidden" name="id" value={c.id} />
                  <input type="hidden" name="cliente_id" value={c.cliente_id} />
                  <SelectEnvia name="estado" defaultValue={c.estado} opciones={OPCIONES} />
                </form>
              </div>
            );
          })}
        </div>
      )}

      {cerrados.length > 0 && (
        <details className="mt-4">
          <summary className="text-xs cursor-pointer select-none" style={{ color: "var(--texto-3)" }}>
            {cerrados.length} cerrado{cerrados.length === 1 ? "" : "s"}
          </summary>
          <div className="tarjeta divide-y mt-2" style={{ borderColor: "var(--borde)" }}>
            {cerrados.map((c) => (
              <div
                key={c.id}
                className="px-3 py-2 text-sm flex items-center gap-3"
                style={{ borderColor: "var(--borde)", color: "var(--texto-2)" }}
              >
                <span className="text-xs shrink-0 w-32 truncate" style={{ color: "var(--texto-3)" }}>
                  {c.cliente_nombre}
                </span>
                <span className="line-through flex-1 min-w-0 truncate">{c.descripcion}</span>
                <form action={cambiarEstadoCompromiso} className="shrink-0">
                  <input type="hidden" name="id" value={c.id} />
                  <input type="hidden" name="cliente_id" value={c.cliente_id} />
                  <SelectEnvia name="estado" defaultValue={c.estado} opciones={OPCIONES} />
                </form>
              </div>
            ))}
          </div>
        </details>
      )}
    </>
  );
}
