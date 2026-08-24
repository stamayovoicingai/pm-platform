import { notFound } from "next/navigation";
import { obtenerCliente, listarPartners } from "@/lib/consultas/clientes";
import { actualizarCliente, archivarCliente } from "@/app/acciones";
import {
  FASES,
  ESTADOS_CLIENTE,
  ETIQUETA_FASE,
  ETIQUETA_ESTADO_CLIENTE,
} from "@/lib/dominio";
import { fechaLarga } from "@/lib/fechas";

export const dynamic = "force-dynamic";

export default async function AjustesCliente({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [cliente, partners] = await Promise.all([obtenerCliente(id), listarPartners()]);
  if (!cliente) notFound();

  return (
    <div className="max-w-2xl space-y-4">
      <form action={actualizarCliente} className="tarjeta p-5 space-y-4">
        <input type="hidden" name="id" value={cliente.id} />

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="etiqueta">Nombre legal</label>
            <input name="nombre" required defaultValue={cliente.nombre} className="campo" />
          </div>
          <div>
            <label className="etiqueta">Partner</label>
            <select name="partner_id" className="campo" defaultValue={cliente.partner_id ?? ""}>
              <option value="">Sin partner</option>
              {partners.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="etiqueta">Fase</label>
            <select name="fase" className="campo" defaultValue={cliente.fase}>
              {FASES.map((f) => (
                <option key={f} value={f}>
                  {ETIQUETA_FASE[f]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="etiqueta">Estado</label>
            <select name="estado" className="campo" defaultValue={cliente.estado}>
              {ESTADOS_CLIENTE.map((e) => (
                <option key={e} value={e}>
                  {ETIQUETA_ESTADO_CLIENTE[e]}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="etiqueta">Responsable interno</label>
            <input
              name="owner_interno"
              defaultValue={cliente.owner_interno ?? ""}
              className="campo"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="etiqueta">Descripción</label>
            <textarea
              name="descripcion"
              rows={3}
              defaultValue={cliente.descripcion ?? ""}
              className="campo"
            />
          </div>
        </div>

        <p className="text-xs" style={{ color: "var(--texto-3)" }}>
          Cambiar la fase deja un evento en el timeline automáticamente. Alta:{" "}
          {fechaLarga(cliente.fecha_alta)}.
        </p>

        <button type="submit" className="boton">
          Guardar
        </button>
      </form>

      <form action={archivarCliente} className="tarjeta p-5">
        <input type="hidden" name="id" value={cliente.id} />
        <input type="hidden" name="archivar" value={cliente.archivado ? "0" : "1"} />
        <h2 className="text-sm font-semibold mb-1">
          {cliente.archivado ? "Reactivar cliente" : "Archivar cliente"}
        </h2>
        <p className="text-xs mb-3" style={{ color: "var(--texto-3)" }}>
          {cliente.archivado
            ? "Vuelve a aparecer en las listas y en el sidebar."
            : "Desaparece de las listas y del sidebar. No se borra nada y se puede reactivar."}
        </p>
        <button type="submit" className="boton-suave">
          {cliente.archivado ? "Reactivar" : "Archivar"}
        </button>
      </form>
    </div>
  );
}
