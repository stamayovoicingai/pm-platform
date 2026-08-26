/**
 * Interpreta un bloque de texto tipo `Acme 1240 3720 71`.
 *
 * Es determinista a propósito: los números no pasan por el modelo. Un volumen
 * mal interpretado contamina las series y los deltas, y nadie se entera hasta
 * que se reporta algo falso.
 */
export type LineaMetrica = {
  clienteId: string;
  llamadas: string;
  minutos: string;
  contencion: string;
};

export type ResultadoParseo = {
  lineas: LineaMetrica[];
  reconocidos: string[];
  ignorados: string[];
};

function normalizar(texto: string) {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

export function interpretarBloque(
  texto: string,
  clientes: { id: string; nombre: string }[],
): ResultadoParseo {
  const lineas: LineaMetrica[] = [];
  const reconocidos: string[] = [];
  const ignorados: string[] = [];

  for (const cruda of texto.split("\n").map((l) => l.trim()).filter(Boolean)) {
    const partes = cruda.split(/[\s\t,;|]+/).filter(Boolean);
    const numeros: string[] = [];

    // Los números están al final; lo que queda delante es el nombre, que puede
    // llevar espacios.
    while (partes.length && /^-?\d+([.,]\d+)?%?$/.test(partes[partes.length - 1])) {
      numeros.unshift(partes.pop()!.replace("%", "").replace(",", "."));
    }

    const nombre = normalizar(partes.join(" "));
    if (!nombre || numeros.length === 0) {
      ignorados.push(cruda);
      continue;
    }

    const cliente = clientes.find((c) => {
      const n = normalizar(c.nombre);
      return n === nombre || n.startsWith(nombre) || nombre.startsWith(n);
    });

    if (!cliente) {
      ignorados.push(cruda);
      continue;
    }

    lineas.push({
      clienteId: cliente.id,
      llamadas: numeros[0] ?? "",
      minutos: numeros[1] ?? "",
      contencion: numeros[2] ?? "",
    });
    reconocidos.push(cliente.nombre);
  }

  return { lineas, reconocidos, ignorados };
}
