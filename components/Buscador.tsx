"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useT } from "@/components/Idioma";
import type { Resultado } from "@/app/api/buscar/route";

import Icono, { type NombreIcono } from "./Icono";

const ICONO: Record<Resultado["clase"], NombreIcono> = {
  cliente: "equipo",
  evento: "hilo",
  hito: "calendario",
  compromiso: "check",
};

/**
 * Buscador de salto rápido, al estilo de un command palette.
 *
 * Se abre con ⌘K o Ctrl+K desde cualquier pantalla. Existe porque el camino
 * habitual —volver a la lista, encontrar el cliente, entrar a la pestaña— son
 * tres clics para algo que se hace decenas de veces al día.
 */
export default function Buscador() {
  const t = useT();
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [consulta, setConsulta] = useState("");
  const [resultados, setResultados] = useState<Resultado[]>([]);
  const [activo, setActivo] = useState(0);
  const entrada = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const atajo = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setAbierto((v) => !v);
      }
      if (e.key === "Escape") setAbierto(false);
    };
    window.addEventListener("keydown", atajo);
    return () => window.removeEventListener("keydown", atajo);
  }, []);

  useEffect(() => {
    if (abierto) setTimeout(() => entrada.current?.focus(), 30);
    else {
      setConsulta("");
      setResultados([]);
      setActivo(0);
    }
  }, [abierto]);

  useEffect(() => {
    if (consulta.trim().length < 2) {
      setResultados([]);
      return;
    }
    // Se espera a que deje de escribir: sin esto sale una consulta por tecla.
    const id = setTimeout(async () => {
      try {
        const r = await fetch(`/api/buscar?q=${encodeURIComponent(consulta)}`);
        const datos = (await r.json()) as { resultados: Resultado[] };
        setResultados(datos.resultados);
        setActivo(0);
      } catch {
        setResultados([]);
      }
    }, 180);
    return () => clearTimeout(id);
  }, [consulta]);

  function ir(r: Resultado) {
    setAbierto(false);
    router.push(r.url);
  }

  if (!abierto) {
    return (
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className="campo flex items-center justify-between"
        style={{ padding: "0.35rem 0.55rem", color: "var(--texto-3)", cursor: "pointer" }}
      >
        <span className="text-xs flex items-center gap-1.5">
          <Icono nombre="buscar" tam={12} />
          {t("Buscar")}
        </span>
        <span className="num text-xs">⌘K</span>
      </button>
    );
  }

  return (
    <>
      <button
        type="button"
        aria-label={t("Cerrar")}
        onClick={() => setAbierto(false)}
        className="fixed inset-0 z-50"
        style={{ background: "rgba(0,0,0,.45)" }}
      />
      <div
        className="fixed z-50 left-1/2 top-24 w-[min(36rem,92vw)]"
        style={{ transform: "translateX(-50%)" }}
      >
        <div className="tarjeta overflow-hidden" style={{ boxShadow: "0 20px 60px rgba(0,0,0,.35)" }}>
          <input
            ref={entrada}
            value={consulta}
            onChange={(e) => setConsulta(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setActivo((i) => Math.min(i + 1, resultados.length - 1));
              }
              if (e.key === "ArrowUp") {
                e.preventDefault();
                setActivo((i) => Math.max(i - 1, 0));
              }
              if (e.key === "Enter" && resultados[activo]) ir(resultados[activo]);
            }}
            placeholder={t("Cliente, registro, hito o compromiso…")}
            className="w-full px-4 py-3 text-sm"
            style={{ background: "transparent", border: "none", outline: "none", color: "var(--texto)" }}
          />

          {resultados.length > 0 && (
            <ul style={{ borderTop: "1px solid var(--borde)", maxHeight: "22rem", overflowY: "auto" }}>
              {resultados.map((r, i) => (
                <li key={`${r.clase}-${r.id}`}>
                  <button
                    type="button"
                    onClick={() => ir(r)}
                    onMouseEnter={() => setActivo(i)}
                    className="w-full text-left px-4 py-2.5 flex items-center gap-3"
                    style={{ background: i === activo ? "var(--superficie-2)" : "transparent" }}
                  >
                    <span className="shrink-0" style={{ color: "var(--texto-3)" }}>
                      <Icono nombre={ICONO[r.clase]} tam={13} />
                    </span>
                    <span className="text-sm flex-1 min-w-0 truncate">{r.titulo}</span>
                    <span className="text-xs shrink-0" style={{ color: "var(--texto-3)" }}>
                      {r.contexto}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}

          {consulta.trim().length >= 2 && resultados.length === 0 && (
            <p
              className="px-4 py-3 text-sm"
              style={{ borderTop: "1px solid var(--borde)", color: "var(--texto-3)" }}
            >
              {t("Nada encontrado.")}
            </p>
          )}
        </div>
      </div>
    </>
  );
}
