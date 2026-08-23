-- PM Platform — esquema inicial
-- Todas las tablas del modelo, aunque la Fase 1 solo use una parte.
-- Crearlas ahora evita migraciones destructivas después.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------- enums

create type fase_cliente as enum (
  'descubrimiento', 'desarrollo', 'qa', 'uat', 'produccion'
);

create type estado_cliente as enum ('activo', 'pausado', 'cerrado');

create type lado_contacto as enum ('interno', 'partner', 'cliente');

create type tipo_hito as enum (
  'go_live', 'piloto', 'entrega', 'aprobacion', 'facturacion', 'otro'
);

create type estado_hito as enum ('pendiente', 'en_curso', 'cumplido', 'cancelado');

create type tipo_evento as enum (
  'nota', 'incidencia', 'decision', 'cambio_scope', 'riesgo', 'bloqueo',
  'despliegue', 'cambio_stack', 'cambio_fase', 'feedback'
);

create type severidad_evento as enum ('info', 'media', 'alta');

create type origen_registro as enum ('app', 'slack', 'llm');

create type estado_compromiso as enum ('pendiente', 'cumplido', 'vencido', 'cancelado');

create type categoria_stack as enum (
  'stt', 'llm', 'tts', 'vad', 'telefonia', 'sip', 'infra', 'vector_db'
);

create type tipo_bandera as enum ('riesgo', 'oportunidad', 'creciendo');

create type tipo_documento as enum (
  'transcript_reunion', 'whatsapp', 'correo', 'acta', 'otro'
);

create type estado_documento as enum ('pendiente', 'procesado', 'descartado');

create type tipo_extraccion as enum (
  'fecha_comprometida', 'cambio_scope', 'decision', 'riesgo', 'accion',
  'feedback', 'metrica'
);

create type estado_extraccion as enum ('propuesta', 'aceptada', 'rechazada', 'editada');

-- ---------------------------------------------------------------- núcleo

create table usuario (
  id            uuid primary key default gen_random_uuid(),
  email         text not null unique,
  nombre        text not null,
  password_hash text not null,
  creado_en     timestamptz not null default now()
);

create table partner (
  id        uuid primary key default gen_random_uuid(),
  nombre    text not null unique,
  notas     text,
  creado_en timestamptz not null default now()
);

