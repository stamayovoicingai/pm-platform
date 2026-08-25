-- Los supuestos que TP entrega antes de salir a producción.
--
-- No es lo mismo que objetivo_mes: aquel es el compromiso comercial de un mes
-- concreto y se carga cada mes; esto es la foto única con la que se dimensionó
-- y se vendió el proyecto, y es contra lo que se contrasta la realidad después.
--
-- El AHT se guarda en segundos porque así lo reportan los centros de contacto,
-- aunque la duración real de metrica_dia esté en minutos: convertir al comparar
-- es preferible a guardar un dato con menos precisión de la que llega.

create table linea_base (
  id                       uuid primary key references cliente(id) on delete cascade,
  volumen_mensual_promedio integer,
  aht_promedio_seg         integer check (aht_promedio_seg is null or aht_promedio_seg > 0),
  concurrencia_promedio    integer,
  concurrencia_maxima      integer,
  meta_contencion_pct      numeric(5, 2)
                             check (meta_contencion_pct is null
                                    or (meta_contencion_pct >= 0 and meta_contencion_pct <= 100)),
  horario_operativo        text,
  entregado_por            text,
  fecha_entrega            date,
  notas                    text,
  creado_en                timestamptz not null default now(),
  actualizado_en           timestamptz not null default now()
);

comment on table linea_base is
  'Supuestos entregados por el partner antes de producción. Una fila por cliente.';
