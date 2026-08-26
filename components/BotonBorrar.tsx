"use client";

import { useEffect, useState } from "react";
import Icono from "./Icono";

/**
 * Borrar en dos pasos: el primer clic arma, el segundo borra.
 *
 * El tipo del botón es SIEMPRE submit y el primer clic se cancela con
 * preventDefault. Cambiar el tipo de button a submit dentro del manejador no
 * funciona: React aplica el cambio de estado de forma síncrona antes de que el
 * navegador resuelva la acción por defecto del clic, así que el formulario se
 * enviaba en el primer intento.
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
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "0.35rem",
        cursor: "pointer",
        fontSize: "0.75rem",
        fontWeight: 600,
        padding: "0.3rem 0.6rem",
        borderRadius: "var(--r-control)",
        background: armado ? "var(--riesgo)" : "transparent",
        color: armado ? "#fff" : "var(--riesgo)",
        border: `1px solid ${armado ? "var(--riesgo)" : "var(--riesgo)"}`,
      }}
    >
      <Icono nombre={armado ? "alerta" : "borrar"} tam={12} />
      {armado ? confirmacion : etiqueta}
    </button>
  );
}
