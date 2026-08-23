# Cuestionario de descubrimiento

Responde en línea (puedes contestar corto, o "no sé / decide tú").

## A. Contexto y alcance

1. ¿Eres el único usuario o alguien más (CTO, CEO, cuenta, soporte) va a leer/escribir?
2. ¿Teleperformance es el único cliente grande o hay varios clientes? ¿Cuántos proyectos vivos hoy, aprox.?
3. ¿Un "proyecto" = una campaña/caso de uso de voz (ej. "cobranzas TP Colombia")? ¿Un cliente puede tener varios?
4. ¿Existen sub-entidades: país, línea de negocio, campaña, bot/agente concreto? ¿Necesitas filtrar por ellas?
5. ¿Qué usas hoy para esto (Notion, Excel, Jira, Confluence, nada)? ¿Qué te frustra de ello?
6. ¿La plataforma reemplaza algo o convive? ¿Hay que migrar histórico?

## B. Ciclo de vida del proyecto

7. ¿Cuáles son las fases reales por las que pasa un proyecto? (ej. descubrimiento → diseño de flujo → desarrollo → QA → piloto → producción → escalado → mantenimiento)
8. ¿Qué tipos de fecha necesitas seguir? (go-live, piloto, entrega de guion, aprobación de cliente, revisión de scope, renovación de contrato, corte de facturación…)
9. ¿Las fechas se mueven con frecuencia? ¿Quieres historial de cambios de fecha ("esta salida se ha movido 3 veces")?
10. ¿Necesitas marcar quién es el responsable de cada hito (interno y del lado cliente)?
11. ¿Qué define "en riesgo"? (fecha a <X días sin avance, bloqueo abierto, dependencia del cliente…)

## C. Métricas y consumo

12. ¿De dónde salen hoy los datos de llamadas/minutos? (CSV que te pasan, panel de telefonía, base de datos propia, API del proveedor)
13. ¿Los cargas a mano o podemos integrarlo? ¿Con qué frecuencia: diaria, semanal, mensual?
14. ¿Qué métricas exactas importan? Candidatas: llamadas totales, llamadas contestadas, minutos, duración media (AHT), % contención/automatización, transferencias a humano, tasa de éxito de la intención, coste por minuto, coste por llamada, coste por modelo (STT/LLM/TTS), ASR error, latencia, CSAT.
15. ¿Necesitas comparar contra un plan/forecast comprometido con el cliente (ej. "vendimos 200k minutos/mes")?
16. ¿Umbrales de alerta? (ej. "avísame si el volumen cae >20% vs mes anterior" o "si consumo supera el 80% del bolsa contratada")
17. ¿Granularidad: mensual basta, o también diaria/semanal?
18. ¿Necesitas moneda y coste real, o solo volumen? ¿Márgenes?

## D. Stack técnico

19. ¿Qué campos quieres registrar del stack? (proveedor + modelo + versión + precio unitario + fecha desde/hasta, por STT, LLM, TTS, VAD, telefonía, SIP trunk, cloud/infra)
20. ¿Te importa el **historial** de cambios de stack ("el 12/03 pasamos de Deepgram a Whisper y el AHT bajó")? ¿Quieres correlacionarlo con métricas?
21. ¿El stack es por proyecto, por cliente, o hay un stack "de la empresa" con overrides?
22. ¿Quieres registrar también prompts/versiones de agente y su fecha de despliegue?

## E. Registro diario y Slack

23. ¿Qué quieres registrar "durante el día"? ¿Notas libres, incidencias, decisiones, cambios desplegados?
24. Slack: ¿workspace propio de VoicingAI? ¿Puedes instalar una app de Slack (permisos de admin)?
25. ¿Qué notificaciones quieres recibir y cuándo? Candidatas: resumen diario matutino, recordatorio de hitos a N días, alerta de caída de volumen, recordatorio "no registraste nada hoy", resumen semanal por cliente, cierre de mes.
26. ¿Registrar desde Slack cómo: slash command (`/pm nota TP ...`), modal con formulario, o simplemente escribir en un canal y que el LLM lo clasifique?
27. ¿Un canal único o un canal por cliente?
28. ¿Quieres que la plataforma **lea** canales existentes de Slack donde ya hablas con el cliente/equipo y extraiga eventos?

## F. Ingesta con LLM

29. Fuentes reales que quieres pegar/subir: transcripts de reunión (¿de qué herramienta: Meet, Zoom, Teams, Fireflies?), exports de WhatsApp, correos, actas, mensajes de Slack, PDFs de contrato.
30. ¿Quieres subida de audio con transcripción automática o solo texto ya transcrito?
31. ¿Qué debe extraer exactamente? Propuesta: fechas comprometidas, cambios de scope, decisiones, riesgos/bloqueos, acciones (con responsable y fecha), quejas/feedback, menciones a métricas, cambios técnicos.
32. ¿Extracción con confirmación humana antes de guardar, o auto-guardado con opción de corregir?
33. ¿Debe detectar automáticamente a qué cliente/proyecto pertenece el documento?
34. ¿Quieres poder preguntarle en lenguaje natural al histórico ("¿qué prometimos a TP sobre el reporte de octubre?")?
35. ¿Hay datos sensibles (PII de clientes finales, grabaciones)? ¿Restricciones legales sobre enviar eso a un LLM externo?

## G. Ideas de producto

36. ¿Qué campos quieres para una idea? (título, problema, hipótesis, cliente que lo pidió, esfuerzo, impacto, estado)
37. ¿Priorización con framework (RICE/ICE/valor-esfuerzo) o solo lista + estado?
38. ¿Las ideas conectan con clientes ("esto lo pidió TP 3 veces")? ¿Quieres contador de demanda?
39. ¿Necesitas convertir una idea en proyecto/iniciativa cuando se aprueba?

## H. Producto / técnico de la app

40. ¿Web app accesible desde móvil, app de escritorio, o algo local en tu máquina?
41. ¿Necesita estar en internet (hosting) o corre en tu portátil?
42. ¿Quién más debe poder entrar? ¿Login necesario?
43. Preferencia de stack: ¿te sirve Next.js + Supabase (Postgres, auth, cron)? Vi que tienes plugin de Supabase configurado.
44. ¿Presupuesto/tolerancia de coste mensual (hosting + LLM)?
45. ¿Qué tan rápido quieres un v1 usable? ¿Prefieres MVP en días o construcción completa?
46. ¿Idioma de la interfaz: español?
47. ¿Necesitas exportar a Excel/PDF para reportes a dirección o al cliente?

## I. Métricas de éxito de la propia plataforma

48. ¿Cómo sabrás que esto te sirve? (ej. "no vuelvo a llegar tarde a una fecha", "el reporte mensual me toma 10 min en vez de 3 h")
49. ¿Cuál sería el "una sola cosa" que si la app hace bien ya vale la pena?
