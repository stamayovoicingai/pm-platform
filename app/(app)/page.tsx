import Link from "next/link";
import { hitosProximos } from "@/lib/consultas/hitos";
import { compromisosAbiertos } from "@/lib/consultas/compromisos";
import { clientesEnSilencio } from "@/lib/consultas/clientes";
import {
  eventosRecientes,
  eventosAbiertos,
  actualizacionesDe,
} from "@/lib/consultas/eventos";
import { adjuntosDe } from "@/lib/consultas/adjuntos";
import { Seccion, Vacio } from "@/components/Seccion";
import Pastilla from "@/components/Pastilla";
import EventoLinea from "@/components/EventoLinea";
import {
  ETIQUETA_HITO,
  ETIQUETA_EVENTO,
  ETIQUETA_LADO,
  colorEvento,
} from "@/lib/dominio";
import { fechaCorta, textoRelativo, diasHasta } from "@/lib/fechas";

import { crearTraductor } from "@/lib/i18n";
import { leerIdioma } from "@/lib/preferencias";
import { traducirFilas, traducirAgrupado } from "@/lib/traduccion";
export const dynamic = "force-dynamic";

function colorPorUrgencia(dias: number | null) {
  if (dias === null) return { fondo: "var(--superficie-2)", texto: "var(--texto-2)" };
  if (dias < 0) return { fondo: "var(--riesgo-suave)", texto: "var(--riesgo)" };
  if (dias <= 3) return { fondo: "var(--oportunidad-suave)", texto: "var(--oportunidad)" };
  return { fondo: "var(--superficie-2)", texto: "var(--texto-2)" };
}

