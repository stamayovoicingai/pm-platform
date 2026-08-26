"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Icono from "./Icono";

type Aviso = { id: number; texto: string; tono: "ok" | "error" };

const Contexto = createContext<(texto: string, tono?: Aviso["tono"]) => void>(() => {});

/**
 * Confirmación de que algo pasó.
 *
 * Sin esto, guardar cierra el modal y la pantalla se refresca sin decir nada:
 * queda la duda de si se guardó y la reacción natural es volver a comprobarlo.
 * El texto usa el mismo verbo que el botón que lo provocó — "Guardar" produce
 * "Guardado" — para que se lea como consecuencia y no como mensaje del sistema.
 */
export function ProveedorAvisos({ children }: { children: React.ReactNode }) {
  const [avisos, setAvisos] = useState<Aviso[]>([]);
  const [montado, setMontado] = useState(false);

  useEffect(() => setMontado(true), []);

  const avisar = useCallback((texto: string, tono: Aviso["tono"] = "ok") => {
    const id = Date.now() + Math.random();
    setAvisos((previos) => [...previos, { id, texto, tono }]);
    setTimeout(() => {
      setAvisos((previos) => previos.filter((a) => a.id !== id));
    }, 3200);
  }, []);

  return (
    <Contexto.Provider value={avisar}>
      {children}
      {montado &&
        createPortal(
          <div
            aria-live="polite"
            className="fixed z-[70] flex flex-col gap-2"
            style={{ right: "1.25rem", bottom: "1.25rem" }}
          >
            {avisos.map((a) => (
              <div
                key={a.id}
                className="toast"
                style={
                  a.tono === "error"
                    ? { background: "var(--riesgo)", color: "#fff" }
                    : undefined
                }
              >
                <Icono nombre={a.tono === "error" ? "alerta" : "check"} tam={13} />
                {a.texto}
              </div>
            ))}
          </div>,
          document.body,
        )}
    </Contexto.Provider>
  );
}

export function useAvisar() {
  return useContext(Contexto);
}
