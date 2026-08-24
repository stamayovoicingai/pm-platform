import Link from "next/link";
import { notFound } from "next/navigation";
import { obtenerCliente } from "@/lib/consultas/clientes";
import { timelineCliente } from "@/lib/consultas/eventos";
import { hitosCliente } from "@/lib/consultas/hitos";
import { compromisosCliente } from "@/lib/consultas/compromisos";
import { resumenMensual } from "@/lib/consultas/metricas";
import Pastilla from "@/components/Pastilla";
import { Vacio } from "@/components/Seccion";
import {
  ETIQUETA_EVENTO,
  ETIQUETA_HITO,
  ETIQUETA_SEGUIMIENTO,
  colorEvento,
  colorSeguimiento,
} from "@/lib/dominio";
import { fechaCorta, textoRelativo, diasHasta } from "@/lib/fechas";

export const dynamic = "force-dynamic";

function Dato({
  etiqueta,
  valor,
  pie,
  color,
}: {
  etiqueta: string;
  valor: string;
  pie?: string;
  color?: string;
}) {
  return (
    <div className="tarjeta px-4 py-3">
      <p className="text-xs" style={{ color: "var(--texto-3)" }}>
        {etiqueta}
      </p>
      <p className="text-xl font-semibold mt-0.5" style={{ color }}>
        {valor}
      </p>
      {pie && (
        <p className="text-xs mt-0.5" style={{ color: "var(--texto-3)" }}>
          {pie}
        </p>
      )}
    </div>
  );
}

function miles(valor: string | null) {
  if (valor === null) return "—";
  return Number(valor).toLocaleString("es-CO", { maximumFractionDigits: 0 });
}

function variacion(actual: string | null, previo: string | null) {
  if (actual === null || previo === null) return undefined;
  const a = Number(actual);
  const p = Number(previo);
  if (!Number.isFinite(a) || !Number.isFinite(p) || p === 0) return undefined;
  const d = ((a - p) / p) * 100;
  return `${d > 0 ? "+" : ""}${d.toFixed(0)}% vs mes anterior`;
}

