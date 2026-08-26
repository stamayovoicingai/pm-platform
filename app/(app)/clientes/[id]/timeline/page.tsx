import { timelineCliente, actualizacionesDe } from "@/lib/consultas/eventos";
import { adjuntosDe } from "@/lib/consultas/adjuntos";
import EventoLinea from "@/components/EventoLinea";
import FormularioEvento from "@/components/FormularioEvento";
import { Vacio } from "@/components/Seccion";
import { hoy } from "@/lib/fechas";

import { crearTraductor } from "@/lib/i18n";
import { leerIdioma } from "@/lib/preferencias";
import { traducirFilas, traducirAgrupado } from "@/lib/traduccion";
export const dynamic = "force-dynamic";

export default async function Timeline({ params }: { params: Promise<{ id: string }> }) {
  const t = crearTraductor(await leerIdioma());
  const { id } = await params;
  const eventos = await timelineCliente(id);
  const ids = eventos.map((e) => e.id);
  const [actualizaciones, adjuntos] = await Promise.all([
    actualizacionesDe(ids),
    adjuntosDe(ids),
  ]);

  const idioma = await leerIdioma();
  const eventosTraducidos = await traducirFilas(idioma, eventos, ["titulo", "cuerpo"]);
  const actualizacionesTraducidas = await traducirAgrupado(idioma, actualizaciones, [
    "cuerpo",
  ]);

  return (
    <>
      <div className="mb-6">
        <FormularioEvento clienteId={id} hoy={hoy()} />
      </div>

      {eventosTraducidos.length === 0 ? (
        <Vacio>{t("Nada registrado todavía para este cliente.")}</Vacio>
      ) : (
        <div className="tarjeta divide-y" style={{ borderColor: "var(--borde)" }}>
          {eventosTraducidos.map((e) => (
            <EventoLinea
              key={e.id}
              evento={e}
              actualizaciones={actualizacionesTraducidas[e.id] ?? []}
              adjuntos={adjuntos[e.id] ?? []}
            />
          ))}
        </div>
      )}
    </>
  );
}
