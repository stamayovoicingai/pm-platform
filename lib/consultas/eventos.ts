import "server-only";
import { sql } from "../db";
import type { Severidad, TipoEvento } from "../dominio";

export type EventoFila = {
  id: string;
  cliente_id: string;
  cliente_nombre: string;
  tipo: TipoEvento;
  titulo: string;
  cuerpo: string | null;
  fecha_evento: string;
  severidad: Severidad;
  origen: "app" | "slack" | "llm";
  creado_en: string;
};

export async function timelineCliente(clienteId: string, limite = 100) {
  return sql<EventoFila>(
    `select e.*, c.nombre as cliente_nombre
     from evento e join cliente c on c.id = e.cliente_id
     where e.cliente_id = $1
     order by e.fecha_evento desc, e.creado_en desc
     limit $2`,
    [clienteId, limite],
  );
}

export async function eventosRecientes(limite = 20) {
  return sql<EventoFila>(
    `select e.*, c.nombre as cliente_nombre
     from evento e join cliente c on c.id = e.cliente_id
     order by e.fecha_evento desc, e.creado_en desc
     limit $1`,
    [limite],
  );
}
