"use client";

import { useState } from "react";
import Icono from "./Icono";
import { useAvisar } from "./Avisos";
import { useT } from "./Idioma";

/**
 * Descarga de todo lo registrado, en un ZIP de archivos de texto.
 *
 * Se hace con fetch y no con un `<a download>` porque armar el ZIP tarda unos
 * segundos: con el enlace suelto no habría forma de decir "estoy en ello" ni
 * de avisar si falla, y el usuario volvería a pulsar creyendo que no pasó nada.
 */
export default function BotonExportar({
  variante = "suave",
  className = "",
}: {
  variante?: "principal" | "suave";
  className?: string;
}) {
  const t = useT();
  const avisar = useAvisar();
  const [ocupado, setOcupado] = useState(false);

  async function descargar() {
    if (ocupado) return;
    setOcupado(true);
    try {
      const respuesta = await fetch("/api/exportar");
      if (!respuesta.ok) throw new Error(String(respuesta.status));

      const blob = await respuesta.blob();
      const url = URL.createObjectURL(blob);
      const enlace = document.createElement("a");
      enlace.href = url;
      enlace.download = nombreDelEncabezado(
        respuesta.headers.get("Content-Disposition"),
      );
      document.body.appendChild(enlace);
      enlace.click();
      enlace.remove();
      // Sin esto el blob se queda en memoria hasta recargar la página.
      setTimeout(() => URL.revokeObjectURL(url), 1000);

      avisar(t("Descargado"));
    } catch {
      avisar(t("No se pudo generar la descarga"), "error");
    } finally {
      setOcupado(false);
    }
  }

  return (
    <button
      type="button"
      onClick={descargar}
      disabled={ocupado}
      className={`${variante === "principal" ? "boton" : "boton-suave"} ${className}`}
      title={t("Descarga todo lo registrado en archivos de texto")}
    >
      <Icono nombre="descargar" tam={14} />
      {ocupado ? t("Preparando…") : t("Descargar todo")}
    </button>
  );
}

function nombreDelEncabezado(encabezado: string | null): string {
  const utf8 = encabezado?.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8) {
    try {
      return decodeURIComponent(utf8[1]);
    } catch {
      // cabecera rara: cae al nombre por defecto
    }
  }
  const simple = encabezado?.match(/filename="([^"]+)"/i);
  return simple?.[1] ?? "PM Platform.zip";
}
