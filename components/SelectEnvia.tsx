"use client";

/**
 * Select que envía su formulario al cambiar. Es el patrón de los desplegables
 * de estado de Jira: cambiar sin abrir nada ni buscar un botón de guardar.
 */
export default function SelectEnvia({
  name,
  defaultValue,
  opciones,
  ancho,
}: {
  name: string;
  defaultValue: string;
  opciones: { valor: string; etiqueta: string }[];
  ancho?: string;
}) {
  return (
    <select
      name={name}
      defaultValue={defaultValue}
      onChange={(e) => e.currentTarget.form?.requestSubmit()}
      className="text-xs rounded-md px-2 py-1 cursor-pointer"
      style={{
        background: "var(--superficie)",
        border: "1px solid var(--borde-fuerte)",
        color: "var(--texto)",
        width: ancho,
      }}
    >
      {opciones.map((o) => (
        <option key={o.valor} value={o.valor}>
          {o.etiqueta}
        </option>
      ))}
    </select>
  );
}
