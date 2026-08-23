import Link from "next/link";
import { listarClientes } from "@/lib/consultas/clientes";
import Pastilla from "@/components/Pastilla";
import { Vacio } from "@/components/Seccion";
import { ETIQUETA_FASE, FASES, type Fase } from "@/lib/dominio";
import { fechaCorta, textoRelativo, diasHasta } from "@/lib/fechas";

export const dynamic = "force-dynamic";

const COLOR_FASE: Record<Fase, { fondo: string; texto: string }> = {
  descubrimiento: { fondo: "var(--superficie-2)", texto: "var(--texto-2)" },
  desarrollo: { fondo: "var(--superficie-2)", texto: "var(--texto-2)" },
  qa: { fondo: "var(--oportunidad-suave)", texto: "var(--oportunidad)" },
  uat: { fondo: "var(--oportunidad-suave)", texto: "var(--oportunidad)" },
  produccion: { fondo: "var(--acento-suave)", texto: "var(--acento)" },
};

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
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Clientes</h1>
          <p className="text-sm mt-1" style={{ color: "var(--texto-2)" }}>
            {clientes.length} activo{clientes.length === 1 ? "" : "s"}
          </p>
        </div>
        <Link href="/clientes/nuevo" className="boton shrink-0">
          Nuevo cliente
        </Link>
      </div>

      <div className="flex gap-1.5 mb-5 overflow-x-auto pb-1">
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
        <div className="tarjeta divide-y" style={{ borderColor: "var(--borde)" }}>
          {clientes.map((c) => {
            const color = COLOR_FASE[c.fase];
            const diasHito = diasHasta(c.proximo_hito_fecha);
            return (
              <Link
                key={c.id}
                href={`/clientes/${c.id}`}
                className="block px-4 py-3.5 hover:bg-[var(--superficie-2)] transition-colors"
                style={{ borderColor: "var(--borde)" }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium">{c.nombre}</span>
                      <Pastilla fondo={color.fondo} texto={color.texto}>
                        {ETIQUETA_FASE[c.fase]}
                      </Pastilla>
                      {c.estado !== "activo" && <Pastilla>{c.estado}</Pastilla>}
                      {c.compromisos_vencidos > 0 && (
                        <Pastilla fondo="var(--riesgo-suave)" texto="var(--riesgo)">
                          {c.compromisos_vencidos} vencido
                          {c.compromisos_vencidos === 1 ? "" : "s"}
                        </Pastilla>
                      )}
                    </div>
                    <p className="text-xs mt-1" style={{ color: "var(--texto-3)" }}>
                      {c.partner_nombre ?? "Sin partner"}
                      {c.owner_interno ? ` · ${c.owner_interno}` : ""}
                      {c.ultimo_evento
                        ? ` · registro ${textoRelativo(c.ultimo_evento)}`
                        : " · sin registros"}
                    </p>
                  </div>

                  {c.proximo_hito_fecha && (
                    <div className="text-right shrink-0">
                      <div className="text-xs" style={{ color: "var(--texto-3)" }}>
                        {c.proximo_hito_titulo}
                      </div>
                      <div
                        className="text-sm font-medium"
                        style={{
                          color:
                            diasHito !== null && diasHito <= 3
                              ? "var(--riesgo)"
                              : "var(--texto)",
                        }}
                      >
                        {fechaCorta(c.proximo_hito_fecha)}
                      </div>
                    </div>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}
