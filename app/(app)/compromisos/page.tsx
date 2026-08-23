import Link from "next/link";
import { todosLosCompromisos } from "@/lib/consultas/compromisos";
import { cambiarEstadoCompromiso } from "@/app/acciones";
import Pastilla from "@/components/Pastilla";
import { Vacio } from "@/components/Seccion";
import { ETIQUETA_LADO } from "@/lib/dominio";
import { textoRelativo, diasHasta } from "@/lib/fechas";

export const dynamic = "force-dynamic";

export default async function Compromisos() {
  const todos = await todosLosCompromisos();
  const abiertos = todos.filter((c) => c.estado === "pendiente");
  const cerrados = todos.filter((c) => c.estado !== "pendiente");
  const vencidos = abiertos.filter(
    (c) => c.fecha_limite && (diasHasta(c.fecha_limite) ?? 0) < 0,
  );

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Compromisos</h1>
        <p className="text-sm mt-1" style={{ color: "var(--texto-2)" }}>
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
                className="flex items-center gap-3 px-4 py-3"
                style={{ borderColor: "var(--borde)" }}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm">{c.descripcion}</span>
                    <Pastilla>{ETIQUETA_LADO[c.lado]}</Pastilla>
                    {vencido && (
                      <Pastilla fondo="var(--riesgo-suave)" texto="var(--riesgo)">
                        vencido
                      </Pastilla>
                    )}
                  </div>
                  <p className="text-xs mt-0.5" style={{ color: "var(--texto-3)" }}>
                    <Link href={`/clientes/${c.cliente_id}`} className="hover:underline">
                      {c.cliente_nombre}
                    </Link>
                    {c.responsable_nombre ? ` · ${c.responsable_nombre}` : ""}
                    {c.fecha_limite ? ` · ${textoRelativo(c.fecha_limite)}` : " · sin fecha"}
                  </p>
                </div>
                <form action={cambiarEstadoCompromiso} className="shrink-0">
                  <input type="hidden" name="id" value={c.id} />
                  <input type="hidden" name="cliente_id" value={c.cliente_id} />
                  <input type="hidden" name="estado" value="cumplido" />
                  <button type="submit" className="boton-suave text-xs">
                    Cumplido
                  </button>
                </form>
              </div>
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
            {cerrados.map((c) => (
              <div
                key={c.id}
                className="px-4 py-2.5 text-sm flex items-center justify-between gap-3"
                style={{ borderColor: "var(--borde)", color: "var(--texto-2)" }}
              >
                <span className="line-through">{c.descripcion}</span>
                <span className="text-xs shrink-0" style={{ color: "var(--texto-3)" }}>
                  {c.cliente_nombre}
                </span>
              </div>
            ))}
          </div>
        </details>
      )}
    </>
  );
}
