# Alcance v1 y plan de construcción

## La apuesta

Dijiste que si la app hiciera una sola cosa bien, sería **el registro de cosas**.
Todo el diseño se subordina a eso: si registrar cuesta más de 20 segundos, dejas de
hacerlo a las tres semanas y la plataforma se muere. Cada decisión de abajo está tomada
para bajar esa fricción.

## Stack

| Pieza | Elección |
|---|---|
| App | Next.js (UI + API + jobs en un contenedor) |
| Repo | GitHub, Easypanel construye desde ahí |
| BD | Postgres en Easypanel |
| Auth | Login simple con sesión; responsive para móvil |
| Notificaciones | Slack app (bot + slash command + modales + interactividad) |
| LLM | `claude-opus-5` vía API key en variable de entorno, solo sobre texto enmascarado |
| Cron | Jobs internos del contenedor |
| Export | PDF de reporte mensual por cliente |

## Parámetros confirmados

| Parámetro | Valor |
|---|---|
| Clientes bajo TP | ~6 |
| Fases | descubrimiento · desarrollo · qa · uat · producción |
| Métricas capturadas | llamadas, minutos, % contención (diario) |
| Recordatorio de registro de métricas | 19:00 |
| Resto de notificaciones | 09:00 |
| Antelación de aviso de hitos | 3 días |
| Identificación de cliente | nombre legal completo |
| Canal Slack | único |
| Enmascarado PII | nombres, teléfonos, documentos, emails, direcciones, números de cuenta |

## Diseño de la captura en Slack

Regla: **los números por formulario, la narrativa por texto libre.**

### Métricas → modal estructurado
A las 19:00 el bot manda un mensaje al canal con un botón *Registrar día*. Abre un modal
con una fila por cliente en fase producción y tres campos: llamadas, minutos, contención.
Con ~6 clientes son 18 números; con el pegado de bloque, menos de un minuto.

Anti-fricción:
- Solo aparecen los clientes en `produccion`. Los que están en desarrollo no piden números.
- Botón *sin actividad* por cliente, que no ensucia los promedios.
- Se puede pegar un bloque de texto (`acme 120 340 78`) y se parsea a los campos.
- Si te saltas un día, la app te lo recuerda y hay vista de relleno retroactivo.

Por qué no texto libre aquí: un número mal interpretado por el LLM contamina las series
y los deltas mes a mes, y no te enteras hasta que reportas algo falso.

### Eventos y notas → texto libre en el canal
Escribes `TP Acme: se cayó el SIP 20 min, cliente molesto, piden postmortem el viernes`.
El bot responde en el hilo con lo que entendió, ya clasificado y etiquetado:

> **Cliente:** Acme · **Tipo:** incidencia · severidad alta
> **Compromiso detectado:** postmortem — vence viernes 29
> [Guardar] [Editar] [Descartar]

Por qué sí texto libre aquí: es la diferencia entre registrar y no registrar. Una nota
que exige elegir cliente, tipo y severidad en tres desplegables no se escribe nunca desde
el móvil en mitad de una reunión.

### Notificaciones que envía el bot
- Recordatorio diario de registro (hora configurable)
- Hitos a N días (N configurable por tipo de hito)
- Compromisos que vencen mañana y compromisos vencidos
- Bandera nueva (riesgo / oportunidad / creciendo) cuando dispara una regla tuya
- Resumen semanal por cliente
- Checklist de cierre de mes
- Aviso si no registraste nada en el día

Canal único, como pediste. Cada mensaje lleva el cliente en negrita al principio para
que se escanee rápido.

## Pantallas

1. **Hoy** — la que abres cada mañana. Banderas activas, hitos de la semana,
   compromisos vencidos, clientes sin registro reciente.
2. **Clientes** — tabla con fase, semáforo de banderas, llamadas del mes, delta % vs mes
   anterior, próximo hito. Filtrable por fase y por bandera.
3. **Ficha de cliente** — pestañas: Timeline · Métricas · Hitos · Stack · Contactos · Documentos.
   La de Métricas superpone los eventos (despliegues, cambios de stack, incidencias) sobre
   la curva, que es donde está el valor real.
4. **Ingesta** — pegas el texto, eliges cliente, revisas las propuestas del LLM una a una,
   aceptas o editas.
5. **Preguntar** — búsqueda en lenguaje natural sobre el histórico, con cita a la fuente.
6. **Reglas** — el editor de tus disparadores de bandera.
7. **Ajustes** — catálogos de proveedores/modelos, horarios de notificación, export.

## Fases de construcción

**Fase 1 — Registrar** (lo que dijiste que más importa)
Clientes, fases, eventos, compromisos, hitos con historial de fecha. Slack: recordatorio
diario, captura por texto libre con clasificación, alertas de hito y compromiso.
Al terminar esta fase ya lo usas a diario.

**Fase 2 — Medir**
Métricas diarias, modal de Slack, objetivos mensuales, deltas, gráficas con eventos
superpuestos, reglas de bandera, dashboard filtrable.

**Fase 3 — Entender**
Ingesta de transcripts con enmascarado de PII, extracción con revisión humana, preguntas
al histórico, resumen semanal, export a PDF.

**Fase 4 — Stack**
Histórico de componentes con vigencia y correlación con métricas.

## Pausado

- Bloc de ideas de producto y contador de demanda (tú lo aplazaste)
- Versionado de prompts
- Lectura automática de canales de Slack
- Costes y márgenes

## Sobre automatizar la carga de métricas

Hoy los datos viven en dos sitios: 3 clientes en Grafana (hay service account) y 3 en la
plataforma de TP (parece haber API). Pero los 3 de Grafana van a migrar a la plataforma
de TP.

Por eso **no conviene construir la integración con Grafana**: es trabajo que se tira a la
basura cuando migren. El camino que sale a cuenta es uno solo, cuando los 6 estén en el
mismo sitio: una integración contra la API de la plataforma de TP que rellene
`metrica_dia` de forma automática, dejando la captura manual como respaldo y como forma
de corregir.

Mientras tanto, manual para los 6. Son 18 números al día y funciona igual para todos, sin
mantener dos caminos distintos.

## Antes de meter datos reales

Configurar backups automáticos del Postgres en Easypanel. Un contenedor sin backup es
una pérdida de datos esperando su turno.
