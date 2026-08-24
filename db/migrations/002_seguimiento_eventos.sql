-- Los eventos que describen algo vivo (incidencia, bloqueo, riesgo, cambio de
-- scope) necesitan estado y un hilo de actualizaciones. Los que describen algo
-- que ya pasó (nota, decisión, despliegue, feedback) no: su estado es null.

create type estado_seguimiento as enum ('abierto', 'en_curso', 'resuelto', 'descartado');

alter table evento
  add column estado_seguimiento estado_seguimiento;

-- Los tipos seguibles que ya existían arrancan como abiertos.
update evento
   set estado_seguimiento = 'abierto'
 where tipo in ('incidencia', 'bloqueo', 'riesgo', 'cambio_scope');

create table evento_actualizacion (
  id              uuid primary key default gen_random_uuid(),
  evento_id       uuid not null references evento(id) on delete cascade,
  cuerpo          text not null,
  estado_anterior estado_seguimiento,
  estado_nuevo    estado_seguimiento,
  origen          origen_registro not null default 'app',
  creado_en       timestamptz not null default now()
);

create index evento_actualizacion_idx
  on evento_actualizacion (evento_id, creado_en);

-- Para la vista de asuntos abiertos en Hoy.
create index evento_abiertos_idx
  on evento (cliente_id, fecha_evento desc)
  where estado_seguimiento in ('abierto', 'en_curso');
