/**
 * Datos iniciales: usuario, partner, reglas de bandera por defecto y catálogo de stack.
 * Es idempotente — se puede correr varias veces sin duplicar nada.
 */
import { Pool } from "pg";
import bcrypt from "bcryptjs";

const REGLAS_POR_DEFECTO = [
  {
    nombre: "Caída de volumen >20% vs mes anterior",
    tipo: "riesgo",
    metrica: "llamadas_delta_pct",
    comparador: "<=",
    umbral: -20,
    ventana_dias: 30,
  },
  {
    nombre: "Hito próximo sin actividad reciente",
    tipo: "riesgo",
    metrica: "dias_sin_evento_con_hito_cercano",
    comparador: ">=",
    umbral: 14,
    ventana_dias: 14,
  },
  {
    nombre: "Compromiso vencido abierto",
    tipo: "riesgo",
    metrica: "compromisos_vencidos",
    comparador: ">=",
    umbral: 1,
    ventana_dias: 1,
  },
  {
    nombre: "Contención por debajo del 60%",
    tipo: "oportunidad",
    metrica: "contencion_pct",
    comparador: "<",
    umbral: 60,
    ventana_dias: 30,
  },
  {
    nombre: "Volumen creciendo >15% vs mes anterior",
    tipo: "creciendo",
    metrica: "llamadas_delta_pct",
    comparador: ">=",
    umbral: 15,
    ventana_dias: 30,
  },
];

const CATALOGO = [
  ["stt", "Deepgram", "nova-3"],
  ["stt", "OpenAI", "whisper-large-v3"],
  ["stt", "AssemblyAI", "universal"],
  ["stt", "Google", "chirp-2"],
  ["stt", "Azure", "speech-to-text"],
  ["llm", "Anthropic", "claude-opus-5"],
  ["llm", "Anthropic", "claude-sonnet-5"],
  ["llm", "Anthropic", "claude-haiku-4-5"],
  ["llm", "OpenAI", "gpt-4o"],
  ["llm", "Google", "gemini-2.5-flash"],
  ["tts", "ElevenLabs", "flash-v2-5"],
  ["tts", "Cartesia", "sonic-2"],
  ["tts", "Azure", "neural"],
  ["tts", "Google", "chirp-3-hd"],
  ["vad", "Silero", "v5"],
  ["vad", "LiveKit", "turn-detector"],
  ["telefonia", "Twilio", null],
  ["telefonia", "Telnyx", null],
  ["telefonia", "Vonage", null],
  ["sip", "Asterisk", null],
  ["sip", "FreeSWITCH", null],
  ["sip", "Kamailio", null],
  ["infra", "AWS", null],
  ["infra", "GCP", null],
  ["infra", "Hetzner", null],
  ["infra", "Easypanel", null],
  ["vector_db", "pgvector", null],
  ["vector_db", "Qdrant", null],
] as const;

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("Falta DATABASE_URL");
    process.exit(1);
  }

  const email = process.env.PM_EMAIL;
  const password = process.env.PM_PASSWORD;
  const nombre = process.env.PM_NOMBRE ?? "PM";

  if (!email || !password) {
    console.error("Falta PM_EMAIL o PM_PASSWORD para crear el usuario inicial.");
    process.exit(1);
  }

  const pool = new Pool({
    connectionString,
    ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : undefined,
  });

  const hash = await bcrypt.hash(password, 12);
  await pool.query(
    `insert into usuario (email, nombre, password_hash)
     values ($1, $2, $3)
     on conflict (email) do update set password_hash = excluded.password_hash,
                                       nombre = excluded.nombre`,
    [email.toLowerCase(), nombre, hash],
  );
  console.log(`✓ usuario ${email}`);

  await pool.query(
    `insert into partner (nombre) values ('Teleperformance') on conflict (nombre) do nothing`,
  );
  console.log("✓ partner Teleperformance");

  for (const regla of REGLAS_POR_DEFECTO) {
    const existe = await pool.query("select 1 from regla_bandera where nombre = $1", [
      regla.nombre,
    ]);
    if (existe.rowCount) continue;
    await pool.query(
      `insert into regla_bandera (nombre, tipo, metrica, comparador, umbral, ventana_dias)
       values ($1, $2, $3, $4, $5, $6)`,
      [
        regla.nombre,
        regla.tipo,
        regla.metrica,
        regla.comparador,
        regla.umbral,
        regla.ventana_dias,
      ],
    );
  }
  console.log(`✓ ${REGLAS_POR_DEFECTO.length} reglas de bandera`);

  for (const [categoria, proveedor, modelo] of CATALOGO) {
    await pool.query(
      `insert into catalogo_stack (categoria, proveedor, modelo)
       values ($1, $2, $3) on conflict do nothing`,
      [categoria, proveedor, modelo],
    );
  }
  console.log(`✓ ${CATALOGO.length} entradas de catálogo de stack`);

  await pool.query(
    `insert into ajuste (clave, valor) values
       ('notificaciones', '{"hora_metricas":"19:00","hora_general":"09:00","antelacion_hitos_dias":3,"zona_horaria":"America/Bogota"}'::jsonb)
     on conflict (clave) do nothing`,
  );
  console.log("✓ ajustes por defecto");

  await pool.end();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