create table cliente (
  id            uuid primary key default gen_random_uuid(),
  partner_id    uuid references partner(id) on delete set null,
  nombre        text not null,
  fase          fase_cliente not null default 'descubrimiento',
  estado        estado_cliente not null default 'activo',
  owner_interno text,
  descripcion   text,
  fecha_alta    date not null default current_date,
  archivado     boolean not null default false,
  creado_en     timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

create index cliente_fase_idx on cliente (fase) where not archivado;

create table contacto (
  id         uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references cliente(id) on delete cascade,
  nombre     text not null,
  rol        text,
  lado       lado_contacto not null default 'cliente',
  email      text,
  notas      text,
  creado_en  timestamptz not null default now()
);

create index contacto_cliente_idx on contacto (cliente_id);

-- ---------------------------------------------------------------- hitos

create table hito (
  id             uuid primary key default gen_random_uuid(),
  cliente_id     uuid not null references cliente(id) on delete cascade,
  tipo           tipo_hito not null,
  titulo         text not null,
  fecha_objetivo date not null,
  estado         estado_hito not null default 'pendiente',
  responsable_id uuid references contacto(id) on delete set null,
  notas          text,
  creado_en      timestamptz not null default now()
);

create index hito_cliente_fecha_idx on hito (cliente_id, fecha_objetivo);
create index hito_pendientes_idx on hito (fecha_objetivo)
  where estado in ('pendiente', 'en_curso');

-- Historial: una fecha de hito nunca se sobreescribe en silencio.
create table hito_cambio_fecha (
  id             uuid primary key default gen_random_uuid(),
  hito_id        uuid not null references hito(id) on delete cascade,
  fecha_anterior date not null,
  fecha_nueva    date not null,
  motivo         text not null,
  creado_en      timestamptz not null default now()
);

create index hito_cambio_hito_idx on hito_cambio_fecha (hito_id, creado_en desc);

-- ---------------------------------------------------------------- timeline

create table documento (
  id                uuid primary key default gen_random_uuid(),
  cliente_id        uuid references cliente(id) on delete set null,
  tipo              tipo_documento not null default 'otro',
  titulo            text not null,
  fecha             date not null default current_date,
  texto_original    text not null,
  texto_enmascarado text,
  estado            estado_documento not null default 'pendiente',
  creado_en         timestamptz not null default now()
);

create index documento_cliente_idx on documento (cliente_id, fecha desc);

create table evento (
  id           uuid primary key default gen_random_uuid(),
  cliente_id   uuid not null references cliente(id) on delete cascade,
  tipo         tipo_evento not null default 'nota',
  titulo       text not null,
  cuerpo       text,
  fecha_evento date not null default current_date,
  severidad    severidad_evento not null default 'info',
  origen       origen_registro not null default 'app',
  documento_id uuid references documento(id) on delete set null,
  creado_en    timestamptz not null default now()
);

create index evento_timeline_idx on evento (cliente_id, fecha_evento desc, creado_en desc);
create index evento_tipo_idx on evento (tipo, fecha_evento desc);

create table compromiso (
  id                uuid primary key default gen_random_uuid(),
  cliente_id        uuid not null references cliente(id) on delete cascade,
  descripcion       text not null,
  responsable_id    uuid references contacto(id) on delete set null,
  lado              lado_contacto not null default 'interno',
  fecha_limite      date,
  estado            estado_compromiso not null default 'pendiente',
  evento_origen_id  uuid references evento(id) on delete set null,
  documento_id      uuid references documento(id) on delete set null,
  creado_en         timestamptz not null default now(),
  cerrado_en        timestamptz
);

create index compromiso_vencimiento_idx on compromiso (estado, fecha_limite);
create index compromiso_cliente_idx on compromiso (cliente_id, estado);

-- ---------------------------------------------------------------- métricas

create table metrica_dia (
  id                 uuid primary key default gen_random_uuid(),
  cliente_id         uuid not null references cliente(id) on delete cascade,
  fecha              date not null,
  llamadas_totales   integer,
  duracion_total_min numeric(12, 2),
  contencion_pct     numeric(5, 2),
  sin_actividad      boolean not null default false,
  notas              text,
  origen             origen_registro not null default 'app',
  creado_en          timestamptz not null default now(),
  constraint metrica_dia_unica unique (cliente_id, fecha),
  constraint metrica_dia_coherente check (
    sin_actividad or llamadas_totales is not null
  )
);

create index metrica_dia_rango_idx on metrica_dia (cliente_id, fecha desc);

create table objetivo_mes (
  id                     uuid primary key default gen_random_uuid(),
  cliente_id             uuid not null references cliente(id) on delete cascade,
  periodo                date not null, -- primer día del mes
  llamadas_comprometidas integer,
  minutos_comprometidos  numeric(12, 2),
  creado_en              timestamptz not null default now(),
  constraint objetivo_mes_unico unique (cliente_id, periodo)
);

-- ---------------------------------------------------------------- stack

create table stack_item (
  id            uuid primary key default gen_random_uuid(),
  cliente_id    uuid not null references cliente(id) on delete cascade,
  categoria     categoria_stack not null,
  proveedor     text not null,
  modelo        text,
  version       text,
  vigente_desde date not null default current_date,
  vigente_hasta date,
  notas         text,
  creado_en     timestamptz not null default now()
);

create index stack_vigencia_idx on stack_item (cliente_id, categoria, vigente_desde desc);

-- Catálogo editable de proveedores/modelos, para que los selectores no sean texto libre.
create table catalogo_stack (
  id        uuid primary key default gen_random_uuid(),
  categoria categoria_stack not null,
  proveedor text not null,
  modelo    text,
  constraint catalogo_stack_unico unique (categoria, proveedor, modelo)
);

-- ---------------------------------------------------------------- banderas

create table regla_bandera (
  id           uuid primary key default gen_random_uuid(),
  nombre       text not null,
  tipo         tipo_bandera not null,
  cliente_id   uuid references cliente(id) on delete cascade, -- null = global
  metrica      text not null,
  comparador   text not null,
  umbral       numeric(12, 2) not null,
  ventana_dias integer not null default 30,
  activa       boolean not null default true,
  creado_en    timestamptz not null default now()
);

create table bandera (
  id           uuid primary key default gen_random_uuid(),
  cliente_id   uuid not null references cliente(id) on delete cascade,
  regla_id     uuid references regla_bandera(id) on delete set null,
  tipo         tipo_bandera not null,
  contexto     text,
  activa_desde timestamptz not null default now(),
  resuelta_en  timestamptz
);

create index bandera_activa_idx on bandera (cliente_id) where resuelta_en is null;

-- ---------------------------------------------------------------- ingesta LLM

create table mascara_pii (
  id            uuid primary key default gen_random_uuid(),
  documento_id  uuid not null references documento(id) on delete cascade,
  token         text not null,
  valor_cifrado text not null,
  constraint mascara_token_unico unique (documento_id, token)
);

create table extraccion (
  id                   uuid primary key default gen_random_uuid(),
  documento_id         uuid not null references documento(id) on delete cascade,
  tipo                 tipo_extraccion not null,
  payload              jsonb not null,
  cita                 text,
  confianza            numeric(3, 2),
  estado               estado_extraccion not null default 'propuesta',
  entidad_creada_tipo  text,
  entidad_creada_id    uuid,
  creado_en            timestamptz not null default now()
);

create index extraccion_documento_idx on extraccion (documento_id, estado);

-- ---------------------------------------------------------------- ajustes

create table ajuste (
  clave text primary key,
  valor jsonb not null
);
