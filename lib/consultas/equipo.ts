import "server-only";
import { sql } from "../db";
import type { Rol } from "../roles";

export type Miembro = {
  id: string;
  nombre: string;
  email: string;
  rol: Rol;
  activo: boolean;
  creado_en: string;
};

export async function listarEquipo() {
  return sql<Miembro>(
    "select id, nombre, email, rol, activo, creado_en from usuario order by creado_en",
  );
}

export type InvitacionPendiente = {
  id: string;
  email: string;
  nombre: string | null;
  rol: Rol;
  creada_en: string;
  expira_en: string;
  caducada: boolean;
};

export async function invitacionesPendientes() {
  return sql<InvitacionPendiente>(
    `select id, email, nombre, rol, creada_en, expira_en, expira_en < now() as caducada
     from invitacion where usada_en is null
     order by creada_en desc`,
  );
}
