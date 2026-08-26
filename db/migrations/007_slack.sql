-- Registro de envíos programados.
--
-- El programador vive dentro del contenedor, así que un reinicio a las 19:01
-- volvería a mandar el recordatorio de las 19:00. La clave primaria compuesta
-- convierte "enviar" en una operación idempotente: quien consigue insertar la
-- fila es quien manda el mensaje, y no hay segundo.

create table envio_slack (
  clave      text not null,
  fecha      date not null,
  enviado_en timestamptz not null default now(),
  primary key (clave, fecha)
);

-- Lo que el modelo entiende de un mensaje escrito en el canal, a la espera de
-- que una persona lo confirme. No se guarda en el botón porque Slack limita el
-- tamaño del valor y porque el payload cambia al editarlo.
create type estado_propuesta as enum ('pendiente', 'aceptada', 'descartada');

create table propuesta_slack (
  id           uuid primary key default gen_random_uuid(),
  canal        text not null,
  hilo_ts      text not null,
  usuario      text,
  texto        text not null,
  payload      jsonb not null,
  estado       estado_propuesta not null default 'pendiente',
  evento_id    uuid references evento(id) on delete set null,
  creado_en    timestamptz not null default now(),
  resuelto_en  timestamptz
);

create index propuesta_pendiente_idx on propuesta_slack (estado, creado_en desc);
