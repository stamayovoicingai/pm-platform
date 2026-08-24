import { timelineCliente, actualizacionesDe } from "@/lib/consultas/eventos";
import { adjuntosDe } from "@/lib/consultas/adjuntos";
import EventoLinea from "@/components/EventoLinea";
import FormularioEvento from "@/components/FormularioEvento";
import { Vacio } from "@/components/Seccion";
import { hoy } from "@/lib/fechas";

export const dynamic = "force-dynamic";

export default async function Timeline({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const eventos = await timelineCliente(id);
  const ids = eventos.map((e) => e.id);
  const [actualizaciones, adjuntos] = await Promise.all([
    actualizacionesDe(ids),
    adjuntosDe(ids),
  ]);

  return (
    <>
      <div className="mb-6">
        <FormularioEvento clienteId={id} hoy={hoy()} />
      </div>

      {eventos.length === 0 ? (
        <Vacio>Nada registrado todavía para este cliente.</Vacio>
      ) : (
        <div className="tarjeta divide-y" style={{ borderColor: "var(--borde)" }}>
          {eventos.map((e) => (
            <EventoLinea
              key={e.id}
              evento={e}
              actualizaciones={actualizaciones[e.id] ?? []}
              adjuntos={adjuntos[e.id] ?? []}
            />
          ))}
        </div>
      )}
    </>
  );
}
