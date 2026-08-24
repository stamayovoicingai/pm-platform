import { contactosCliente } from "@/lib/consultas/contactos";
import { crearContacto, borrarContacto } from "@/app/acciones";
import Pastilla from "@/components/Pastilla";
import { Vacio } from "@/components/Seccion";
import { LADOS, ETIQUETA_LADO } from "@/lib/dominio";

export const dynamic = "force-dynamic";

export default async function ContactosCliente({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const contactos = await contactosCliente(id);

  return (
    <>
      <details className="tarjeta mb-4">
        <summary
          className="px-4 py-2.5 text-sm cursor-pointer select-none"
          style={{ color: "var(--texto-2)" }}
        >
          Añadir contacto
        </summary>
        <form action={crearContacto} className="px-4 pb-4 pt-1 space-y-3">
          <input type="hidden" name="cliente_id" value={id} />
          <div className="grid sm:grid-cols-4 gap-3">
            <div>
              <label className="etiqueta">Nombre</label>
              <input name="nombre" required className="campo" />
            </div>
            <div>
              <label className="etiqueta">Rol</label>
              <input name="rol" className="campo" placeholder="Aprueba el guion" />
            </div>
            <div>
              <label className="etiqueta">Lado</label>
              <select name="lado" className="campo" defaultValue="cliente">
                {LADOS.map((l) => (
                  <option key={l} value={l}>
                    {ETIQUETA_LADO[l]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="etiqueta">Email</label>
              <input name="email" type="email" className="campo" />
            </div>
          </div>
          <button type="submit" className="boton">
            Añadir contacto
          </button>
        </form>
      </details>

      {contactos.length === 0 ? (
        <Vacio>Sin contactos registrados.</Vacio>
      ) : (
        <div className="tarjeta divide-y" style={{ borderColor: "var(--borde)" }}>
          {contactos.map((c) => (
            <div
              key={c.id}
              className="flex items-center gap-3 px-4 py-3"
              style={{ borderColor: "var(--borde)" }}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium">{c.nombre}</span>
                  <Pastilla>{ETIQUETA_LADO[c.lado]}</Pastilla>
                </div>
                <p className="text-xs mt-0.5" style={{ color: "var(--texto-3)" }}>
                  {[c.rol, c.email].filter(Boolean).join(" · ") || "—"}
                </p>
              </div>
              <form action={borrarContacto} className="shrink-0">
                <input type="hidden" name="id" value={c.id} />
                <input type="hidden" name="cliente_id" value={id} />
                <button type="submit" className="text-xs" style={{ color: "var(--texto-3)" }}>
                  Quitar
                </button>
              </form>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
