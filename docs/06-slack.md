# Slack

## Qué hace

**Avisos que salen solos**

| Cuándo | Qué |
|---|---|
| 19:00 | Qué clientes faltan por registrar, con botón para hacerlo desde Slack |
| 09:00 | Hitos a 3 días, compromisos vencidos y por vencer, asuntos abiertos graves |
| 21:30 | Aviso solo si no registraste nada en todo el día |
| Lunes 09:00 | Una línea por cliente con el movimiento de la semana |
| Día 1, 09:00 | Cierre de mes: días registrados y objetivos que faltan |

Las horas salen de la tabla `ajuste`, clave `notificaciones`. Cambiarlas ahí las cambia
sin desplegar.

**Registro desde el canal**

Escribes en el canal como se lo contarías a alguien:

> TP Acme: se cayó el SIP 20 min, cliente molesto, piden postmortem el viernes

El bot responde en el hilo con lo que entendió —cliente, tipo, severidad, si hay que
seguirlo y si alguien quedó en hacer algo— y dos botones: Guardar o Descartar. Nada entra
sin que lo confirmes.

Si no identifica el cliente, lo dice y no deja guardar: un registro sin cliente no sirve
para nada.

**Registro de métricas**

El botón del aviso de las 19:00 abre un formulario con una línea por cliente pendiente.
Se escribe `nombre llamadas minutos contención`. Es el mismo parser determinista que el
pegado de la web — los números no pasan por el modelo.

## Puesta en marcha

1. **api.slack.com/apps** → Create New App → **From a manifest** → pega
   `docs/slack-manifest.yaml`.
2. Instala la app en el workspace e invítala al canal (`/invite @PM Platform`).
3. Copia el **Bot User OAuth Token** (`xoxb-…`) y el **Signing Secret**.
4. Copia el ID del canal: clic derecho sobre el canal → Ver detalles → abajo del todo.
5. En Easypanel, añade:

```
SLACK_BOT_TOKEN=xoxb-...
SLACK_SIGNING_SECRET=...
SLACK_CANAL=C01234567
APP_URL=https://n8n-pm-app.hr3und.easypanel.host
```

6. Despliega.

Sin esas variables la app funciona igual, simplemente no manda ni recibe nada.

## Decisiones

**Los envíos se reclaman en la base antes de mandarse.** El programador vive dentro del
contenedor, así que un reinicio a las 19:01 volvería a disparar el aviso de las 19:00.
La clave `(clave, fecha)` de `envio_slack` hace que solo quien consigue insertar la fila
mande el mensaje. Si el envío falla, la fila se borra para reintentar al minuto
siguiente: un fallo de red no debería costar el aviso del día entero.

**Se responde a Slack antes de clasificar.** Slack reintenta si no contesta en tres
segundos y el modelo tarda más. Se devuelve 200 de inmediato y el trabajo sigue en
segundo plano, que es posible porque el servidor es un proceso vivo.

**Las respuestas en hilo se ignoran.** Sin eso, el bot se contestaría a sí mismo en bucle.

**La firma se comprueba siempre**, con ventana de cinco minutos. Sin esa ventana, una
petición interceptada valdría para siempre.
