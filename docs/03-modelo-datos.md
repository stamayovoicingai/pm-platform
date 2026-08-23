# Modelo de datos — v1

Postgres. Nombres en español para que el dominio se lea igual que hablas tú.

## Jerarquía

```
Partner (Teleperformance)
 └── Cliente          ← la unidad de trabajo. Tiene fase propia.
      ├── Contacto
      ├── Hito         (+ historial de cambios de fecha)
      ├── Evento       (nota, incidencia, decisión, cambio de scope, riesgo…)
      ├── Compromiso   (lo que tiene fecha y responsable y se vence)
      ├── MetricaDia
      ├── ObjetivoMes  (volumen comprometido, para comparar)
      ├── StackItem    (histórico, con vigencia)
      ├── Bandera      (riesgo / oportunidad / creciendo)
      └── Documento    → Extraccion (propuestas del LLM)
```

## Tablas

### partner
`id`, `nombre`, `notas`

Hoy solo Teleperformance, pero la columna existe desde el día 1 para que el día que
entre otro partner no haya migración.

### cliente
`id`, `partner_id`, `nombre`, `fase`, `estado`, `owner_interno`, `descripcion`,
`fecha_alta`, `archivado`

`fase` ∈ `descubrimiento | desarrollo | qa | uat | produccion`
`estado` ∈ `activo | pausado | cerrado`

Regla: el cambio de `fase` genera automáticamente un Evento de tipo `cambio_fase`.
Así la fase también queda en el timeline y se puede correlacionar con métricas.

### contacto
`id`, `cliente_id`, `nombre`, `rol`, `lado`, `email`, `notas`

`lado` ∈ `interno | partner | cliente`

### hito
`id`, `cliente_id`, `tipo`, `fecha_objetivo`, `estado`, `responsable_id`, `notas`

`tipo` ∈ `go_live | piloto | entrega | aprobacion | facturacion | otro`
`estado` ∈ `pendiente | en_curso | cumplido | cancelado`

### hito_cambio_fecha
`id`, `hito_id`, `fecha_anterior`, `fecha_nueva`, `motivo`, `creado_en`

Nunca se sobreescribe una fecha en silencio. Cambiar `hito.fecha_objetivo` obliga a
escribir un motivo y deja fila aquí. Esto es lo que después te da:
"las salidas de TP se han movido en promedio 23 días, y el 70% por aprobación pendiente".

### evento
`id`, `cliente_id`, `tipo`, `titulo`, `cuerpo`, `fecha_evento`, `severidad`,
`origen`, `documento_id`, `creado_en`

`tipo` ∈ `nota | incidencia | decision | cambio_scope | riesgo | bloqueo | despliegue |
cambio_stack | cambio_fase | feedback`
`severidad` ∈ `info | media | alta`
`origen` ∈ `app | slack | llm`

Es el corazón del sistema. Todo lo que pasa en un cliente aterriza aquí y se pinta en
una línea de tiempo sobre la curva de métricas.

### compromiso
`id`, `cliente_id`, `descripcion`, `responsable_id`, `lado`, `fecha_limite`,
`estado`, `evento_origen_id`, `documento_id`

`estado` ∈ `pendiente | cumplido | vencido | cancelado`

Separado del evento a propósito: solo esto y los hitos disparan recordatorios. Si las
notas también alertaran, el canal se volvería ruido y dejarías de leerlo.

### metrica_dia
`id`, `cliente_id`, `fecha`, `llamadas_totales`, `duracion_total_min`,
`contencion_pct`, `sin_actividad`, `notas`

Solo 3 números por cliente y día. `duracion_promedio` y `volumen_promedio_llamadas`
son **derivados**, no se capturan:

- `duracion_promedio = duracion_total_min / llamadas_totales`
- `volumen_promedio_llamadas = SUM(llamadas) / días con actividad del periodo`

`sin_actividad` permite cerrar el día sin inventar ceros que ensucien los promedios.

### objetivo_mes
`id`, `cliente_id`, `periodo`, `llamadas_comprometidas`, `minutos_comprometidos`

Habilita la barra de avance y las comparaciones contra lo vendido.

### stack_item
`id`, `cliente_id`, `categoria`, `proveedor`, `modelo`, `version`,
`vigente_desde`, `vigente_hasta`, `notas`

`categoria` ∈ `stt | llm | tts | vad | telefonia | sip | infra | vector_db`

Histórico por vigencia: cerrar un item y abrir otro genera un Evento `cambio_stack`,
que aparece como marca vertical en las gráficas. Proveedor y modelo son selectores con
catálogo editable, no texto libre, para que los filtros funcionen.

### regla_bandera
`id`, `nombre`, `tipo`, `cliente_id`, `metrica`, `comparador`, `umbral`,
`ventana_dias`, `activa`

`tipo` ∈ `riesgo | oportunidad | creciendo`
`cliente_id` nulo = regla global aplicable a todos.

Tú defines las reglas. Ejemplos que vienen precargados y puedes editar o borrar:
- riesgo — llamadas caen >20% vs mes anterior
- riesgo — hito a menos de 7 días sin evento en los últimos 14
- riesgo — compromiso vencido abierto
- oportunidad — contención por debajo del 60%
- creciendo — llamadas suben >15% dos meses seguidos

### bandera
`id`, `cliente_id`, `regla_id`, `tipo`, `activa_desde`, `resuelta_en`, `contexto`

### documento
`id`, `cliente_id`, `tipo`, `titulo`, `fecha`, `texto_original`,
`texto_enmascarado`, `estado`

`tipo` ∈ `transcript_reunion | whatsapp | correo | acta | otro`
`estado` ∈ `pendiente | procesado | descartado`

El `texto_original` se queda en tu base. Al LLM viaja únicamente `texto_enmascarado`.

### mascara_pii
`id`, `documento_id`, `token`, `valor_cifrado`

Mapa de sustitución (`[PERSONA_1]`, `[TEL_1]`, `[DOC_1]`…) para poder mostrarte el texto
real en pantalla aunque el modelo nunca lo haya visto.

### extraccion
`id`, `documento_id`, `tipo`, `payload`, `confianza`, `estado`,
`entidad_creada_tipo`, `entidad_creada_id`

`tipo` ∈ `fecha_comprometida | cambio_scope | decision | riesgo | accion | feedback | metrica`
`estado` ∈ `propuesta | aceptada | rechazada | editada`

Nada del LLM entra al sistema sin que tú le des a aceptar. Cada propuesta lleva su
etiqueta de tipo, su nivel de confianza y la cita textual del fragmento que la originó.

## Índices que importan

- `evento (cliente_id, fecha_evento desc)` — la vista de timeline
- `metrica_dia (cliente_id, fecha)` único — impide duplicar el día
- `compromiso (estado, fecha_limite)` — el barrido diario de vencimientos
- `stack_item (cliente_id, categoria, vigente_desde desc)` — stack actual e histórico
