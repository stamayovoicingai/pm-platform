import "server-only";
import { sql } from "../db";
import type { EstadoHito, TipoHito } from "../dominio";

export type HitoFila = {
  id: string;
  cliente_id: string;
  cliente_nombre: string;
  tipo: TipoHito;
  titulo: string;
  fecha_objetivo: string;
  estado: EstadoHito;
  responsable_nombre: string | null;
  notas: string | null;
  veces_movido: number;
};

const SELECT_BASE = `
  select h.*, c.nombre as cliente_nombre,
         ct.nombre as responsable_nombre,
         coalesce(m.veces, 0)::int as veces_movido
  from hito h
  join cliente c on c.id = h.cliente_id
  left join contacto ct on ct.id = h.responsable_id
  left join lateral (
    select count(*) as veces from hito_cambio_fecha where hito_id = h.id
  ) m on true
`;

export async function hitosCliente(clienteId: string) {
  return sql<HitoFila>(
    `${SELECT_BASE}
     where h.cliente_id = $1
     order by
       case when h.estado in ('pendiente','en_curso') then 0 else 1 end,
       h.fecha_objetivo`,
    [clienteId],
  );
}

/** Hitos abiertos dentro de una ventana de días (incluye los ya vencidos). */
export async function hitosProximos(dias = 30) {
  return sql<HitoFila>(
    `${SELECT_BASE}
     where h.estado in ('pendiente','en_curso')
       and h.fecha_objetivo <= current_date + $1::int
       and not c.archivado
     order by h.fecha_objetivo`,
    [dias],
  );
}

export async function todosLosHitos() {
  return sql<HitoFila>(
    `${SELECT_BASE}
     where not c.archivado
     order by
       case when h.estado in ('pendiente','en_curso') then 0 else 1 end,
       h.fecha_objetivo`,
  );
}

export type CambioFecha = {
  id: string;
  fecha_anterior: string;
  fecha_nueva: string;
  motivo: string;
  creado_en: string;
};

export async function historialFechas(hitoId: string) {
  return sql<CambioFecha>(
    `select * from hito_cambio_fecha where hito_id = $1 order by creado_en desc`,
    [hitoId],
  );
}
