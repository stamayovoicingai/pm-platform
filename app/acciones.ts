"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { sql, uno, enTransaccion } from "@/lib/db";
import {
  FASES,
  ESTADOS_CLIENTE,
  TIPOS_EVENTO,
  SEVERIDADES,
  TIPOS_HITO,
  ESTADOS_HITO,
  ESTADOS_COMPROMISO,
  LADOS,
  ETIQUETA_FASE,
} from "@/lib/dominio";

const texto = z.string().trim().min(1);
const opcional = z
  .string()
  .trim()
  .transform((v) => (v === "" ? null : v))
  .nullable();
const fecha = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida");

function campo(datos: FormData, nombre: string) {
  const valor = datos.get(nombre);
  return typeof valor === "string" ? valor : "";
}

// ---------------------------------------------------------------- clientes

const EsquemaCliente = z.object({
  nombre: texto,
  partner_id: opcional,
  fase: z.enum(FASES),
  estado: z.enum(ESTADOS_CLIENTE),
  owner_interno: opcional,
  descripcion: opcional,
});

export async function crearCliente(datos: FormData) {
  const v = EsquemaCliente.parse({
    nombre: campo(datos, "nombre"),
    partner_id: campo(datos, "partner_id"),
    fase: campo(datos, "fase"),
    estado: campo(datos, "estado") || "activo",
    owner_interno: campo(datos, "owner_interno"),
    descripcion: campo(datos, "descripcion"),
  });

  const creado = await uno<{ id: string }>(
    `insert into cliente (nombre, partner_id, fase, estado, owner_interno, descripcion)
     values ($1, $2, $3, $4, $5, $6) returning id`,
    [v.nombre, v.partner_id, v.fase, v.estado, v.owner_interno, v.descripcion],
  );

  revalidatePath("/clientes");
  redirect(`/clientes/${creado!.id}`);
}

export async function actualizarCliente(datos: FormData) {
  const id = z.uuid().parse(campo(datos, "id"));
  const v = EsquemaCliente.parse({
    nombre: campo(datos, "nombre"),
    partner_id: campo(datos, "partner_id"),
    fase: campo(datos, "fase"),
    estado: campo(datos, "estado"),
    owner_interno: campo(datos, "owner_interno"),
    descripcion: campo(datos, "descripcion"),
  });

  await enTransaccion(async (q) => {
    const [previo] = await q<{ fase: keyof typeof ETIQUETA_FASE }>(
      "select fase from cliente where id = $1 for update",
      [id],
    );

    await q(
      `update cliente
       set nombre = $2, partner_id = $3, fase = $4, estado = $5,
           owner_interno = $6, descripcion = $7, actualizado_en = now()
       where id = $1`,
      [id, v.nombre, v.partner_id, v.fase, v.estado, v.owner_interno, v.descripcion],
    );

    // El cambio de fase queda en el timeline: es información de producto, no metadata.
    if (previo && previo.fase !== v.fase) {
      await q(
        `insert into evento (cliente_id, tipo, titulo, cuerpo, severidad, origen)
         values ($1, 'cambio_fase', $2, null, 'info', 'app')`,
        [id, `Pasa de ${ETIQUETA_FASE[previo.fase]} a ${ETIQUETA_FASE[v.fase]}`],
      );
    }
  });

  revalidatePath(`/clientes/${id}`);
  revalidatePath("/clientes");
}

export async function archivarCliente(datos: FormData) {
  const id = z.uuid().parse(campo(datos, "id"));
  const archivar = campo(datos, "archivar") === "1";
  await sql("update cliente set archivado = $2, actualizado_en = now() where id = $1", [
    id,
    archivar,
  ]);
  revalidatePath("/clientes");
  revalidatePath(`/clientes/${id}`);
}

// ---------------------------------------------------------------- eventos

const EsquemaEvento = z.object({
  cliente_id: z.uuid(),
  tipo: z.enum(TIPOS_EVENTO),
  titulo: texto,
  cuerpo: opcional,
  fecha_evento: fecha,
  severidad: z.enum(SEVERIDADES),
});

export async function crearEvento(datos: FormData) {
  const v = EsquemaEvento.parse({
    cliente_id: campo(datos, "cliente_id"),
    tipo: campo(datos, "tipo"),
    titulo: campo(datos, "titulo"),
    cuerpo: campo(datos, "cuerpo"),
    fecha_evento: campo(datos, "fecha_evento"),
    severidad: campo(datos, "severidad") || "info",
  });

  await sql(
    `insert into evento (cliente_id, tipo, titulo, cuerpo, fecha_evento, severidad, origen)
     values ($1, $2, $3, $4, $5, $6, 'app')`,
    [v.cliente_id, v.tipo, v.titulo, v.cuerpo, v.fecha_evento, v.severidad],
  );

  revalidatePath(`/clientes/${v.cliente_id}`);
  revalidatePath("/");
}

export async function borrarEvento(datos: FormData) {
  const id = z.uuid().parse(campo(datos, "id"));
  const clienteId = z.uuid().parse(campo(datos, "cliente_id"));
  await sql("delete from evento where id = $1", [id]);
  revalidatePath(`/clientes/${clienteId}`);
}

// ---------------------------------------------------------------- hitos

export async function crearHito(datos: FormData) {
  const v = z
    .object({
      cliente_id: z.uuid(),
      tipo: z.enum(TIPOS_HITO),
      titulo: texto,
      fecha_objetivo: fecha,
      notas: opcional,
    })
    .parse({
      cliente_id: campo(datos, "cliente_id"),
      tipo: campo(datos, "tipo"),
      titulo: campo(datos, "titulo"),
      fecha_objetivo: campo(datos, "fecha_objetivo"),
      notas: campo(datos, "notas"),
    });

  await sql(
    `insert into hito (cliente_id, tipo, titulo, fecha_objetivo, notas)
     values ($1, $2, $3, $4, $5)`,
    [v.cliente_id, v.tipo, v.titulo, v.fecha_objetivo, v.notas],
  );

  revalidatePath(`/clientes/${v.cliente_id}`);
  revalidatePath("/hitos");
  revalidatePath("/");
}

