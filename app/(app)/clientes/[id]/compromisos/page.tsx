import { compromisosCliente } from "@/lib/consultas/compromisos";
import { contactosCliente } from "@/lib/consultas/contactos";
import { crearCompromiso, cambiarEstadoCompromiso } from "@/app/acciones";
import Pastilla from "@/components/Pastilla";
import { Vacio } from "@/components/Seccion";
import { LADOS, ETIQUETA_LADO } from "@/lib/dominio";
import { textoRelativo, diasHasta } from "@/lib/fechas";

export const dynamic = "force-dynamic";

export default async function CompromisosCliente({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [compromisos, contactos] = await Promise.all([
    compromisosCliente(id),
    contactosCliente(id),
  ]);

  const abiertos = compromisos.filter((c) => c.estado === "pendiente");
  const cerrados = compromisos.filter((c) => c.estado !== "pendiente");

  return (
    <>
      <details className="tarjeta mb-4">
        <summary
          className="px-4 py-2.5 text-sm cursor-pointer select-none"
          style={{ color: "var(--texto-2)" }}
        >
          Añadir compromiso
        </summary>
        <form action={crearCompromiso} className="px-4 pb-4 pt-1 space-y-3">
          <input type="hidden" name="cliente_id" value={id} />
          <div>
            <label className="etiqueta">Qué se comprometió</label>
            <input
              name="descripcion"
              required
              className="campo"
              placeholder="Enviar el postmortem del incidente"
            />
          </div>
          <div className="grid sm:grid-cols-3 gap-3">
            <div>
              <label className="etiqueta">Lado</label>
              <select name="lado" className="campo" defaultValue="interno">
                {LADOS.map((l) => (
                  <option key={l} value={l}>
                    {ETIQUETA_LADO[l]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="etiqueta">Responsable</label>
              <select name="responsable_id" className="campo" defaultValue="">
                <option value="">Sin asignar</option>
                {contactos.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="etiqueta">Fecha límite</label>
              <input type="date" name="fecha_limite" className="campo" />
            </div>
          </div>
          <button type="submit" className="boton">
            Añadir compromiso
          </button>
        </form>
      </details>

      {abiertos.length === 0 ? (
        <Vacio>Sin compromisos abiertos.</Vacio>
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
                    {c.responsable_nombre ?? "sin responsable"}
                    {c.fecha_limite ? ` · ${textoRelativo(c.fecha_limite)}` : ""}
                  </p>
                </div>
                <form action={cambiarEstadoCompromiso} className="shrink-0">
                  <input type="hidden" name="id" value={c.id} />
                  <input type="hidden" name="cliente_id" value={id} />
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
        <details className="mt-3">
          <summary className="text-xs cursor-pointer select-none" style={{ color: "var(--texto-3)" }}>
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
                  {c.estado}
                </span>
              </div>
            ))}
          </div>
        </details>
      )}
    </>
  );
}
