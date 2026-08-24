import Link from "next/link";
import { listarClientes } from "@/lib/consultas/clientes";
import Pastilla from "@/components/Pastilla";
import { Vacio } from "@/components/Seccion";
import { ETIQUETA_FASE, FASES, colorFase, type Fase } from "@/lib/dominio";
import { fechaCorta, textoRelativo, diasHasta } from "@/lib/fechas";

export const dynamic = "force-dynamic";

function miles(valor: string | null) {
  if (valor === null) return "—";
  return Number(valor).toLocaleString("es-CO", { maximumFractionDigits: 0 });
}

function Delta({ actual, previo }: { actual: string | null; previo: string | null }) {
  if (actual === null || previo === null) return null;
  const a = Number(actual);
  const p = Number(previo);
  if (!Number.isFinite(a) || !Number.isFinite(p) || p === 0) return null;
  const d = ((a - p) / p) * 100;
  const color =
    Math.abs(d) < 5 ? "var(--texto-3)" : d > 0 ? "var(--acento)" : "var(--riesgo)";
  return (
    <span className="text-xs ml-1" style={{ color }}>
      {d > 0 ? "+" : ""}
      {d.toFixed(0)}%
    </span>
  );
}

export default async function Clientes({
  searchParams,
}: {
  searchParams: Promise<{ fase?: string }>;
}) {
  const { fase } = await searchParams;
  const faseFiltro = FASES.includes(fase as Fase) ? (fase as Fase) : undefined;
  const clientes = await listarClientes({ fase: faseFiltro });

  return (
    <>
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Clientes</h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--texto-2)" }}>
            {clientes.length} activo{clientes.length === 1 ? "" : "s"}
          </p>
        </div>
        <Link href="/clientes/nuevo" className="boton shrink-0">
          Nuevo cliente
        </Link>
      </div>

      <div className="flex gap-1.5 mb-4 overflow-x-auto pb-1">
        <Link
          href="/clientes"
          className="pastilla"
          style={{
            background: !faseFiltro ? "var(--acento-suave)" : "var(--superficie)",
            color: !faseFiltro ? "var(--acento)" : "var(--texto-2)",
            border: "1px solid var(--borde)",
          }}
        >
          Todas
        </Link>
        {FASES.map((f) => (
          <Link
            key={f}
            href={`/clientes?fase=${f}`}
            className="pastilla"
            style={{
              background: faseFiltro === f ? "var(--acento-suave)" : "var(--superficie)",
              color: faseFiltro === f ? "var(--acento)" : "var(--texto-2)",
              border: "1px solid var(--borde)",
            }}
          >
            {ETIQUETA_FASE[f]}
          </Link>
        ))}
      </div>

      {clientes.length === 0 ? (
        <Vacio>
          No hay clientes {faseFiltro ? `en fase ${ETIQUETA_FASE[faseFiltro]}` : "todavía"}.
        </Vacio>
      ) : (
        <div className="tarjeta overflow-x-auto">
          <table className="w-full text-sm" style={{ minWidth: "48rem" }}>
            <thead>
              <tr style={{ color: "var(--texto-3)" }}>
                <th className="text-left font-medium px-3 py-2">Cliente</th>
                <th className="text-left font-medium px-3 py-2">Fase</th>
                <th className="text-right font-medium px-3 py-2">Llamadas mes</th>
                <th className="text-left font-medium px-3 py-2">Próximo hito</th>
                <th className="text-right font-medium px-3 py-2">Abiertos</th>
                <th className="text-right font-medium px-3 py-2">Último registro</th>
              </tr>
            </thead>
            <tbody>
              {clientes.map((c) => {
                const color = colorFase(c.fase);
                const diasHito = diasHasta(c.proximo_hito_fecha);
                return (
                  <tr
                    key={c.id}
                    className="hover:bg-[var(--superficie-2)] transition-colors"
                    style={{ borderTop: "1px solid var(--borde)" }}
                  >
                    <td className="px-3 py-2">
                      <Link href={`/clientes/${c.id}`} className="flex items-center gap-2">
                        <span
                          className="w-1.5 h-1.5 rounded-full shrink-0"
                          style={{ background: color.punto }}
                        />
                        <span className="font-medium hover:underline">{c.nombre}</span>
                      </Link>
                    </td>
                    <td className="px-3 py-2">
                      <Pastilla fondo={color.fondo} texto={color.texto}>
                        {ETIQUETA_FASE[c.fase]}
                      </Pastilla>
                    </td>
                    <td className="px-3 py-2 text-right whitespace-nowrap">
                      {miles(c.llamadas_mes)}
                      <Delta actual={c.llamadas_mes} previo={c.llamadas_mes_previo} />
                    </td>
                    <td className="px-3 py-2">
                      {c.proximo_hito_fecha ? (
                        <span
                          style={{
                            color:
                              diasHito !== null && diasHito <= 3
                                ? "var(--riesgo)"
                                : "var(--texto-2)",
                          }}
                        >
                          {fechaCorta(c.proximo_hito_fecha)}
                          <span className="text-xs ml-1.5" style={{ color: "var(--texto-3)" }}>
                            {c.proximo_hito_titulo}
                          </span>
                        </span>
                      ) : (
                        <span style={{ color: "var(--texto-3)" }}>—</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {c.abiertos > 0 ? (
                        <Pastilla fondo="var(--riesgo-suave)" texto="var(--riesgo)">
                          {c.abiertos}
                        </Pastilla>
                      ) : (
                        <span style={{ color: "var(--texto-3)" }}>—</span>
                      )}
                    </td>
                    <td
                      className="px-3 py-2 text-right text-xs whitespace-nowrap"
                      style={{ color: "var(--texto-3)" }}
                    >
                      {c.ultimo_evento ? textoRelativo(c.ultimo_evento) : "sin registros"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
