-- Usuarios con rol e invitaciones.
--
-- El usuario que ya existe se queda como admin; los que entren por invitación
-- serán editores salvo que se diga otra cosa. Por eso el valor por defecto
-- cambia después de rellenar la columna.

create type rol_usuario as enum ('admin', 'editor', 'lector');

alter table usuario add column rol rol_usuario not null default 'admin';
alter table usuario alter column rol set default 'editor';
alter table usuario add column activo boolean not null default true;

-- Del token solo se guarda su hash: quien tenga acceso a la base no puede
-- usar una invitación pendiente para entrar.
create table invitacion (
  id          uuid primary key default gen_random_uuid(),
  email       text not null,
  nombre      text,
  rol         rol_usuario not null default 'editor',
  token_hash  text not null unique,
  creada_por  uuid references usuario(id) on delete set null,
  creada_en   timestamptz not null default now(),
  expira_en   timestamptz not null,
  usada_en    timestamptz,
  usuario_id  uuid references usuario(id) on delete set null
);

create index invitacion_pendiente_idx on invitacion (expira_en)
  where usada_en is null;
