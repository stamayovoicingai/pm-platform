/**
 * Reconoce una petición de ayuda. Puro y sin dependencias a propósito: es la
 * puerta que decide si un mensaje va al clasificador o no, y conviene poder
 * probarlo suelto.
 *
 * Solo coincide con el mensaje entero. "Sura EPS: necesito ayuda con el
 * whitelisting" es una nota que hay que registrar, no alguien preguntando cómo
 * funciona el bot.
 */
const FRASES = [
  "ayuda",
  "help",
  "pm ayuda",
  "que puedo hacer",
  "que puedes hacer",
  "como funciona",
  "comandos",
];

export function pideAyuda(texto: string): boolean {
  const limpio = texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[¿?¡!.,:;]/g, "")
    .trim();

  return FRASES.includes(limpio);
}
