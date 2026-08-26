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

## Ayuda dentro del propio canal

Escribe **`ayuda`** en el canal y el bot explica todo: cómo registrar, cómo funcionan los
botones, el formato del registro diario, qué avisos manda y a qué hora, y la lista de
clientes que reconoce. También responde a `help`, `qué puedo hacer` o `cómo funciona`.

Solo se activa si el mensaje es exactamente eso. *"Sura EPS: necesito ayuda con el
whitelisting"* es una nota que hay que registrar, no alguien preguntando cómo funciona.

Desde la app, en **Diagnóstico**, hay un botón para publicar la guía en el canal.

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

## Si el bot no responde

Lo primero, el diagnóstico. Abre en el navegador, con sesión iniciada:

```
https://n8n-pm-app.hr3und.easypanel.host/api/slack/eventos
```

Devuelve qué variables están puestas (sin revelarlas), el canal, y qué proveedor de IA
está activo. Si algo sale en `false` o `null`, ahí está el problema.

Si todo está puesto y aun así no responde, en los logs del contenedor:

| Lo que ves | Qué significa |
|---|---|
| `Slack: mensaje recibido …` | Llega bien; el fallo está más adelante |
| `Slack: petición rechazada por firma inválida` | El Signing Secret no es el correcto |
| `Clasificación fallida:` | El modelo devolvió error — mira el motivo |
| Nada en absoluto | Slack no está llamando al endpoint |

Cuando no aparece nada, el problema está del lado de Slack y suele ser una de estas
cuatro, por orden de frecuencia:

1. **Event Subscriptions sin verificar.** En la app de Slack, esa sección debe mostrar
   *Verified* en verde junto a la Request URL. Si la app se creó antes de desplegar, la
   verificación falló y quedó desactivada. Pulsa *Retry* o vuelve a guardar la URL.
2. **El bot no está en el canal.** Escribe `/invite @PM Platform` en el canal.
3. **Falta el scope `channels:history`**, o se añadió después de instalar. Cualquier
   cambio de scopes exige reinstalar la app en el workspace.
4. **El canal es privado.** Entonces hacen falta `groups:history` y el evento
   `message.groups` en lugar de los de canales públicos.
