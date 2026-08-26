import "server-only";
import { cookies } from "next/headers";

export const TEMAS = ["sistema", "claro", "oscuro"] as const;
export type Tema = (typeof TEMAS)[number];

export const IDIOMAS = ["es", "en"] as const;
export type Idioma = (typeof IDIOMAS)[number];

const COOKIE_TEMA = "pm_tema";
const COOKIE_IDIOMA = "pm_idioma";
const UN_ANIO = 365 * 24 * 60 * 60;

/**
 * Las dos preferencias viven en cookie y no en localStorage porque el servidor
 * necesita conocerlas al renderizar: el idioma decide qué texto se envía, y el
 * tema evita el parpadeo blanco antes de que arranque el JavaScript.
 */
export async function leerTema(): Promise<Tema> {
  const valor = (await cookies()).get(COOKIE_TEMA)?.value;
  return TEMAS.includes(valor as Tema) ? (valor as Tema) : "sistema";
}

export async function leerIdioma(): Promise<Idioma> {
  const valor = (await cookies()).get(COOKIE_IDIOMA)?.value;
  return IDIOMAS.includes(valor as Idioma) ? (valor as Idioma) : "es";
}

export async function guardarTema(tema: Tema) {
  (await cookies()).set(COOKIE_TEMA, tema, {
    path: "/",
    maxAge: UN_ANIO,
    sameSite: "lax",
  });
}

export async function guardarIdioma(idioma: Idioma) {
  (await cookies()).set(COOKIE_IDIOMA, idioma, {
    path: "/",
    maxAge: UN_ANIO,
    sameSite: "lax",
  });
}

/** `sistema` no pone atributo: deja que mande prefers-color-scheme. */
export function atributoTema(tema: Tema): "light" | "dark" | undefined {
  if (tema === "claro") return "light";
  if (tema === "oscuro") return "dark";
  return undefined;
}
