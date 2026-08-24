import { hitosCliente, historialFechas } from "@/lib/consultas/hitos";
import BloqueHito from "@/components/BloqueHito";
import { Vacio } from "@/components/Seccion";
import { crearHito } from "@/app/acciones";
import { TIPOS_HITO, ETIQUETA_HITO } from "@/lib/dominio";

export const dynamic = "force-dynamic";

export default async function HitosCliente({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const hitos = await hitosCliente(id);

  const historiales = Object.fromEntries(
    await Promise.all(
      hitos
        .filter((h) => h.veces_movido > 0)
        .map(async (h) => [h.id, await historialFechas(h.id)] as const),
    ),
  );

  return (
    <>
      <details className="tarjeta mb-4">
        <summary
          className="px-4 py-2.5 text-sm cursor-pointer select-none"
          style={{ color: "var(--texto-2)" }}
        >
          Añadir hito
        </summary>
        <form action={crearHito} className="px-4 pb-4 pt-1 space-y-3">
          <input type="hidden" name="cliente_id" value={id} />
          <div className="grid sm:grid-cols-[1fr_11rem_9rem] gap-3">
            <div>
              <label className="etiqueta">Título</label>
              <input name="titulo" required className="campo" placeholder="Salida a producción" />
            </div>
            <div>
              <label className="etiqueta">Tipo</label>
              <select name="tipo" className="campo" defaultValue="go_live">
                {TIPOS_HITO.map((t) => (
                  <option key={t} value={t}>
                    {ETIQUETA_HITO[t]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="etiqueta">Fecha</label>
              <input type="date" name="fecha_objetivo" required className="campo" />
            </div>
          </div>
          <div>
            <label className="etiqueta">Notas</label>
            <input name="notas" className="campo" />
          </div>
          <button type="submit" className="boton">
            Añadir hito
          </button>
        </form>
      </details>

      {hitos.length === 0 ? (
        <Vacio>Sin hitos definidos.</Vacio>
      ) : (
        <div className="space-y-2">
          {hitos.map((h) => (
            <BloqueHito key={h.id} hito={h} historial={historiales[h.id] ?? []} />
          ))}
        </div>
      )}
    </>
  );
}
