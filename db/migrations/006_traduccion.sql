-- Caché de traducciones del contenido que escribe el usuario.
--
-- La clave es el hash del texto original, no la fila que lo contiene: el mismo
-- texto escrito en dos clientes se traduce una sola vez, y editar un texto
-- genera un hash distinto, así que la entrada vieja deja de usarse sin
-- necesidad de invalidar nada a mano.

create table traduccion (
  hash          text not null,
  idioma        text not null,
  texto_origen  text not null,
  texto         text not null,
  creado_en     timestamptz not null default now(),
  primary key (hash, idioma)
);
