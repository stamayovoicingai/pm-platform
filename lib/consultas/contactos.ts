import "server-only";
import { sql } from "../db";
import type { Lado } from "../dominio";

export type ContactoFila = {
  id: string;
  nombre: string;
  rol: string | null;
  lado: Lado;
  email: string | null;
  notas: string | null;
};

export async function contactosCliente(clienteId: string) {
  return sql<ContactoFila>(
    `select id, nombre, rol, lado, email, notas
     from contacto where cliente_id = $1
     order by array_position(array['interno','partner','cliente']::lado_contacto[], lado), nombre`,
    [clienteId],
  );
}
