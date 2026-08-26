import Link from "next/link";
import { metricasDelDia, diasPendientes } from "@/lib/consultas/metricas";
import CapturaMetricas from "@/components/CapturaMetricas";
import { Seccion, Vacio } from "@/components/Seccion";
import { hoy, fechaLarga, fechaCorta, textoRelativo } from "@/lib/fechas";

import { crearTraductor } from "@/lib/i18n";
import { leerIdioma } from "@/lib/preferencias";
export const dynamic = "force-dynamic";

function desplazar(fecha: string, dias: number) {
  const d = new Date(`${fecha}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

export default async function Metricas({
  searchParams,
}: {
  searchParams: Promise<{ fecha?: string }>;
}) {
  const t = crearTraductor(await leerIdioma());
  const { fecha: pedida } = await searchParams;
  const fecha = /^\d{4}-\d{2}-\d{2}$/.test(pedida ?? "") ? pedida! : hoy();

  const [clientes, pendientes] = await Promise.all([
    metricasDelDia(fecha),
    diasPendientes(14),
  ]);

  const esHoy = fecha === hoy();

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">{t("Métricas")}</h1>
        <p className="text-sm mt-1" style={{ color: "var(--texto-2)" }}>
          {fechaLarga(fecha)}
          {!esHoy && ` · ${textoRelativo(fecha)}`}
        </p>
      </div>

      <div className="flex items-center gap-2 mb-5">
        <Link href={`/metricas?fecha=${desplazar(fecha, -1)}`} className="boton-suave">
          ← Día anterior
        </Link>
        {!esHoy && (
          <>
            <Link href={`/metricas?fecha=${desplazar(fecha, 1)}`} className="boton-suave">{t("Día siguiente →")}</Link>
            <Link href="/metricas" className="text-sm" style={{ color: "var(--texto-2)" }}>{t("Ir a hoy")}</Link>
          </>
        )}
      </div>

      {clientes.length === 0 ? (
        <Vacio>
          No hay clientes en fase producción. Los números se piden solo cuando un cliente
          llega a producción.
        </Vacio>
      ) : (
        <CapturaMetricas fecha={fecha} clientes={clientes} />
      )}

      {pendientes.length > 0 && (
        <div className="mt-10">
          <Seccion titulo="Días incompletos" contador={pendientes.length}>
            <div className="tarjeta divide-y" style={{ borderColor: "var(--borde)" }}>
              {pendientes.map((d) => (
                <Link
                  key={String(d.fecha)}
                  href={`/metricas?fecha=${String(d.fecha).slice(0, 10)}`}
                  className="flex items-center justify-between gap-3 px-4 py-2.5 hover:bg-[var(--superficie-2)] transition-colors"
                  style={{ borderColor: "var(--borde)" }}
                >
                  <span className="text-sm">{fechaCorta(d.fecha)}</span>
                  <span className="text-xs" style={{ color: "var(--texto-3)" }}>
                    {d.registrados} de {d.esperados} clientes
                  </span>
                </Link>
              ))}
            </div>
          </Seccion>
        </div>
      )}
    </>
  );
}