/**
 * Mover una fecha exige un motivo y deja rastro. Es lo que después permite
 * responder "esta salida se ha movido tres veces y siempre por lo mismo".
 */
export async function moverFechaHito(datos: FormData) {
  const v = z
    .object({
      id: z.uuid(),
      cliente_id: z.uuid(),
      fecha_nueva: fecha,
      motivo: texto,
    })
    .parse({
      id: campo(datos, "id"),
      cliente_id: campo(datos, "cliente_id"),
      fecha_nueva: campo(datos, "fecha_nueva"),
      motivo: campo(datos, "motivo"),
    });

  await enTransaccion(async (q) => {
    const [hito] = await q<{ fecha_objetivo: Date; titulo: string }>(
      "select fecha_objetivo, titulo from hito where id = $1 for update",
      [v.id],
    );
    if (!hito) throw new Error("Hito no encontrado");

    const anterior =
      typeof hito.fecha_objetivo === "string"
        ? (hito.fecha_objetivo as string).slice(0, 10)
        : hito.fecha_objetivo.toISOString().slice(0, 10);

    if (anterior === v.fecha_nueva) return;

    await q("update hito set fecha_objetivo = $2 where id = $1", [v.id, v.fecha_nueva]);
    await q(
      `insert into hito_cambio_fecha (hito_id, fecha_anterior, fecha_nueva, motivo)
       values ($1, $2, $3, $4)`,
      [v.id, anterior, v.fecha_nueva, v.motivo],
    );
  });

  revalidatePath(`/clientes/${v.cliente_id}`);
  revalidatePath("/hitos");
  revalidatePath("/");
}

export async function cambiarEstadoHito(datos: FormData) {
  const v = z
    .object({
      id: z.uuid(),
      cliente_id: z.uuid(),
      estado: z.enum(ESTADOS_HITO),
    })
    .parse({
      id: campo(datos, "id"),
      cliente_id: campo(datos, "cliente_id"),
      estado: campo(datos, "estado"),
    });

  await sql("update hito set estado = $2 where id = $1", [v.id, v.estado]);
  revalidatePath(`/clientes/${v.cliente_id}`);
  revalidatePath("/hitos");
  revalidatePath("/");
}

// ---------------------------------------------------------------- compromisos

export async function crearCompromiso(datos: FormData) {
  const v = z
    .object({
      cliente_id: z.uuid(),
      descripcion: texto,
      lado: z.enum(LADOS),
      fecha_limite: z
        .string()
        .transform((s) => (s.trim() === "" ? null : s.trim()))
        .nullable()
        .refine((s) => s === null || /^\d{4}-\d{2}-\d{2}$/.test(s), "Fecha inválida"),
      responsable_id: opcional,
    })
    .parse({
      cliente_id: campo(datos, "cliente_id"),
      descripcion: campo(datos, "descripcion"),
      lado: campo(datos, "lado") || "interno",
      fecha_limite: campo(datos, "fecha_limite"),
      responsable_id: campo(datos, "responsable_id"),
    });

  await sql(
    `insert into compromiso (cliente_id, descripcion, lado, fecha_limite, responsable_id)
     values ($1, $2, $3, $4, $5)`,
    [v.cliente_id, v.descripcion, v.lado, v.fecha_limite, v.responsable_id],
  );

  revalidatePath(`/clientes/${v.cliente_id}`);
  revalidatePath("/compromisos");
  revalidatePath("/");
}

export async function cambiarEstadoCompromiso(datos: FormData) {
  const v = z
    .object({
      id: z.uuid(),
      cliente_id: z.uuid(),
      estado: z.enum(ESTADOS_COMPROMISO),
    })
    .parse({
      id: campo(datos, "id"),
      cliente_id: campo(datos, "cliente_id"),
      estado: campo(datos, "estado"),
    });

  await sql(
    `update compromiso
     set estado = $2,
         cerrado_en = case when $2 in ('cumplido','cancelado') then now() else null end
     where id = $1`,
    [v.id, v.estado],
  );

  revalidatePath(`/clientes/${v.cliente_id}`);
  revalidatePath("/compromisos");
  revalidatePath("/");
}

// ---------------------------------------------------------------- contactos

export async function crearContacto(datos: FormData) {
  const v = z
    .object({
      cliente_id: z.uuid(),
      nombre: texto,
      rol: opcional,
      lado: z.enum(LADOS),
      email: opcional,
      notas: opcional,
    })
    .parse({
      cliente_id: campo(datos, "cliente_id"),
      nombre: campo(datos, "nombre"),
      rol: campo(datos, "rol"),
      lado: campo(datos, "lado") || "cliente",
      email: campo(datos, "email"),
      notas: campo(datos, "notas"),
    });

  await sql(
    `insert into contacto (cliente_id, nombre, rol, lado, email, notas)
     values ($1, $2, $3, $4, $5, $6)`,
    [v.cliente_id, v.nombre, v.rol, v.lado, v.email, v.notas],
  );

  revalidatePath(`/clientes/${v.cliente_id}`);
}

export async function borrarContacto(datos: FormData) {
  const id = z.uuid().parse(campo(datos, "id"));
  const clienteId = z.uuid().parse(campo(datos, "cliente_id"));
  await sql("delete from contacto where id = $1", [id]);
  revalidatePath(`/clientes/${clienteId}`);
}
