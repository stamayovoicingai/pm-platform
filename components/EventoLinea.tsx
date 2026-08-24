import Pastilla from "./Pastilla";
import {
  actualizarEvento,
  subirAdjunto,
  borrarAdjunto,
  activarSeguimiento,
} from "@/app/acciones";
import {
  LIMITE_BYTES,
  MAX_ARCHIVOS_POR_SUBIDA,
  tamanoLegible,
} from "@/lib/adjuntos";
import {
  ETIQUETA_EVENTO,
  ETIQUETA_SEGUIMIENTO,
  ESTADOS_SEGUIMIENTO,
  colorEvento,
  colorSeguimiento,
} from "@/lib/dominio";
import { fechaCorta, textoRelativo } from "@/lib/fechas";
import type { EventoFila, Actualizacion } from "@/lib/consultas/eventos";
import type { AdjuntoFila } from "@/lib/consultas/adjuntos";

/**
 * Una entrada del timeline. Si el evento admite seguimiento, trae su estado y
 * el hilo de actualizaciones: qué se fue sabiendo y qué cambió.
 */
export default function EventoLinea({
  evento,
  actualizaciones = [],
  adjuntos = [],
  mostrarCliente = false,
}: {
  evento: EventoFila;
  actualizaciones?: Actualizacion[];
  adjuntos?: AdjuntoFila[];
  mostrarCliente?: boolean;
}) {
  const color = colorEvento(evento.tipo);
  const estado = evento.estado_seguimiento;
  const seguible = estado !== null;
  const cerrado = estado === "resuelto" || estado === "descartado";

  return (
    <div className="px-4 py-3" style={{ borderColor: "var(--borde)" }}>
      <div className="flex items-start gap-3">
        <span className="text-xs shrink-0 w-14 pt-0.5" style={{ color: "var(--texto-3)" }}>
          {fechaCorta(evento.fecha_evento)}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <Pastilla fondo={color.fondo} texto={color.texto}>
              {ETIQUETA_EVENTO[evento.tipo]}
            </Pastilla>

            {seguible && (
              <Pastilla
                fondo={colorSeguimiento(estado).fondo}
                texto={colorSeguimiento(estado).texto}
              >
                {ETIQUETA_SEGUIMIENTO[estado]}
              </Pastilla>
            )}

            {evento.severidad === "alta" && !cerrado && (
              <Pastilla fondo="var(--riesgo-suave)" texto="var(--riesgo)">
                alta
              </Pastilla>
            )}

            {evento.origen !== "app" && <Pastilla>{evento.origen}</Pastilla>}

            <span
              className="text-sm font-medium"
              style={cerrado ? { color: "var(--texto-2)" } : undefined}
            >
              {evento.titulo}
            </span>
          </div>

          {mostrarCliente && (
            <p className="text-xs mt-0.5" style={{ color: "var(--texto-3)" }}>
              {evento.cliente_nombre}
            </p>
          )}

          {evento.cuerpo && (
            <p
              className="text-sm mt-1 whitespace-pre-wrap"
              style={{ color: "var(--texto-2)" }}
            >
              {evento.cuerpo}
            </p>
          )}

          {adjuntos.length > 0 && (
            <ul className="mt-2 flex flex-wrap gap-2">
              {adjuntos.map((a) => (
                <li key={a.id} className="flex items-center gap-1">
                  <a
                    href={`/api/adjuntos/${a.id}`}
                    className="pastilla hover:underline"
                    style={{
                      background: "var(--superficie-2)",
                      color: "var(--texto-2)",
                      border: "1px solid var(--borde)",
                    }}
                    title={`Descargar · ${tamanoLegible(a.tamano_bytes)}`}
                  >
                    ↓ {a.nombre}
                    <span style={{ color: "var(--texto-3)" }}>
                      {tamanoLegible(a.tamano_bytes)}
                    </span>
                  </a>
                  <form action={borrarAdjunto}>
                    <input type="hidden" name="id" value={a.id} />
                    <input type="hidden" name="cliente_id" value={evento.cliente_id} />
                    <button
                      type="submit"
                      className="text-xs px-1"
                      style={{ color: "var(--texto-3)" }}
                      title="Quitar adjunto"
                    >
                      ×
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          )}

          {!seguible && (
            <form action={activarSeguimiento} className="mt-2">
              <input type="hidden" name="evento_id" value={evento.id} />
              <input type="hidden" name="cliente_id" value={evento.cliente_id} />
              <button
                type="submit"
                className="text-xs"
                style={{ color: "var(--texto-2)" }}
                title="Pasa a asuntos abiertos hasta que lo cierres"
              >
                Hacer seguimiento
              </button>
            </form>
          )}

          <details className="mt-2">
            <summary
              className="text-xs cursor-pointer select-none inline-block"
              style={{ color: "var(--texto-3)" }}
            >
              Adjuntar archivo
            </summary>
            <form action={subirAdjunto} className="mt-2 flex flex-wrap items-center gap-2">
              <input type="hidden" name="evento_id" value={evento.id} />
              <input type="hidden" name="cliente_id" value={evento.cliente_id} />
              <input
                type="file"
                name="archivos"
                multiple
                required
                className="text-sm"
                style={{ color: "var(--texto-2)" }}
              />
              <button type="submit" className="boton-suave text-xs">
                Subir
              </button>
              <span className="text-xs" style={{ color: "var(--texto-3)" }}>
                hasta {MAX_ARCHIVOS_POR_SUBIDA}, {tamanoLegible(LIMITE_BYTES)} cada uno
              </span>
            </form>
          </details>

          {seguible && (
            <details className="mt-2" open={actualizaciones.length > 0 && !cerrado}>
              <summary
                className="text-xs cursor-pointer select-none inline-block"
                style={{ color: "var(--texto-2)" }}
              >
                {actualizaciones.length === 0
                  ? "Actualizar"
                  : `${actualizaciones.length} actualización${
                      actualizaciones.length === 1 ? "" : "es"
                    }`}
              </summary>

              {actualizaciones.length > 0 && (
                <ol
                  className="mt-2 space-y-2 pl-3"
                  style={{ borderLeft: "2px solid var(--borde)" }}
                >
                  {actualizaciones.map((a) => (
                    <li key={a.id}>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs" style={{ color: "var(--texto-3)" }}>
                          {textoRelativo(a.creado_en)}
                        </span>
                        {a.estado_nuevo && (
                          <Pastilla
                            fondo={colorSeguimiento(a.estado_nuevo).fondo}
                            texto={colorSeguimiento(a.estado_nuevo).texto}
                          >
                            {a.estado_anterior
                              ? `${ETIQUETA_SEGUIMIENTO[a.estado_anterior]} → ${
                                  ETIQUETA_SEGUIMIENTO[a.estado_nuevo]
                                }`
                              : ETIQUETA_SEGUIMIENTO[a.estado_nuevo]}
                          </Pastilla>
                        )}
                      </div>
                      <p
                        className="text-sm whitespace-pre-wrap"
                        style={{ color: "var(--texto-2)" }}
                      >
                        {a.cuerpo}
                      </p>
                    </li>
                  ))}
                </ol>
              )}

              <form action={actualizarEvento} className="mt-2.5 space-y-2">
                <input type="hidden" name="evento_id" value={evento.id} />
                <input type="hidden" name="cliente_id" value={evento.cliente_id} />
                <textarea
                  name="cuerpo"
                  required
                  rows={2}
                  className="campo"
                  placeholder="Qué pasó con esto"
                />
                <div className="flex items-center gap-2">
                  <select
                    name="estado_nuevo"
                    className="campo"
                    style={{ width: "auto" }}
                    defaultValue=""
                  >
                    <option value="">Sin cambiar el estado</option>
                    {ESTADOS_SEGUIMIENTO.filter((e) => e !== estado).map((e) => (
                      <option key={e} value={e}>
                        Marcar como {ETIQUETA_SEGUIMIENTO[e].toLowerCase()}
                      </option>
                    ))}
                  </select>
                  <button type="submit" className="boton">
                    Añadir
                  </button>
                </div>
              </form>
            </details>
          )}
        </div>
      </div>
    </div>
  );
}
