"use client";

import { useEffect, useState } from "react";

/**
 * Borrar en dos pasos, sin diálogo del navegador.
 *
 * El primer clic solo cambia la etiqueta; el segundo envía. Es la diferencia
 * entre perder un registro por un clic despistado y tener que quererlo. Vuelve
 * solo a su estado inicial si no se confirma.
 */
export default function BotonBorrar({
  etiqueta = "Borrar",
  confirmacion = "¿Seguro?",
}: {
  etiqueta?: string;
  confirmacion?: string;
}) {
  const [armado, setArmado] = useState(false);

  useEffect(() => {
    if (!armado) return;
    const t = setTimeout(() => setArmado(false), 4000);
    return () => clearTimeout(t);
  }, [armado]);

  return (
    <button
      type={armado ? "submit" : "button"}
      onClick={() => {
        if (!armado) setArmado(true);
      }}
      className="text-xs"
      style={{ color: armado ? "var(--riesgo)" : "var(--texto-3)", fontWeight: armado ? 600 : 400 }}
    >
      {armado ? confirmacion : etiqueta}
    </button>
  );
}
