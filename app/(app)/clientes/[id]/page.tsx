import Link from "next/link";
import { notFound } from "next/navigation";
import { obtenerCliente, listarPartners } from "@/lib/consultas/clientes";
import { timelineCliente, actualizacionesDe } from "@/lib/consultas/eventos";
import { adjuntosDe } from "@/lib/consultas/adjuntos";
import {
  resumenMensual,
  objetivosCliente,
  mesesCargados,
} from "@/lib/consultas/metricas";
import { hitosCliente, historialFechas } from "@/lib/consultas/hitos";
import { compromisosCliente } from "@/lib/consultas/compromisos";
import { contactosCliente } from "@/lib/consultas/contactos";
import { Seccion, Vacio } from "@/components/Seccion";
import Pastilla from "@/components/Pastilla";
import FormularioEvento from "@/components/FormularioEvento";
import BloqueHito from "@/components/BloqueHito";
import EventoLinea from "@/components/EventoLinea";
import ResumenMetricas from "@/components/ResumenMetricas";
import {
  crearCompromiso,
  cambiarEstadoCompromiso,
  crearHito,
  crearContacto,
  borrarContacto,
  actualizarCliente,
} from "@/app/acciones";
import {
  ETIQUETA_FASE,
  ETIQUETA_LADO,
  ETIQUETA_HITO,
  ETIQUETA_ESTADO_CLIENTE,
  FASES,
  ESTADOS_CLIENTE,
  TIPOS_HITO,
  LADOS,
} from "@/lib/dominio";
import { fechaCorta, fechaLarga, textoRelativo, diasHasta, hoy } from "@/lib/fechas";

export const dynamic = "force-dynamic";

