import "server-only";
import { sql, uno } from "../db";
import { slackConfigurado } from "./cliente";
import { ZONA } from "../fechas";
import {
  avisoGeneral,
  avisoMetricas,
  avisoSinRegistro,
  resumenSemanal,
  cierreDeMes,
} from "./avisos";

type Ajustes = {
  hora_metricas: string;
  hora_general: string;
  hora_cierre_dia: string;
};

const POR_DEFECTO: Ajustes = {
  hora_metricas: "19:00",
  hora_general: "09:00",
  hora_cierre_dia: "21:30",
};

function ahoraLocal() {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: ZONA,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    weekday: "short",
    hour12: false,
  }).formatToParts(new Date());

  const buscar = (tipo: string) => partes.find((p) => p.type === tipo)?.value ?? "";
  const fecha = `${buscar("year")}-${buscar("month")}-${buscar("day")}`;
  const minutos = Number(buscar("hour")) * 60 + Number(buscar("minute"));
  const diaSemana = buscar("weekday");
  const diaMes = Number(buscar("day"));

  return { fecha, minutos, diaSemana, diaMes };
}

function aMinutos(hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

/**
 * Reclama el envío del día. Devuelve true solo a quien consigue insertar la
 * fila, así que aunque el contenedor reinicie diez veces después de la hora,
 * el mensaje sale una vez.
 */
async function reclamar(clave: string, fecha: string): Promise<boolean> {
  const fila = await uno<{ clave: string }>(
    `insert into envio_slack (clave, fecha) values ($1, $2)
     on conflict (clave, fecha) do nothing
     returning clave`,
    [clave, fecha],
  );
  return fila !== null;
}

async function leerAjustes(): Promise<Ajustes> {
  try {
    const fila = await uno<{ valor: Ajustes }>(
      "select valor from ajuste where clave = 'notificaciones'",
    );
    return { ...POR_DEFECTO, ...(fila?.valor ?? {}) };
  } catch {
    return POR_DEFECTO;
  }
}

async function ejecutar(clave: string, fecha: string, tarea: () => Promise<void>) {
  if (!(await reclamar(clave, fecha))) return;
  try {
    await tarea();
  } catch (error) {
    // Se libera la reclamación para reintentar en el siguiente minuto: un fallo
    // de red no debería costar el aviso del día entero.
    await sql("delete from envio_slack where clave = $1 and fecha = $2", [clave, fecha]);
    console.error(`Aviso de Slack "${clave}" falló:`, error);
  }
}

async function tick() {
  if (!slackConfigurado()) return;

  const { fecha, minutos, diaSemana, diaMes } = ahoraLocal();
  const ajustes = await leerAjustes();

  const general = aMinutos(ajustes.hora_general);
  const metricas = aMinutos(ajustes.hora_metricas);
  const cierre = aMinutos(ajustes.hora_cierre_dia);

  if (minutos >= general) {
    await ejecutar("general", fecha, avisoGeneral);
    if (diaSemana === "Mon") await ejecutar("semanal", fecha, resumenSemanal);
    if (diaMes === 1) await ejecutar("cierre_mes", fecha, cierreDeMes);
  }

  if (minutos >= metricas) await ejecutar("metricas", fecha, avisoMetricas);
  if (minutos >= cierre) await ejecutar("sin_registro", fecha, avisoSinRegistro);
}

let arrancado = false;

/** Arranca el bucle. Idempotente: en desarrollo el módulo se recarga a menudo. */
export function arrancarProgramador() {
  if (arrancado) return;
  arrancado = true;

  const bucle = async () => {
    try {
      await tick();
    } catch (error) {
      console.error("Programador de Slack:", error);
    }
  };

  setInterval(bucle, 60_000);
  void bucle();
  console.log("Programador de Slack en marcha");
}
