import "server-only";
import { pedirJson, proveedorActivo, modeloEnUso } from "../llm";

export type Comprobacion = {
  nombre: string;
  estado: "ok" | "fallo" | "aviso" | "sin_probar";
  detalle: string;
};

async function llamarConCabeceras(metodo: string, cuerpo: unknown) {
  const respuesta = await fetch(`https://slack.com/api/${metodo}`, {
    method: "POST",
    headers: {
      "content-type": "application/json; charset=utf-8",
      authorization: `Bearer ${process.env.SLACK_BOT_TOKEN}`,
    },
    body: JSON.stringify(cuerpo),
  });

  return {
    datos: (await respuesta.json()) as Record<string, unknown>,
    // Slack devuelve en esta cabecera los permisos realmente concedidos, que no
    // siempre coinciden con los que pide el manifiesto: añadir un scope no lo
    // concede hasta reinstalar la app.
    scopes: (respuesta.headers.get("x-oauth-scopes") ?? "").split(",").filter(Boolean),
  };
}

const SCOPES_NECESARIOS = ["chat:write"];

export async function diagnosticarSlack(): Promise<Comprobacion[]> {
  const salida: Comprobacion[] = [];
  const canal = process.env.SLACK_CANAL;

  if (!process.env.SLACK_BOT_TOKEN) {
    return [
      { nombre: "Bot token", estado: "fallo", detalle: "Falta SLACK_BOT_TOKEN" },
    ];
  }

  let scopes: string[] = [];

  try {
    const { datos, scopes: concedidos } = await llamarConCabeceras("auth.test", {});
    scopes = concedidos;

    if (datos.ok) {
      salida.push({
        nombre: "Token",
        estado: "ok",
        detalle: `Válido · workspace ${datos.team} · bot ${datos.user} (${datos.user_id})`,
      });
    } else {
      salida.push({
        nombre: "Token",
        estado: "fallo",
        detalle: `Slack lo rechaza: ${datos.error}`,
      });
      return salida;
    }
  } catch (error) {
    salida.push({
      nombre: "Token",
      estado: "fallo",
      detalle: error instanceof Error ? error.message : "No se pudo llamar a Slack",
    });
    return salida;
  }

  const historial = scopes.filter((s) => s.endsWith(":history"));
  salida.push({
    nombre: "Permisos concedidos",
    estado:
      SCOPES_NECESARIOS.every((s) => scopes.includes(s)) && historial.length > 0
        ? "ok"
        : "fallo",
    detalle:
      scopes.join(", ") +
      (historial.length === 0
        ? " — falta un scope :history. Añádelo y REINSTALA la app: los scopes nuevos no se conceden a una instalación existente."
        : ""),
  });

  if (!canal) {
    salida.push({ nombre: "Canal", estado: "fallo", detalle: "Falta SLACK_CANAL" });
    return salida;
  }

  // Se usa conversations.history y no conversations.info a propósito: info exige
  // channels:read, que no hace falta para nada más. history usa channels:history,
  // que es justo el permiso del que depende recibir los mensajes — si funciona,
  // el bot puede leer el canal y está dentro.
  try {
    const { datos } = await llamarConCabeceras("conversations.history", {
      channel: canal,
      limit: 1,
    });

    if (datos.ok) {
      salida.push({
        nombre: "Lectura del canal",
        estado: "ok",
        detalle:
          "El bot puede leer el canal: está dentro y tiene el permiso. " +
          "Si aun así no recibes mensajes, el fallo está en Event Subscriptions.",
      });
    } else {
      const error = String(datos.error);
      const explicacion: Record<string, string> = {
        not_in_channel: "El bot no está en el canal. Escribe /invite @PM Platform",
        channel_not_found:
          "El ID no existe o el canal es privado y el bot no está invitado. " +
          "Con canal privado hacen falta groups:history y el evento message.groups.",
        missing_scope: "Falta channels:history. Añádelo y REINSTALA la app.",
      };
      salida.push({
        nombre: "Lectura del canal",
        estado: "fallo",
        detalle: `Slack responde ${error}. ${explicacion[error] ?? ""}`,
      });
    }
  } catch (error) {
    salida.push({
      nombre: "Lectura del canal",
      estado: "fallo",
      detalle: error instanceof Error ? error.message : "Error consultando el canal",
    });
  }

  salida.push({
    nombre: "Event Subscriptions",
    estado: "sin_probar",
    detalle:
      "Esto no se puede comprobar desde aquí. En api.slack.com → Event Subscriptions: " +
      "la URL debe decir Verified, la sección 'Subscribe to bot events' debe contener " +
      "message.channels, y hay que pulsar Save Changes abajo del todo.",
  });

  return salida;
}

/** Llamada real al modelo, para separar "no llega" de "llega y falla al clasificar". */
export async function diagnosticarIA(): Promise<Comprobacion> {
  if (proveedorActivo() === "ninguno") {
    return { nombre: "IA", estado: "aviso", detalle: "Sin proveedor configurado" };
  }

  try {
    const respuesta = await pedirJson(
      'Devuelves exclusivamente un array JSON de strings.',
      'Traduce al inglés: ["prueba de conexión"]',
      200,
    );
    return {
      nombre: `IA (${proveedorActivo()})`,
      estado: "ok",
      detalle: `Modelo ${modeloEnUso()} · responde: ${respuesta.slice(0, 100)}`,
    };
  } catch (error) {
    return {
      nombre: `IA (${proveedorActivo()})`,
      estado: "fallo",
      detalle:
        `Modelo ${modeloEnUso()} · ` +
        (error instanceof Error ? error.message.slice(0, 400) : "Error"),
    };
  }
}
