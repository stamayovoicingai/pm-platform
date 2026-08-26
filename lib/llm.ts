import "server-only";

/**
 * Una sola puerta de salida hacia el modelo, con dos adaptadores.
 *
 * El proveedor se elige por variable de entorno y no por código: cambiar de
 * Gemini a Claude es cambiar una clave en Easypanel, sin tocar nada más.
 */
export type Proveedor = "gemini" | "claude" | "ninguno";

export function proveedorActivo(): Proveedor {
  if (process.env.GEMINI_API_KEY) return "gemini";
  if (process.env.ANTHROPIC_API_KEY) return "claude";
  return "ninguno";
}

const MODELO_GEMINI = process.env.GEMINI_MODELO ?? "gemini-3.6-flash";
const MODELO_CLAUDE = process.env.ANTHROPIC_MODELO ?? "claude-opus-5";

/** El modelo que se usaría ahora mismo, para poder verlo en el diagnóstico. */
export function modeloEnUso(): string {
  return proveedorActivo() === "gemini" ? MODELO_GEMINI : MODELO_CLAUDE;
}

/**
 * Pide al modelo una respuesta en JSON. Devuelve el texto crudo; interpretarlo
 * es cosa de quien llama, que es quien sabe qué forma espera.
 */
export async function pedirJson(
  instrucciones: string,
  mensaje: string,
  maxTokens = 8000,
): Promise<string> {
  switch (proveedorActivo()) {
    case "gemini":
      return pedirAGemini(instrucciones, mensaje, maxTokens);
    case "claude":
      return pedirAClaude(instrucciones, mensaje, maxTokens);
    default:
      throw new Error(
        "No hay proveedor de IA configurado. Define GEMINI_API_KEY o ANTHROPIC_API_KEY.",
      );
  }
}

/** Igual que `pedirJson`, pero para respuestas en prosa. */
export async function pedirTexto(
  instrucciones: string,
  mensaje: string,
  maxTokens = 2000,
): Promise<string> {
  switch (proveedorActivo()) {
    case "gemini":
      return pedirAGemini(instrucciones, mensaje, maxTokens, false);
    case "claude":
      return pedirAClaude(instrucciones, mensaje, maxTokens);
    default:
      throw new Error("No hay proveedor de IA configurado.");
  }
}

async function pedirAGemini(
  instrucciones: string,
  mensaje: string,
  maxTokens: number,
  json = true,
): Promise<string> {
  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/${MODELO_GEMINI}:generateContent`;

  const respuesta = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-goog-api-key": process.env.GEMINI_API_KEY!,
    },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: instrucciones }] },
      contents: [{ role: "user", parts: [{ text: mensaje }] }],
      generationConfig: {
        temperature: 0,
        maxOutputTokens: maxTokens,
        ...(json ? { responseMimeType: "application/json" } : {}),
      },
    }),
  });

  if (!respuesta.ok) {
    throw new Error(`Gemini devolvió ${respuesta.status}: ${await respuesta.text()}`);
  }

  const datos = (await respuesta.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };

  const texto = datos.candidates?.[0]?.content?.parts
    ?.map((p) => p.text ?? "")
    .join("")
    .trim();

  if (!texto) throw new Error("Gemini devolvió una respuesta vacía");
  return texto;
}

async function pedirAClaude(
  instrucciones: string,
  mensaje: string,
  maxTokens: number,
): Promise<string> {
  const { default: Anthropic } = await import("@anthropic-ai/sdk");
  const cliente = new Anthropic();

  const respuesta = await cliente.messages.create({
    model: MODELO_CLAUDE,
    max_tokens: maxTokens,
    output_config: { effort: "low" },
    system: instrucciones,
    messages: [{ role: "user", content: mensaje }],
  });

  return respuesta.content
    .filter((bloque) => bloque.type === "text")
    .map((bloque) => bloque.text)
    .join("")
    .trim();
}
