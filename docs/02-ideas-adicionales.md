# Ideas adicionales — pensadas desde PM + PO

Marca las que te interesan (✅ / ❌ / 🤔 más adelante).

## Seguimiento y entrega

- **Timeline de deslizamiento de fechas**: cada vez que mueves un go-live queda registro con motivo.
  Al cabo de meses tienes datos duros: "el 70% de los retrasos son por aprobación del cliente".
- **Registro de cambios de scope** con impacto estimado (días, coste) y quién lo pidió. Es tu munición
  en la conversación comercial.
- **Vista "estado de cuentas"**: una fila por cliente con semáforo (fecha próxima, riesgo abierto,
  tendencia de volumen, última interacción). Es la pantalla que abres cada mañana.
- **Registro de dependencias del cliente**: cosas que esperas de ellos (grabaciones, accesos, aprobación
  de guion) con fecha de solicitud y días de espera acumulados.
- **Bitácora de decisiones (ADR de producto)**: qué se decidió, por qué, quién, y qué se descartó.

## Datos y operación

- **Correlación cambio ↔ métrica**: superponer despliegues y cambios de stack sobre la curva de
  volumen/AHT/contención para ver el efecto.
- **Detección de anomalías**: alerta cuando el volumen diario se sale de su rango habitual.
- **Salud del consumo vs contrato**: barra de "llevas 68% de la bolsa mensual el día 12" con proyección
  a fin de mes.
- **Coste por llamada desglosado por modelo** (STT/LLM/TTS/telefonía) y margen por proyecto.
- **Inventario de infraestructura**: SIP trunks, DIDs, números, capacidad de canales concurrentes,
  fechas de renovación de proveedores.

## Conocimiento y LLM

- **Preguntar al histórico** en lenguaje natural, con citas a la fuente (el transcript exacto).
- **Resumen automático semanal por cliente** listo para pegar en un correo o presentar.
- **Extracción de compromisos**: todo lo que prometiste en reuniones, con estado (cumplido/pendiente/vencido).
- **Detector de señales de riesgo de cuenta**: tono negativo repetido, quejas recurrentes, silencio prolongado.
- **Generador de acta**: subes el transcript y salen decisiones + acciones + fechas, listo para enviar.

## Producto y estrategia

- **Bloc de ideas con contador de demanda** (cuántos clientes lo han pedido y cuándo).
- **Registro de feedback etiquetado por tema**, alimentado desde reuniones y Slack.
- **Roadmap por outcome** (no por feature) con enlace a las ideas y a los clientes que lo empujan.
- **Post-mortem / retro de lanzamiento** con plantilla, para cada go-live.
- **Catálogo de casos de uso** reutilizables entre clientes ("cobranzas", "agendamiento", "encuesta")
  con lo aprendido en cada implementación.

## Personal / ritmo de trabajo

- **Check-in diario por Slack** a la hora que digas: "¿qué pasó hoy?" y respondes en el hilo.
- **Modo cierre de mes**: checklist automático de lo que hay que reportar por cliente.
- **Agenda de la semana**: hitos, reuniones y compromisos vencidos en una sola vista.
- **Diario de PM**: entradas libres con búsqueda semántica, para recordar por qué hiciste algo.
