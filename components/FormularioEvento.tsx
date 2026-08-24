"use client";

import { useRef, useState } from "react";
import { crearEvento } from "@/app/acciones";
import { LIMITE_BYTES, MAX_ARCHIVOS_POR_SUBIDA, tamanoLegible } from "@/lib/adjuntos";
import {
  TIPOS_EVENTO_MANUAL,
  SEVERIDADES,
  ETIQUETA_EVENTO,
  ETIQUETA_SEVERIDAD,
  colorEvento,
  type TipoEvento,
} from "@/lib/dominio";

/**
 * Registro rápido. Los tipos son botones y no un desplegable a propósito:
 * un clic menos multiplicado por varias entradas al día es lo que hace que
 * el hábito se sostenga.
 */
export default function FormularioEvento({
  clienteId,
  hoy,
}: {
  clienteId: string;
  hoy: string;
}) {
  const formulario = useRef<HTMLFormElement>(null);
  const [tipo, setTipo] = useState<TipoEvento>("nota");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      ref={formulario}
      action={async (datos) => {
        setGuardando(true);
        setError(null);
        try {
          await crearEvento(datos);
          formulario.current?.reset();
          setTipo("nota");
        } catch (e) {
          setError(e instanceof Error ? e.message : "No se pudo registrar");
        } finally {
          setGuardando(false);
        }
      }}
      className="tarjeta p-4 space-y-3"
    >
      <input type="hidden" name="cliente_id" value={clienteId} />
      <input type="hidden" name="tipo" value={tipo} />

      <div className="flex flex-wrap gap-1.5">
        {TIPOS_EVENTO_MANUAL.map((t) => {
          const activo = tipo === t;
          const color = colorEvento(t);
          return (
            <button
              key={t}
              type="button"
              onClick={() => setTipo(t)}
              className="pastilla"
              style={{
                background: activo ? color.fondo : "transparent",
                color: activo ? color.texto : "var(--texto-3)",
                border: `1px solid ${activo ? "transparent" : "var(--borde)"}`,
              }}
            >
              {ETIQUETA_EVENTO[t]}
            </button>
          );
        })}
      </div>

      <input
        name="titulo"
        required
        className="campo"
        placeholder="Qué pasó"
        autoComplete="off"
      />

      <textarea name="cuerpo" rows={2} className="campo" placeholder="Detalle (opcional)" />

      <div>
        <label className="etiqueta" htmlFor="archivos">
          Archivos · hasta {MAX_ARCHIVOS_POR_SUBIDA}, {tamanoLegible(LIMITE_BYTES)} cada uno
        </label>
        <input
          id="archivos"
          type="file"
          name="archivos"
          multiple
          className="text-sm w-full"
          style={{ color: "var(--texto-2)" }}
        />
      </div>

      {error && (
        <p className="text-sm" style={{ color: "var(--riesgo)" }}>
          {error}
        </p>
      )}

      <div className="flex flex-wrap items-end gap-3">
        <div className="w-40">
          <label className="etiqueta">Fecha</label>
          <input type="date" name="fecha_evento" defaultValue={hoy} className="campo" />
        </div>
        <div className="w-32">
          <label className="etiqueta">Severidad</label>
          <select name="severidad" className="campo" defaultValue="info">
            {SEVERIDADES.map((s) => (
              <option key={s} value={s}>
                {ETIQUETA_SEVERIDAD[s]}
              </option>
            ))}
          </select>
        </div>
        <button type="submit" className="boton ml-auto" disabled={guardando}>
          {guardando ? "Guardando…" : "Registrar"}
        </button>
      </div>
    </form>
  );
}
