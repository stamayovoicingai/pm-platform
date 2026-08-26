-- Lo que el bot mostró numerado en un hilo.
--
-- Sin esto, "cierra el 2" no significa nada: la lista pudo cambiar entre que se
-- mostró y que el usuario respondió. Guardar la lista exacta hace que el número
-- se refiera siempre a lo que se vio, no a lo que hay ahora.

create table conversacion_slack (
  hilo_ts    text primary key,
  canal      text not null,
  cliente_id uuid references cliente(id) on delete cascade,
  items      jsonb not null,
  creado_en  timestamptz not null default now()
);

create index conversacion_reciente_idx on conversacion_slack (creado_en desc);
