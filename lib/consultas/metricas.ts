import "server-only";
import { sql } from "../db";

export type MetricaDia = {
  cliente_id: string;
  cliente_nombre: string;
  fecha: string | null;
  llamadas_totales: number | null;
  duracion_total_min: string | null;
  contencion_pct: string | null;
  sin_actividad: boolean;
  notas: string | null;
};

/**
 * Una fila por cliente en producción, con lo registrado ese día si existe.
 * Los clientes que aún no están en producción no piden números: pedirlos sería
 * fricción diaria a cambio de ceros.
 */
export async function metricasDelDia(fecha: string) {
  return sql<MetricaDia>(
    `
    select c.id as cliente_id, c.nombre as cliente_nombre,
           m.fecha, m.llamadas_totales, m.duracion_total_min,
           m.contencion_pct, coalesce(m.sin_actividad, false) as sin_actividad, m.notas
    from cliente c
    left join metrica_dia m on m.cliente_id = c.id and m.fecha = $1::date
    where c.fase = 'produccion' and c.estado = 'activo' and not c.archivado
    order by c.nombre
    `,
    [fecha],
  );
}

export type DiaPendiente = { fecha: string; registrados: number; esperados: number };

/**
 * Días de los últimos N en los que falta algún cliente por registrar.
 * Es lo que evita descubrir en el cierre de mes que faltan cuatro días.
 */
export async function diasPendientes(dias = 14) {
  return sql<DiaPendiente>(
    `
    with dias as (
      select generate_series(current_date - $1::int, current_date, '1 day')::date as fecha
    ),
    esperados as (
      select count(*)::int as n
      from cliente
      where fase = 'produccion' and estado = 'activo' and not archivado
    )
    select d.fecha,
           (select count(*)::int from metrica_dia m where m.fecha = d.fecha) as registrados,
           e.n as esperados
    from dias d cross join esperados e
    where (select count(*) from metrica_dia m where m.fecha = d.fecha) < e.n
    order by d.fecha desc
    `,
    [dias],
  );
}

export type ObjetivoMes = {
  id: string;
  cliente_id: string;
  periodo: string;
  llamadas_comprometidas: number | null;
  minutos_comprometidos: string | null;
};

export async function objetivosCliente(clienteId: string) {
  return sql<ObjetivoMes>(
    `select * from objetivo_mes where cliente_id = $1 order by periodo desc limit 24`,
    [clienteId],
  );
}

export type ResumenMes = {
  periodo: string;
  llamadas: string | null;
  minutos: string | null;
  duracion_promedio: string | null;
  contencion_promedio: string | null;
  dias_con_actividad: number;
  llamadas_comprometidas: number | null;
  minutos_comprometidos: string | null;
  fuente: "mes" | "dias";
};

/**
 * Serie mensual de un cliente, combinando dos orígenes:
 *
 * - `metrica_mes`: totales cargados a mano para meses de los que no hay día a
 *   día. Si existe para un mes, manda.
 * - `metrica_dia`: la suma de los días registrados.
 *
 * La duración promedio y la contención se calculan sobre los totales del mes,
 * no promediando promedios diarios: un día de 10 llamadas no puede pesar lo
 * mismo que uno de 400.
 */
export async function resumenMensual(clienteId: string, meses = 12) {
  return sql<ResumenMes>(
    `
    with desde as (
      select date_trunc('month', current_date)::date
             - make_interval(months => $2::int) as limite
    ),
    porDias as (
      select
        date_trunc('month', m.fecha)::date as periodo,
        sum(m.llamadas_totales)            as llamadas,
        sum(m.duracion_total_min)          as minutos,
        case when sum(m.llamadas_totales) > 0
             then sum(m.contencion_pct * m.llamadas_totales) / sum(m.llamadas_totales)
        end                                as contencion,
        count(*) filter (where not m.sin_actividad)::int as dias
      from metrica_dia m, desde
      where m.cliente_id = $1 and m.fecha >= desde.limite
      group by 1
    ),
    porMes as (
      select periodo, llamadas_totales as llamadas, duracion_total_min as minutos,
             contencion_pct as contencion
      from metrica_mes, desde
      where cliente_id = $1 and periodo >= desde.limite
    ),
    unidos as (
      select coalesce(mm.periodo, dd.periodo) as periodo,
             coalesce(mm.llamadas, dd.llamadas)     as llamadas,
             coalesce(mm.minutos, dd.minutos)       as minutos,
             coalesce(mm.contencion, dd.contencion) as contencion,
             coalesce(dd.dias, 0)                   as dias,
             case when mm.periodo is not null then 'mes' else 'dias' end as fuente
      from porMes mm
      full outer join porDias dd on dd.periodo = mm.periodo
    )
    select
      u.periodo,
      u.llamadas,
      u.minutos,
      case when u.llamadas > 0 then u.minutos / u.llamadas end as duracion_promedio,
      u.contencion as contencion_promedio,
      u.dias       as dias_con_actividad,
      o.llamadas_comprometidas,
      o.minutos_comprometidos,
      u.fuente
    from unidos u
    left join objetivo_mes o on o.cliente_id = $1 and o.periodo = u.periodo
    order by u.periodo desc
    `,
    [clienteId, meses],
  );
}

export type MetricaMes = {
  id: string;
  periodo: string;
  llamadas_totales: number | null;
  duracion_total_min: string | null;
  contencion_pct: string | null;
  notas: string | null;
};

export async function mesesCargados(clienteId: string) {
  return sql<MetricaMes>(
    `select id, periodo, llamadas_totales, duracion_total_min, contencion_pct, notas
     from metrica_mes where cliente_id = $1 order by periodo desc`,
    [clienteId],
  );
}
