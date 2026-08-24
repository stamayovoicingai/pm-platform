import "server-only";
import { sql, uno } from "../db";
import type { EstadoCliente, Fase } from "../dominio";

export type ClienteFila = {
  id: string;
  nombre: string;
  fase: Fase;
  estado: EstadoCliente;
  owner_interno: string | null;
  partner_nombre: string | null;
  proximo_hito_fecha: string | null;
  proximo_hito_titulo: string | null;
  compromisos_vencidos: number;
  ultimo_evento: string | null;
  abiertos: number;
  llamadas_mes: string | null;
  llamadas_mes_previo: string | null;
};

export async function listarClientes(filtro?: {
  fase?: Fase;
  incluirArchivados?: boolean;
}): Promise<ClienteFila[]> {
  return sql<ClienteFila>(
    `
    select
      c.id,
      c.nombre,
      c.fase,
      c.estado,
      c.owner_interno,
      p.nombre as partner_nombre,
      h.fecha_objetivo as proximo_hito_fecha,
      h.titulo         as proximo_hito_titulo,
      coalesce(v.vencidos, 0)::int as compromisos_vencidos,
      e.ultimo_evento,
      coalesce(ab.n, 0)::int as abiertos,
      mes.actual as llamadas_mes,
      mes.previo as llamadas_mes_previo
    from cliente c
    left join partner p on p.id = c.partner_id
    left join lateral (
      select fecha_objetivo, titulo
      from hito
      where hito.cliente_id = c.id and hito.estado in ('pendiente', 'en_curso')
      order by fecha_objetivo
      limit 1
    ) h on true
    left join lateral (
      select count(*) as vencidos
      from compromiso
      where compromiso.cliente_id = c.id
        and compromiso.estado = 'pendiente'
        and compromiso.fecha_limite < current_date
    ) v on true
    left join lateral (
      select max(fecha_evento) as ultimo_evento
      from evento
      where evento.cliente_id = c.id
    ) e on true
    left join lateral (
      select count(*) as n from evento
      where evento.cliente_id = c.id
        and evento.estado_seguimiento in ('abierto', 'en_curso')
    ) ab on true
    -- Llamadas del mes en curso y del anterior. El total cargado a mano manda
    -- sobre la suma de días, igual que en la ficha del cliente.
    left join lateral (
      select
        coalesce(
          (select llamadas_totales from metrica_mes
            where cliente_id = c.id and periodo = date_trunc('month', current_date)::date),
          (select sum(llamadas_totales) from metrica_dia
            where cliente_id = c.id
              and fecha >= date_trunc('month', current_date)::date)
        ) as actual,
        coalesce(
          (select llamadas_totales from metrica_mes
            where cliente_id = c.id
              and periodo = (date_trunc('month', current_date) - interval '1 month')::date),
          (select sum(llamadas_totales) from metrica_dia
            where cliente_id = c.id
              and fecha >= (date_trunc('month', current_date) - interval '1 month')::date
              and fecha < date_trunc('month', current_date)::date)
        ) as previo
    ) mes on true
    where ($1::boolean or not c.archivado)
      and ($2::fase_cliente is null or c.fase = $2)
    order by
      array_position(
        array['produccion','uat','qa','desarrollo','descubrimiento']::fase_cliente[],
        c.fase
      ),
      c.nombre
    `,
    [filtro?.incluirArchivados ?? false, filtro?.fase ?? null],
  );
}

export type ClienteDetalle = {
  id: string;
  nombre: string;
  fase: Fase;
  estado: EstadoCliente;
  owner_interno: string | null;
  descripcion: string | null;
  fecha_alta: string;
  archivado: boolean;
  partner_id: string | null;
  partner_nombre: string | null;
};

export async function obtenerCliente(id: string): Promise<ClienteDetalle | null> {
  return uno<ClienteDetalle>(
    `select c.*, p.nombre as partner_nombre
     from cliente c
     left join partner p on p.id = c.partner_id
     where c.id = $1`,
    [id],
  );
}

export async function listarPartners() {
  return sql<{ id: string; nombre: string }>(
    "select id, nombre from partner order by nombre",
  );
}

/** Clientes activos que llevan más de N días sin ningún evento registrado. */
export async function clientesEnSilencio(dias = 14) {
  return sql<{ id: string; nombre: string; ultimo_evento: string | null; dias: number }>(
    `
    select c.id, c.nombre, e.ultimo_evento,
           coalesce(current_date - e.ultimo_evento, 999) as dias
    from cliente c
    left join lateral (
      select max(fecha_evento) as ultimo_evento
      from evento where evento.cliente_id = c.id
    ) e on true
    where not c.archivado
      and c.estado = 'activo'
      and (e.ultimo_evento is null or e.ultimo_evento < current_date - $1::int)
    order by dias desc
    `,
    [dias],
  );
}

export type ClienteSidebar = {
  id: string;
  nombre: string;
  fase: Fase;
  abiertos: number;
};

/** Lo mínimo para el sidebar: nombre, fase y cuántos asuntos siguen abiertos. */
export async function clientesSidebar() {
  return sql<ClienteSidebar>(
    `
    select c.id, c.nombre, c.fase, coalesce(a.n, 0)::int as abiertos
    from cliente c
    left join lateral (
      select count(*) as n from evento
      where evento.cliente_id = c.id
        and evento.estado_seguimiento in ('abierto', 'en_curso')
    ) a on true
    where not c.archivado
    order by
      array_position(
        array['produccion','uat','qa','desarrollo','descubrimiento']::fase_cliente[],
        c.fase
      ),
      c.nombre
    `,
  );
}
