import { EN } from "./en";
import type { Idioma } from "../preferencias";

export type Traductor = (texto: string) => string;

/**
 * Devuelve el traductor del idioma pedido. En español es la identidad, y en
 * inglés cae de vuelta al original cuando falta una entrada: preferimos una
 * palabra en español a un hueco en la interfaz.
 */
export function crearTraductor(idioma: Idioma): Traductor {
  if (idioma === "es") return (texto) => texto;
  return (texto) => EN[texto] ?? texto;
}
