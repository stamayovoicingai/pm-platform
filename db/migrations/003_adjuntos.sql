-- Archivos colgando de un evento: pantallazos del error, actas, contratos.
--
-- Se guardan en la propia base (bytea) y no en disco ni en S3, para que entren
-- en el mismo backup que el resto. El precio es que la base engorda; con el
-- límite por archivo que aplica la app, es asumible para este volumen de uso.

create table adjunto (
  id            uuid primary key default gen_random_uuid(),
  evento_id     uuid not null references evento(id) on delete cascade,
  nombre        text not null,
  tipo_mime     text not null,
  tamano_bytes  bigint not null check (tamano_bytes > 0),
  contenido     bytea not null,
  creado_en     timestamptz not null default now()
);

create index adjunto_evento_idx on adjunto (evento_id, creado_en);
