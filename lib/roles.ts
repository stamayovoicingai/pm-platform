/** Qué puede hacer cada rol. Sin dependencias, para poder usarlo en cliente. */

export const ROLES = ["admin", "editor", "lector"] as const;
export type Rol = (typeof ROLES)[number];

export const ETIQUETA_ROL: Record<Rol, string> = {
  admin: "Administrador",
  editor: "Editor",
  lector: "Lector",
};

export const DESCRIPCION_ROL: Record<Rol, string> = {
  admin: "Todo, incluido invitar personas, borrar clientes y cambiar ajustes.",
  editor: "Registrar, editar y borrar registros. No puede invitar ni borrar clientes.",
  lector: "Solo ver. No puede modificar nada.",
};

/** Registrar, editar y borrar registros. */
export function puedeEditar(rol: Rol): boolean {
  return rol === "admin" || rol === "editor";
}

/** Invitar personas, borrar clientes y tocar la configuración. */
export function puedeAdministrar(rol: Rol): boolean {
  return rol === "admin";
}
