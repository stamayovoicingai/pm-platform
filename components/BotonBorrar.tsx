"use client";

import { useEffect, useState } from "react";

/**
 * Borrar en dos pasos: el primer clic arma, el segundo borra.
 *
 * El tipo del botón es SIEMPRE submit y el primer clic se cancela con
 * preventDefault. Cambiar el tipo de button a submit dentro del manejador no
 * funciona: React aplica el cambio de estado de forma síncrona antes de que el
 * navegador resuelva la acción por defecto del clic, así que el formulario se
 * enviaba en el primer intento y la confirmación no llegaba a verse nunca.
 */
export default function BotonBorrar({
  etiqueta = "Borrar",
  confirmacion = "Confirmar borrado",
}: {
  etiqueta?: string;
  confirmacion?: string;
}) {
  const [armado, setArmado] = useState(false);

  useEffect(() => {
    if (!armado) return;
    const t = setTimeout(() => setArmado(false), 5000);
    return () => clearTimeout(t);
  }, [armado]);

  return (
    <button
      type="submit"
      onClick={(evento) => {
        if (!armado) {
          evento.preventDefault();
          setArmado(true);
        }
      }}
      className="pastilla"
      style={{
        cursor: "pointer",
        padding: "0.25rem 0.6rem",
        background: armado ? "var(--riesgo)" : "var(--riesgo-suave)",
        color: armado ? "#fff" : "var(--riesgo)",
        border: `1px solid ${armado ? "transparent" : "var(--riesgo)"}`,
      }}
      title={armado ? undefined : etiqueta}
    >
      {armado ? `⚠ ${confirmacion}` : `🗑 ${etiqueta}`}
    </button>
  );
}
