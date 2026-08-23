/** Vocabulario del dominio: los enum de la base con su etiqueta y su color. */

export const FASES = [
  "descubrimiento",
  "desarrollo",
  "qa",
  "uat",
  "produccion",
] as const;
export type Fase = (typeof FASES)[number];

export const ETIQUETA_FASE: Record<Fase, string> = {
  descubrimiento: "Descubrimiento",
  desarrollo: "Desarrollo",
  qa: "QA",
  uat: "UAT",
  produccion: "Producción",
};

export const ESTADOS_CLIENTE = ["activo", "pausado", "cerrado"] as const;
export type EstadoCliente = (typeof ESTADOS_CLIENTE)[number];

export const ETIQUETA_ESTADO_CLIENTE: Record<EstadoCliente, string> = {
  activo: "Activo",
  pausado: "Pausado",
  cerrado: "Cerrado",
};

export const TIPOS_EVENTO = [
  "nota",
  "incidencia",
  "decision",
  "cambio_scope",
  "riesgo",
  "bloqueo",
  "despliegue",
  "cambio_stack",
  "cambio_fase",
  "feedback",
] as const;
export type TipoEvento = (typeof TIPOS_EVENTO)[number];

export const ETIQUETA_EVENTO: Record<TipoEvento, string> = {
  nota: "Nota",
  incidencia: "Incidencia",
  decision: "Decisión",
  cambio_scope: "Cambio de scope",
  riesgo: "Riesgo",
  bloqueo: "Bloqueo",
  despliegue: "Despliegue",
  cambio_stack: "Cambio de stack",
  cambio_fase: "Cambio de fase",
  feedback: "Feedback",
};

/** Tipos que el PM puede crear a mano. Los otros los genera el sistema. */
export const TIPOS_EVENTO_MANUAL: TipoEvento[] = [
  "nota",
  "incidencia",
  "decision",
  "cambio_scope",
  "riesgo",
  "bloqueo",
  "despliegue",
  "feedback",
];

export const SEVERIDADES = ["info", "media", "alta"] as const;
export type Severidad = (typeof SEVERIDADES)[number];

export const ETIQUETA_SEVERIDAD: Record<Severidad, string> = {
  info: "Info",
  media: "Media",
  alta: "Alta",
};

export const TIPOS_HITO = [
  "go_live",
  "piloto",
  "entrega",
  "aprobacion",
  "facturacion",
  "otro",
] as const;
export type TipoHito = (typeof TIPOS_HITO)[number];

export const ETIQUETA_HITO: Record<TipoHito, string> = {
  go_live: "Salida a producción",
  piloto: "Piloto",
  entrega: "Entrega",
  aprobacion: "Aprobación",
  facturacion: "Facturación",
  otro: "Otro",
};

export const ESTADOS_HITO = ["pendiente", "en_curso", "cumplido", "cancelado"] as const;
export type EstadoHito = (typeof ESTADOS_HITO)[number];

export const ETIQUETA_ESTADO_HITO: Record<EstadoHito, string> = {
  pendiente: "Pendiente",
  en_curso: "En curso",
  cumplido: "Cumplido",
  cancelado: "Cancelado",
};

export const ESTADOS_COMPROMISO = [
  "pendiente",
  "cumplido",
  "vencido",
  "cancelado",
] as const;
export type EstadoCompromiso = (typeof ESTADOS_COMPROMISO)[number];

export const ETIQUETA_ESTADO_COMPROMISO: Record<EstadoCompromiso, string> = {
  pendiente: "Pendiente",
  cumplido: "Cumplido",
  vencido: "Vencido",
  cancelado: "Cancelado",
};

export const LADOS = ["interno", "partner", "cliente"] as const;
export type Lado = (typeof LADOS)[number];

export const ETIQUETA_LADO: Record<Lado, string> = {
  interno: "Interno",
  partner: "Partner",
  cliente: "Cliente",
};

export const CATEGORIAS_STACK = [
  "stt",
  "llm",
  "tts",
  "vad",
  "telefonia",
  "sip",
  "infra",
  "vector_db",
] as const;
export type CategoriaStack = (typeof CATEGORIAS_STACK)[number];

export const ETIQUETA_STACK: Record<CategoriaStack, string> = {
  stt: "STT",
  llm: "LLM",
  tts: "TTS",
  vad: "VAD",
  telefonia: "Telefonía",
  sip: "SIP",
  infra: "Infraestructura",
  vector_db: "Base vectorial",
};

/** Color de la pastilla según el tipo de evento. */
export function colorEvento(tipo: TipoEvento): { fondo: string; texto: string } {
  switch (tipo) {
    case "incidencia":
    case "bloqueo":
    case "riesgo":
      return { fondo: "var(--riesgo-suave)", texto: "var(--riesgo)" };
    case "cambio_scope":
    case "feedback":
      return { fondo: "var(--oportunidad-suave)", texto: "var(--oportunidad)" };
    case "despliegue":
    case "decision":
    case "cambio_fase":
    case "cambio_stack":
      return { fondo: "var(--acento-suave)", texto: "var(--acento)" };
    default:
      return { fondo: "var(--superficie-2)", texto: "var(--texto-2)" };
  }
}