export default async function FichaCliente({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const cliente = await obtenerCliente(id);
  if (!cliente) notFound();

  const [eventos, hitos, compromisos, contactos, partners, resumen, objetivos, meses] =
    await Promise.all([
      timelineCliente(id),
      hitosCliente(id),
      compromisosCliente(id),
      contactosCliente(id),
      listarPartners(),
      resumenMensual(id),
      objetivosCliente(id),
      mesesCargados(id),
    ]);

  const ids = eventos.map((e) => e.id);
  const [actualizaciones, adjuntos] = await Promise.all([
    actualizacionesDe(ids),
    adjuntosDe(ids),
  ]);

  const historiales = Object.fromEntries(
    await Promise.all(
      hitos
        .filter((h) => h.veces_movido > 0)
        .map(async (h) => [h.id, await historialFechas(h.id)] as const),
    ),
  );

  const abiertos = compromisos.filter((c) => c.estado === "pendiente");
  const cerrados = compromisos.filter((c) => c.estado !== "pendiente");

  return (
    <>
      <Link href="/clientes" className="text-sm" style={{ color: "var(--texto-2)" }}>
        ← Clientes
      </Link>

      <div className="mt-3 mb-7">
        <div className="flex items-center gap-2 flex-wrap">
          <h1 className="text-2xl font-semibold tracking-tight">{cliente.nombre}</h1>
          <Pastilla fondo="var(--acento-suave)" texto="var(--acento)">
            {ETIQUETA_FASE[cliente.fase]}
          </Pastilla>
          {cliente.estado !== "activo" && (
            <Pastilla>{ETIQUETA_ESTADO_CLIENTE[cliente.estado]}</Pastilla>
          )}
        </div>
        <p className="text-sm mt-1.5" style={{ color: "var(--texto-2)" }}>
          {cliente.partner_nombre ?? "Sin partner"}
          {cliente.owner_interno ? ` · ${cliente.owner_interno}` : ""}
          {" · alta "}
          {fechaLarga(cliente.fecha_alta)}
        </p>
        {cliente.descripcion && (
          <p className="text-sm mt-3 max-w-2xl" style={{ color: "var(--texto-2)" }}>
            {cliente.descripcion}
          </p>
        )}
      </div>

      {/* ------------------------------------------------------------ registro */}

      <Seccion titulo="Registrar">
        <FormularioEvento clienteId={cliente.id} hoy={hoy()} />
      </Seccion>

      {/* ------------------------------------------------------------ timeline */}

      <Seccion titulo="Timeline" contador={eventos.length}>
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
      </Seccion>

      {/* ------------------------------------------------------------ métricas */}

      <Seccion titulo="Métricas mensuales">
        <ResumenMetricas
          clienteId={cliente.id}
          resumen={resumen}
          objetivos={objetivos}
          meses={meses}
        />
      </Seccion>

      {/* ------------------------------------------------------------ hitos */}

      <Seccion titulo="Hitos" contador={hitos.length}>
        <details className="tarjeta mb-3">
          <summary className="px-4 py-2.5 text-sm cursor-pointer select-none" style={{ color: "var(--texto-2)" }}>
            Añadir hito
          </summary>
          <form action={crearHito} className="px-4 pb-4 pt-1 space-y-3">
            <input type="hidden" name="cliente_id" value={cliente.id} />
            <div className="grid sm:grid-cols-[1fr_10rem_9rem] gap-3">
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
      </Seccion>

      {/* ------------------------------------------------------------ compromisos */}

      <Seccion titulo="Compromisos" contador={abiertos.length}>
        <details className="tarjeta mb-3">
          <summary className="px-4 py-2.5 text-sm cursor-pointer select-none" style={{ color: "var(--texto-2)" }}>
            Añadir compromiso
          </summary>
          <form action={crearCompromiso} className="px-4 pb-4 pt-1 space-y-3">
            <input type="hidden" name="cliente_id" value={cliente.id} />
            <div>
              <label className="etiqueta">Qué se comprometió</label>
              <input
                name="descripcion"
                required
                className="campo"
                placeholder="Enviar el postmortem del incidente"
              />
            </div>
            <div className="grid sm:grid-cols-3 gap-3">
              <div>
                <label className="etiqueta">Lado</label>
                <select name="lado" className="campo" defaultValue="interno">
                  {LADOS.map((l) => (
                    <option key={l} value={l}>
                      {ETIQUETA_LADO[l]}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="etiqueta">Responsable</label>
                <select name="responsable_id" className="campo" defaultValue="">
                  <option value="">Sin asignar</option>
                  {contactos.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nombre}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="etiqueta">Fecha límite</label>
                <input type="date" name="fecha_limite" className="campo" />
              </div>
            </div>
            <button type="submit" className="boton">
              Añadir compromiso
            </button>
          </form>
        </details>

        {abiertos.length === 0 ? (
          <Vacio>Sin compromisos abiertos.</Vacio>
        ) : (
          <div className="tarjeta divide-y" style={{ borderColor: "var(--borde)" }}>
            {abiertos.map((c) => {
              const dias = diasHasta(c.fecha_limite);
              const vencido = dias !== null && dias < 0;
              return (
                <div
                  key={c.id}
                  className="flex items-center gap-3 px-4 py-3"
                  style={{ borderColor: "var(--borde)" }}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm">{c.descripcion}</span>
                      <Pastilla>{ETIQUETA_LADO[c.lado]}</Pastilla>
                      {vencido && (
                        <Pastilla fondo="var(--riesgo-suave)" texto="var(--riesgo)">
                          vencido
                        </Pastilla>
                      )}
                    </div>
                    <p className="text-xs mt-0.5" style={{ color: "var(--texto-3)" }}>
                      {c.responsable_nombre ?? "sin responsable"}
                      {c.fecha_limite ? ` · ${textoRelativo(c.fecha_limite)}` : ""}
                    </p>
                  </div>
                  <form action={cambiarEstadoCompromiso} className="shrink-0">
                    <input type="hidden" name="id" value={c.id} />
                    <input type="hidden" name="cliente_id" value={cliente.id} />
                    <input type="hidden" name="estado" value="cumplido" />
                    <button type="submit" className="boton-suave text-xs">
                      Cumplido
                    </button>
                  </form>
                </div>
              );
            })}
          </div>
        )}

        {cerrados.length > 0 && (
          <details className="mt-3">
            <summary
              className="text-xs cursor-pointer select-none"
              style={{ color: "var(--texto-3)" }}
            >
              {cerrados.length} cerrado{cerrados.length === 1 ? "" : "s"}
            </summary>
            <div className="tarjeta divide-y mt-2" style={{ borderColor: "var(--borde)" }}>
              {cerrados.map((c) => (
                <div
                  key={c.id}
                  className="px-4 py-2.5 text-sm flex items-center justify-between gap-3"
                  style={{ borderColor: "var(--borde)", color: "var(--texto-2)" }}
                >
                  <span className="line-through">{c.descripcion}</span>
                  <span className="text-xs shrink-0" style={{ color: "var(--texto-3)" }}>
                    {c.estado}
                  </span>
                </div>
              ))}
            </div>
          </details>
        )}
      </Seccion>

      {/* ------------------------------------------------------------ contactos */}

      <Seccion titulo="Contactos" contador={contactos.length}>
        <details className="tarjeta mb-3">
          <summary className="px-4 py-2.5 text-sm cursor-pointer select-none" style={{ color: "var(--texto-2)" }}>
            Añadir contacto
          </summary>
          <form action={crearContacto} className="px-4 pb-4 pt-1 space-y-3">
            <input type="hidden" name="cliente_id" value={cliente.id} />
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
                  <input type="hidden" name="cliente_id" value={cliente.id} />
                  <button
                    type="submit"
                    className="text-xs"
                    style={{ color: "var(--texto-3)" }}
                  >
                    Quitar
                  </button>
                </form>
              </div>
            ))}
          </div>
        )}
      </Seccion>

      {/* ------------------------------------------------------------ ajustes */}

      <Seccion titulo="Ajustes del cliente">
        <details className="tarjeta">
          <summary className="px-4 py-2.5 text-sm cursor-pointer select-none" style={{ color: "var(--texto-2)" }}>
            Editar ficha
          </summary>
          <form action={actualizarCliente} className="px-4 pb-4 pt-1 space-y-3">
            <input type="hidden" name="id" value={cliente.id} />
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="etiqueta">Nombre legal</label>
                <input name="nombre" required defaultValue={cliente.nombre} className="campo" />
              </div>
              <div>
                <label className="etiqueta">Partner</label>
                <select name="partner_id" className="campo" defaultValue={cliente.partner_id ?? ""}>
                  <option value="">Sin partner</option>
                  {partners.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nombre}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="etiqueta">Fase</label>
                <select name="fase" className="campo" defaultValue={cliente.fase}>
                  {FASES.map((f) => (
                    <option key={f} value={f}>
                      {ETIQUETA_FASE[f]}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="etiqueta">Estado</label>
                <select name="estado" className="campo" defaultValue={cliente.estado}>
                  {ESTADOS_CLIENTE.map((e) => (
                    <option key={e} value={e}>
                      {ETIQUETA_ESTADO_CLIENTE[e]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="etiqueta">Responsable interno</label>
                <input
                  name="owner_interno"
                  defaultValue={cliente.owner_interno ?? ""}
                  className="campo"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="etiqueta">Descripción</label>
                <textarea
                  name="descripcion"
                  rows={3}
                  defaultValue={cliente.descripcion ?? ""}
                  className="campo"
                />
              </div>
            </div>
            <p className="text-xs" style={{ color: "var(--texto-3)" }}>
              Cambiar la fase deja un evento en el timeline automáticamente.
            </p>
            <button type="submit" className="boton">
              Guardar
            </button>
          </form>
        </details>
      </Seccion>
    </>
  );
}