export default async function Hoy() {
  const t = crearTraductor(await leerIdioma());
  const [hitos, compromisos, silencio, eventos, abiertos] = await Promise.all([
    hitosProximos(30),
    compromisosAbiertos(7),
    clientesEnSilencio(14),
    eventosRecientes(12),
    eventosAbiertos(),
  ]);

  const idsAbiertos = abiertos.map((e) => e.id);
  const [actualizaciones, adjuntos] = await Promise.all([
    actualizacionesDe(idsAbiertos),
    adjuntosDe(idsAbiertos),
  ]);

  const idioma = await leerIdioma();
  const [abiertosT, hitosT, compromisosT, eventosT, actualizacionesT] = await Promise.all([
    traducirFilas(idioma, abiertos, ["titulo", "cuerpo"]),
    traducirFilas(idioma, hitos, ["titulo", "notas"]),
    traducirFilas(idioma, compromisos, ["descripcion"]),
    traducirFilas(idioma, eventos, ["titulo", "cuerpo"]),
    traducirAgrupado(idioma, actualizaciones, ["cuerpo"]),
  ]);

  const vencidos = compromisos.filter(
    (c) => c.fecha_limite && (diasHasta(c.fecha_limite) ?? 0) < 0,
  );

  return (
    <>
      <div className="mb-6">
        <h1 className="text-xl font-semibold tracking-tight">{t("Hoy")}</h1>
        <p className="text-sm mt-1" style={{ color: "var(--texto-2)" }}>
          {hitos.length} hito{hitos.length === 1 ? "" : "s"} en 30 días ·{" "}
          {vencidos.length} compromiso{vencidos.length === 1 ? "" : "s"} vencido
          {vencidos.length === 1 ? "" : "s"} · {abiertos.length} asunto
          {abiertos.length === 1 ? "" : "s"} abierto{abiertos.length === 1 ? "" : "s"}
        </p>
      </div>

      <Seccion titulo="Asuntos abiertos" contador={abiertos.length}>
        {abiertos.length === 0 ? (
          <Vacio>Nada abierto. Ninguna incidencia, bloqueo ni riesgo sin cerrar.</Vacio>
        ) : (
          <div className="tarjeta divide-y" style={{ borderColor: "var(--borde)" }}>
            {abiertosT.map((e) => (
              <EventoLinea
                key={e.id}
                evento={e}
                actualizaciones={actualizacionesT[e.id] ?? []}
                adjuntos={adjuntos[e.id] ?? []}
                mostrarCliente
              />
            ))}
          </div>
        )}
      </Seccion>

      <Seccion titulo="Hitos próximos" contador={hitos.length}>
        {hitos.length === 0 ? (
          <Vacio>{t("Sin hitos en los próximos 30 días.")}</Vacio>
        ) : (
          <div className="tarjeta divide-y" style={{ borderColor: "var(--borde)" }}>
            {hitosT.map((h) => {
              const dias = diasHasta(h.fecha_objetivo);
              const color = colorPorUrgencia(dias);
              return (
                <Link
                  key={h.id}
                  href={`/clientes/${h.cliente_id}/hitos`}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-[var(--superficie-2)] transition-colors"
                  style={{ borderColor: "var(--borde)" }}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm truncate">{h.titulo}</span>
                      <Pastilla>{t(ETIQUETA_HITO[h.tipo])}</Pastilla>
                      {h.veces_movido > 0 && (
                        <Pastilla
                          fondo="var(--oportunidad-suave)"
                          texto="var(--oportunidad)"
                          titulo="Veces que se ha movido la fecha"
                        >
                          movido {h.veces_movido}×
                        </Pastilla>
                      )}
                    </div>
                    <p className="text-xs mt-0.5" style={{ color: "var(--texto-3)" }}>
                      {h.cliente_nombre}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-sm font-medium">{fechaCorta(h.fecha_objetivo)}</div>
                    <div className="text-xs" style={{ color: color.texto }}>
                      {textoRelativo(h.fecha_objetivo)}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </Seccion>

      <Seccion titulo="Compromisos abiertos" contador={compromisos.length}>
        {compromisos.length === 0 ? (
          <Vacio>{t("Nada pendiente esta semana.")}</Vacio>
        ) : (
          <div className="tarjeta divide-y" style={{ borderColor: "var(--borde)" }}>
            {compromisosT.map((c) => {
              const dias = diasHasta(c.fecha_limite);
              const color = colorPorUrgencia(dias);
              return (
                <Link
                  key={c.id}
                  href={`/clientes/${c.cliente_id}/compromisos`}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-[var(--superficie-2)] transition-colors"
                  style={{ borderColor: "var(--borde)" }}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm">{c.descripcion}</span>
                      <Pastilla>{t(ETIQUETA_LADO[c.lado])}</Pastilla>
                    </div>
                    <p className="text-xs mt-0.5" style={{ color: "var(--texto-3)" }}>
                      {c.cliente_nombre}
                      {c.responsable_nombre ? ` · ${c.responsable_nombre}` : ""}
                    </p>
                  </div>
                  <div className="text-xs shrink-0" style={{ color: color.texto }}>
                    {c.fecha_limite ? textoRelativo(c.fecha_limite) : "sin fecha"}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </Seccion>

      <Seccion titulo="Clientes sin novedad" contador={silencio.length}>
        {silencio.length === 0 ? (
          <Vacio>{t("Todos los clientes tienen registro reciente.")}</Vacio>
        ) : (
          <div className="tarjeta divide-y" style={{ borderColor: "var(--borde)" }}>
            {silencio.map((c) => (
              <Link
                key={c.id}
                href={`/clientes/${c.id}`}
                className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-[var(--superficie-2)] transition-colors"
                style={{ borderColor: "var(--borde)" }}
              >
                <span className="text-sm font-medium">{c.nombre}</span>
                <span className="text-xs" style={{ color: "var(--texto-3)" }}>
                  {c.ultimo_evento
                    ? `último registro ${textoRelativo(c.ultimo_evento)}`
                    : "sin registros"}
                </span>
              </Link>
            ))}
          </div>
        )}
      </Seccion>

      <Seccion titulo="Últimos registros">
        {eventos.length === 0 ? (
          <Vacio>{t("Todavía no has registrado nada.")}</Vacio>
        ) : (
          <div className="tarjeta divide-y" style={{ borderColor: "var(--borde)" }}>
            {eventosT.map((e) => {
              const color = colorEvento(e.tipo);
              return (
                <Link
                  key={e.id}
                  href={`/clientes/${e.cliente_id}/timeline`}
                  className="flex items-start gap-3 px-4 py-3 hover:bg-[var(--superficie-2)] transition-colors"
                  style={{ borderColor: "var(--borde)" }}
                >
                  <span
                    className="text-xs shrink-0 w-14 pt-0.5"
                    style={{ color: "var(--texto-3)" }}
                  >
                    {fechaCorta(e.fecha_evento)}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Pastilla fondo={color.fondo} texto={color.texto}>
                        {t(ETIQUETA_EVENTO[e.tipo])}
                      </Pastilla>
                      <span className="text-sm">{e.titulo}</span>
                    </div>
                    <p className="text-xs mt-0.5" style={{ color: "var(--texto-3)" }}>
                      {e.cliente_nombre}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </Seccion>
    </>
  );
}
