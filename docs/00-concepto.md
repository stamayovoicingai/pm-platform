# PM Platform — Concepto

## 1. Problema

La información de producto vive dispersa: fechas de salida a producción, consumos por
cliente, incidencias, cambios de scope, stack de modelos e infraestructura. No hay un
lugar único donde consultar "¿cómo va el cliente X?" ni alertas basadas en las fechas
comprometidas.

## 2. Usuario

Un PM + PO de VoicingAI. Lectura eventual por dirección.

## 3. Contexto

Teleperformance es el partner principal y desarrolla los bots. Bajo TP hay varios
clientes finales, cada uno en su propia fase (descubrimiento, desarrollo, QA, UAT,
producción). Tres proyectos desarrollados hoy en codebase externo están listos para
migrar a la plataforma donde TP desarrolla de forma autónoma.

**La unidad de trabajo es el cliente**, no el partner ni la campaña.

## 4. Propuesta

Centralizar en una sola app:

- **Clientes** con fase, contactos y semáforo de estado.
- **Timeline de eventos** por cliente: la espina dorsal del sistema.
- **Hitos y compromisos** con recordatorios por Slack e historial de cambios de fecha.
- **Métricas diarias** con deltas mes a mes y comparación contra lo comprometido.
- **Stack histórico** por cliente, correlacionable con las métricas.
- **Ingesta con LLM** de transcripts, WhatsApp, correos y actas, con enmascarado de datos
  sensibles y revisión humana antes de guardar.
- **Slack bidireccional** en canal único: recibe alertas, registra desde ahí.

## 5. Los tres principios de diseño

1. **Todo es un evento fechado.** Incidencias, decisiones, despliegues, cambios de stack
   y cambios de fase cuelgan del mismo timeline. Eso permite superponerlos sobre las
   curvas de métricas y ver qué causó qué.
2. **Compromiso ≠ nota.** Solo los hitos y compromisos disparan alertas. Si todo alertara,
   el canal sería ruido y dejarías de leerlo.
3. **Registrar tiene que costar menos de 20 segundos.** Números por formulario, narrativa
   por texto libre clasificado por el LLM.

## 6. Documentos

- `01-preguntas.md` — cuestionario de descubrimiento (respondido)
- `02-ideas-adicionales.md` — funcionalidades candidatas
- `03-modelo-datos.md` — esquema de Postgres
- `04-alcance-v1.md` — alcance, diseño de Slack, pantallas y fases de construcción
