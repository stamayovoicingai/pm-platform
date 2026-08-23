import Link from "next/link";
import { listarPartners } from "@/lib/consultas/clientes";
import { crearCliente } from "@/app/acciones";
import { FASES, ESTADOS_CLIENTE, ETIQUETA_FASE, ETIQUETA_ESTADO_CLIENTE } from "@/lib/dominio";

export const dynamic = "force-dynamic";

export default async function NuevoCliente() {
  const partners = await listarPartners();

  return (
    <div className="max-w-xl">
      <Link href="/clientes" className="text-sm" style={{ color: "var(--texto-2)" }}>
        ← Clientes
      </Link>

      <h1 className="text-2xl font-semibold tracking-tight mt-3 mb-6">Nuevo cliente</h1>

      <form action={crearCliente} className="tarjeta p-5 space-y-4">
        <div>
          <label className="etiqueta" htmlFor="nombre">
            Nombre legal
          </label>
          <input id="nombre" name="nombre" required className="campo" autoFocus />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="etiqueta" htmlFor="partner_id">
              Partner
            </label>
            <select id="partner_id" name="partner_id" className="campo" defaultValue={partners[0]?.id ?? ""}>
              <option value="">Sin partner</option>
              {partners.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="etiqueta" htmlFor="fase">
              Fase
            </label>
            <select id="fase" name="fase" className="campo" defaultValue="descubrimiento">
              {FASES.map((f) => (
                <option key={f} value={f}>
                  {ETIQUETA_FASE[f]}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="etiqueta" htmlFor="estado">
              Estado
            </label>
            <select id="estado" name="estado" className="campo" defaultValue="activo">
              {ESTADOS_CLIENTE.map((e) => (
                <option key={e} value={e}>
                  {ETIQUETA_ESTADO_CLIENTE[e]}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="etiqueta" htmlFor="owner_interno">
              Responsable interno
            </label>
            <input id="owner_interno" name="owner_interno" className="campo" />
          </div>
        </div>

        <div>
          <label className="etiqueta" htmlFor="descripcion">
            Descripción
          </label>
          <textarea id="descripcion" name="descripcion" rows={3} className="campo" />
        </div>

        <div className="flex gap-2 pt-1">
          <button type="submit" className="boton">
            Crear
          </button>
          <Link href="/clientes" className="boton-suave">
            Cancelar
          </Link>
        </div>
      </form>
    </div>
  );
}