export default async function Resumen({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const cliente = await obtenerCliente(id);
  if (!cliente) notFound();

  const [eventos, hitos, compromisos, resumen] = await Promise.all([
    timelineCliente(id, 40),
    hitosCliente(id),
    compromisosCliente(id),
    resumenMensual(id, 2),
  ]);

  const base = `/clientes/${id}`;
  const mes = resumen[0] ?? null;
  const previo = resumen[1] ?? null;

  const abiertos = eventos.filter(
    (e) => e.estado_seguimiento === "abierto" || e.estado_seguimiento === "en_curso",
  );
  const proximoHito = hitos.find(
    (h) => h.estado === "pendiente" || h.estado === "en_curso",
  );
  const pendientes = compromisos.filter((c) => c.estado === "pendiente");
  const vencidos = pendientes.filter(
    (c) => c.fecha_limite && (diasHasta(c.fecha_limite) ?? 0) < 0,
  );

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Dato
          etiqueta="Llamadas del mes"
          valor={miles(mes?.llamadas ?? null)}
          pie={variacion(mes?.llamadas ?? null, previo?.llamadas ?? null)}
        />
        <Dato
          etiqueta="Minutos del mes"
          valor={miles(mes?.minutos ?? null)}
          pie={variacion(mes?.minutos ?? null, previo?.minutos ?? null)}
        />
        <Dato
          etiqueta="Contención"
          valor={
            mes?.contencion_promedio
              ? `${Number(mes.contencion_promedio).toFixed(0)}%`
              : "—"
          }
          pie={
            mes?.duracion_promedio
              ? `${Number(mes.duracion_promedio).toFixed(1)} min de media`
              : undefined
          }
        />
        <Dato
          etiqueta="Asuntos abiertos"
          valor={String(abiertos.length)}
          color={abiertos.length > 0 ? "var(--riesgo)" : undefined}
          pie={vencidos.length > 0 ? `${vencidos.length} compromiso vencido` : undefined}
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <section>
          <div className="flex items-baseline justify-between mb-2">
            <h2 className="text-sm font-semibold">Asuntos abiertos</h2>
            <Link href={`${base}/timeline`} className="text-xs" style={{ color: "var(--texto-3)" }}>
              Ver timeline
            </Link>
          </div>
          {abiertos.length === 0 ? (
            <Vacio>Nada sin cerrar.</Vacio>
          ) : (
            <div className="tarjeta divide-y" style={{ borderColor: "var(--borde)" }}>
              {abiertos.slice(0, 5).map((e) => {
                const c = colorEvento(e.tipo);
                const s = colorSeguimiento(e.estado_seguimiento!);
                return (
                  <div key={e.id} className="px-4 py-2.5" style={{ borderColor: "var(--borde)" }}>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Pastilla fondo={c.fondo} texto={c.texto}>
                        {ETIQUETA_EVENTO[e.tipo]}
                      </Pastilla>
                      <Pastilla fondo={s.fondo} texto={s.texto}>
                        {ETIQUETA_SEGUIMIENTO[e.estado_seguimiento!]}
                      </Pastilla>
                      <span className="text-sm">{e.titulo}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section>
          <div className="flex items-baseline justify-between mb-2">
            <h2 className="text-sm font-semibold">Compromisos</h2>
            <Link
              href={`${base}/compromisos`}
              className="text-xs"
              style={{ color: "var(--texto-3)" }}
            >
              Ver todos
            </Link>
          </div>
          {pendientes.length === 0 ? (
            <Vacio>Sin compromisos abiertos.</Vacio>
          ) : (
            <div className="tarjeta divide-y" style={{ borderColor: "var(--borde)" }}>
              {pendientes.slice(0, 5).map((c) => {
                const dias = diasHasta(c.fecha_limite);
                const vencido = dias !== null && dias < 0;
                return (
                  <div
                    key={c.id}
                    className="px-4 py-2.5 flex items-center justify-between gap-3"
                    style={{ borderColor: "var(--borde)" }}
                  >
                    <span className="text-sm min-w-0 truncate">{c.descripcion}</span>
                    <span
                      className="text-xs shrink-0"
                      style={{ color: vencido ? "var(--riesgo)" : "var(--texto-3)" }}
                    >
                      {c.fecha_limite ? textoRelativo(c.fecha_limite) : "sin fecha"}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      <section>
        <div className="flex items-baseline justify-between mb-2">
          <h2 className="text-sm font-semibold">Próximo hito</h2>
          <Link href={`${base}/hitos`} className="text-xs" style={{ color: "var(--texto-3)" }}>
            Ver hitos
          </Link>
        </div>
        {!proximoHito ? (
          <Vacio>Sin hitos pendientes.</Vacio>
        ) : (
          <div className="tarjeta px-4 py-3 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-medium">{proximoHito.titulo}</span>
                <Pastilla>{ETIQUETA_HITO[proximoHito.tipo]}</Pastilla>
                {proximoHito.veces_movido > 0 && (
                  <Pastilla fondo="var(--oportunidad-suave)" texto="var(--oportunidad)">
                    movido {proximoHito.veces_movido}×
                  </Pastilla>
                )}
              </div>
            </div>
            <div className="text-right shrink-0">
              <div className="text-sm font-medium">
                {fechaCorta(proximoHito.fecha_objetivo)}
              </div>
              <div className="text-xs" style={{ color: "var(--texto-3)" }}>
                {textoRelativo(proximoHito.fecha_objetivo)}
              </div>
            </div>
          </div>
        )}
      </section>

      {cliente.descripcion && (
        <section>
          <h2 className="text-sm font-semibold mb-2">Descripción</h2>
          <p className="text-sm" style={{ color: "var(--texto-2)" }}>
            {cliente.descripcion}
          </p>
        </section>
      )}
    </div>
  );
}
