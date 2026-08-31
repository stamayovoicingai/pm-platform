/**
 * Escritor mínimo de ZIP, sin dependencias.
 *
 * Un ZIP es una secuencia de archivos, cada uno con su cabecera, y al final un
 * índice que dice en qué byte empieza cada uno. No hace falta una librería
 * para eso, y meter una para escribir cien líneas de cabeceras significaría
 * arrastrar sus actualizaciones de seguridad durante años.
 *
 * Todo se construye en memoria: el export completo son unos pocos megas y el
 * navegador necesita el `Content-Length` para mostrar el progreso de descarga.
 */
import { deflateRawSync } from "node:zlib";

export type EntradaZip = { ruta: string; datos: Buffer | string };

const TABLA_CRC = (() => {
  const tabla = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    tabla[i] = c >>> 0;
  }
  return tabla;
})();

function crc32(datos: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < datos.length; i++) {
    c = TABLA_CRC[(c ^ datos[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

/** La hora en formato MS-DOS, que es lo que guarda el ZIP desde 1989. */
function fechaDos(fecha: Date): { hora: number; dia: number } {
  return {
    hora:
      (fecha.getHours() << 11) |
      (fecha.getMinutes() << 5) |
      (Math.floor(fecha.getSeconds() / 2) & 0x1f),
    dia:
      ((fecha.getFullYear() - 1980) << 9) |
      ((fecha.getMonth() + 1) << 5) |
      fecha.getDate(),
  };
}

// Bit 11: los nombres van en UTF-8. Sin esto, un archivo llamado "Métricas"
// se abre con la tilde rota en Windows.
const BANDERA_UTF8 = 0x0800;
const METODO_DEFLATE = 8;
const METODO_CRUDO = 0;

export function crearZip(entradas: EntradaZip[], fecha = new Date()): Buffer {
  const { hora, dia } = fechaDos(fecha);
  const locales: Buffer[] = [];
  const central: Buffer[] = [];
  let desplazamiento = 0;

  for (const entrada of entradas) {
    const nombre = Buffer.from(entrada.ruta, "utf8");
    const crudos =
      typeof entrada.datos === "string"
        ? Buffer.from(entrada.datos, "utf8")
        : entrada.datos;

    const comprimidos = deflateRawSync(crudos, { level: 9 });
    // Si comprimir no ayuda (archivos ya comprimidos, textos diminutos), se
    // guarda tal cual: un ZIP más grande que su contenido es absurdo.
    const usarDeflate = comprimidos.length < crudos.length;
    const cuerpo = usarDeflate ? comprimidos : crudos;
    const metodo = usarDeflate ? METODO_DEFLATE : METODO_CRUDO;
    const crc = crc32(crudos);

    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4); // versión necesaria
    local.writeUInt16LE(BANDERA_UTF8, 6);
    local.writeUInt16LE(metodo, 8);
    local.writeUInt16LE(hora, 10);
    local.writeUInt16LE(dia, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(cuerpo.length, 18);
    local.writeUInt32LE(crudos.length, 22);
    local.writeUInt16LE(nombre.length, 26);
    local.writeUInt16LE(0, 28); // sin campo extra
    locales.push(local, nombre, cuerpo);

    const cabecera = Buffer.alloc(46);
    cabecera.writeUInt32LE(0x02014b50, 0);
    cabecera.writeUInt16LE(20, 4); // versión que lo creó
    cabecera.writeUInt16LE(20, 6); // versión necesaria
    cabecera.writeUInt16LE(BANDERA_UTF8, 8);
    cabecera.writeUInt16LE(metodo, 10);
    cabecera.writeUInt16LE(hora, 12);
    cabecera.writeUInt16LE(dia, 14);
    cabecera.writeUInt32LE(crc, 16);
    cabecera.writeUInt32LE(cuerpo.length, 20);
    cabecera.writeUInt32LE(crudos.length, 24);
    cabecera.writeUInt16LE(nombre.length, 28);
    cabecera.writeUInt16LE(0, 30); // extra
    cabecera.writeUInt16LE(0, 32); // comentario
    cabecera.writeUInt16LE(0, 34); // disco
    cabecera.writeUInt16LE(0, 36); // atributos internos
    cabecera.writeUInt32LE(0, 38); // atributos externos
    cabecera.writeUInt32LE(desplazamiento, 42);
    central.push(cabecera, nombre);

    desplazamiento += 30 + nombre.length + cuerpo.length;
  }

  const indice = Buffer.concat(central);
  const fin = Buffer.alloc(22);
  fin.writeUInt32LE(0x06054b50, 0);
  fin.writeUInt16LE(0, 4); // número de disco
  fin.writeUInt16LE(0, 6); // disco donde empieza el índice
  fin.writeUInt16LE(entradas.length, 8);
  fin.writeUInt16LE(entradas.length, 10);
  fin.writeUInt32LE(indice.length, 12);
  fin.writeUInt32LE(desplazamiento, 16);
  fin.writeUInt16LE(0, 20); // sin comentario

  return Buffer.concat([...locales, indice, fin]);
}
