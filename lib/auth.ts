import "server-only";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { uno } from "./db";

const COOKIE = "pm_sesion";
const DURACION_DIAS = 30;

function clave() {
  const secreto = process.env.SESSION_SECRET;
  if (!secreto || secreto.length < 32) {
    throw new Error("SESSION_SECRET debe existir y tener al menos 32 caracteres");
  }
  return new TextEncoder().encode(secreto);
}

export type Sesion = { id: string; email: string; nombre: string };

export async function verificarCredenciales(
  email: string,
  password: string,
): Promise<Sesion | null> {
  const usuario = await uno<{
    id: string;
    email: string;
    nombre: string;
    password_hash: string;
  }>("select id, email, nombre, password_hash from usuario where email = $1", [
    email.trim().toLowerCase(),
  ]);

  if (!usuario) {
    // Coste constante para no filtrar qué emails existen.
    await bcrypt.compare(password, "$2b$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidinva");
    return null;
  }

  const correcta = await bcrypt.compare(password, usuario.password_hash);
  if (!correcta) return null;

  return { id: usuario.id, email: usuario.email, nombre: usuario.nombre };
}

export async function crearSesion(sesion: Sesion) {
  const token = await new SignJWT({ ...sesion })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${DURACION_DIAS}d`)
    .sign(clave());

  const tarro = await cookies();
  tarro.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: DURACION_DIAS * 24 * 60 * 60,
  });
}

export async function cerrarSesion() {
  const tarro = await cookies();
  tarro.delete(COOKIE);
}

export async function sesionActual(): Promise<Sesion | null> {
  const tarro = await cookies();
  const token = tarro.get(COOKIE)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, clave());
    return {
      id: String(payload.id),
      email: String(payload.email),
      nombre: String(payload.nombre),
    };
  } catch {
    return null;
  }
}
