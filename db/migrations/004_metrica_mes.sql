-- Totales mensuales cargados a mano, para meses de los que no hay día a día.
--
-- No se guardan como una fila de metrica_dia el día 1: eso falsearía el
-- promedio diario, el contador de días con actividad y cualquier gráfica
-- futura. Son dos cosas distintas y se guardan por separado; al consultar,
-- el mes cargado a mano tiene prioridad sobre la suma de sus días.

create table metrica_mes (
  id               uuid primary key default gen_random_uuid(),
  cliente_id       uuid not null references cliente(id) on delete cascade,
  periodo          date not null,           -- primer día del mes
  llamadas_totales integer,
  duracion_total_min numeric(12, 2),
  contencion_pct   numeric(5, 2),
  notas            text,
  creado_en        timestamptz not null default now(),
  constraint metrica_mes_unica unique (cliente_id, periodo),
  constraint metrica_mes_primero check (extract(day from periodo) = 1)
);

create index metrica_mes_idx on metrica_mes (cliente_id, periodo desc);
