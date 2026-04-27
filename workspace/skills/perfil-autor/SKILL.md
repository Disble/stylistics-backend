---
name: perfil-autor
description: >
  Fuente única de verdad para perfiles de corrección de autores.
  Arquitectura operativa inspirada en Observational Memory: Síntesis de Observaciones
  y Observaciones compactas por familias.
  El corrector lee solo la Síntesis de Observaciones; el Profile Agent ejecuta la actualización completa.
license: Apache-2.0
metadata:
  author: gentleman-programming
  version: "3.4"
---

## Cuándo Usar

- **Agente Corrector**: al iniciar una corrección — leer SOLO `SÍNTESIS DE OBSERVACIONES` como contexto rápido
- **Profile Agent**: al finalizar una corrección — ejecutar el protocolo de actualización de observaciones (observar, transicionar, podar)
- **Ciclo de síntesis/reflexión**: cuando se solicite explícitamente o el protocolo lo active — mantener la capa compacta `SÍNTESIS DE OBSERVACIONES`
- Cuando no existe perfil del autor — crear el archivo inicial desde la plantilla incluida abajo

## Regla de rutas del workspace

El workspace ya está montado en su raíz operativa.
Todas las rutas de este skill son relativas a esa raíz.
Nunca antepongas `workspace/`.
Nunca crees una carpeta `workspace` dentro del workspace actual.

### Sección 1: SÍNTESIS DE OBSERVACIONES (acotada)

- Extensión breve y operativa; evitar precisión falsa de tokens salvo que exista medición determinística externa
- Contenido: capa compacta de memoria derivada del ciclo de síntesis/reflexión
- Propósito: aliviar lectura del corrector sin reemplazar ni duplicar `OBSERVACIONES`
- Ciclo de vida propio: NO se actualiza automáticamente en cada actualización normal de observaciones
- No es un resumen narrativo del autor ni un resumen obligatorio de todas las observaciones actuales
- No debe sonar como “lo que un profesor diría del estudiante”; debe sonar como memoria compacta de corrección accionable.

### Sección 2: OBSERVACIONES (catálogo compacto)

- Sin límite fijo de entradas
- Organizada por categorías amplias: `Lengua`, `Estilo`, `Criterios de intervención`
- Cada entrada describe una FAMILIA DE PATRONES, no un evento aislado
- Los patrones se actualizan in-place (refuerzan), no se duplican
- Los patrones superados se PODAN
- No conoce ni anticipa el formato de `SÍNTESIS DE OBSERVACIONES`: se actualiza por su propia evidencia (`suggestions`/`cleanPatterns`) y por el estado ya persistido en el perfil

### Categorías canónicas de OBSERVACIONES

| Categoría | Incluye | No incluye |
| --------- | ------- | ---------- |
| `Lengua` | ortografía, acentuación, puntuación, concordancia, régimen preposicional, correlación verbal, sintaxis normativa | preferencias de voz o decisiones estilísticas deliberadas |
| `Estilo` | repeticiones, formulaciones débiles, ritmo, fluidez, gerundios problemáticos, redundancias, claridad expresiva | errores normativos puros |
| `Criterios de intervención` | preferencias explícitas, rasgos intocables, límites de corrección, preservación de voz, grado de intervención permitido | errores del autor tratados con semáforo |

`Puntuación` y `Tipografía` NO son categorías principales. La puntuación vive en `Lengua`; lo tipográfico solo se registra si afecta realmente la intervención y, en ese caso, se integra en la categoría correspondiente.

## Protocolo de Actualización (solo Profile Agent)

El agente corrector NO actualiza el perfil. Solo lo lee.
Este protocolo es ejecutado exclusivamente por el Profile Agent.

El Profile Agent es stateless entre ejecuciones. Su única memoria longitudinal es el perfil Markdown que lee en ese momento.

Entrada disponible en una actualización normal:

- perfil actual (`SÍNTESIS DE OBSERVACIONES` + `OBSERVACIONES`)
- skill `skills/perfil-autor/SKILL.md`
- `suggestions` de la sesión actual
- `cleanPatterns` de la sesión actual
- metadata determinística de la ejecución cuando el prompt la provea (por ejemplo, conteo de caracteres de `## OBSERVACIONES` y zona de activación)

Por eso el semáforo es parte funcional del sistema: codifica el estado longitudinal dentro del archivo, no en la memoria del agente.

### Fase 1: OBSERVAR

1. Recibir las sugerencias de corrección (suggestions) y los patrones limpios (cleanPatterns) de la sesión
2. Comparar contra las observaciones existentes del perfil
3. Para cada patrón en suggestions:
   - Si ya existe en observaciones → reforzar descripción, estado se mantiene o vuelve a 🔴 si era 🟡
   - Si es variante de una familia existente → integrar el matiz en esa familia sin crear duplicado semántico
   - Si es nuevo y tiene suficiente evidencia en la sesión actual o impacto estructural alto → agregar como nueva observación 🔴 en la categoría correspondiente
   - Si es aislado, puramente accidental y no revela patrón estable → NO persistir
4. Para patrones existentes NO mencionados en suggestions ni en cleanPatterns:
   - Mantener sin cambios (sin evidencia no se toca)

### Formato de observación correctiva

Usar una sola línea por observación correctiva:

```markdown
- 🔴 {Familia}: {patrón accionable y semánticamente matcheable}.
```

Reglas:

- NO agregar campos obligatorios como `Evidencia:` o `Señales:`.
- NO usar sub-bullets por defecto.
- Si el patrón necesita ejemplos para entenderse, la observación está mal formulada: integrar lo necesario en la descripción principal.
- La observación debe poder compararse semánticamente contra futuras `suggestions` y `cleanPatterns`.
- Las categorías recibidas desde el corrector (`gramatica`, `puntuacion`, `ortografia`, `estilo`) son pistas, no verdad estructural: mapearlas a `Lengua`, `Estilo` o `Criterios de intervención` según el patrón real.

### Fase 2: TRANSICIONAR

1. Para cada patrón en cleanPatterns:
   - Buscar semánticamente en las observaciones (no matching exacto)
   - Aplicar las reglas de transición del semáforo
   - 🔴 → 🟡, 🟡 → 🟢
2. Si un patrón aparece en suggestions Y cleanPatterns: suggestions prevalece (fallback defensivo)

### Fase 3: PODAR

1. Eliminar todas las observaciones en estado 🟢
2. Estos patrones están confirmados como superados por el autor

### Fuera de la actualización normal: SÍNTESIS/REFLEXIÓN

La `SÍNTESIS DE OBSERVACIONES` tiene ciclo de vida propio.

- NO se actualiza por obligación en cada sesión.
- NO es un resumen mecánico de las observaciones actuales.
- NO debe condicionar cómo se agregan o actualizan `OBSERVACIONES`.
- Se mantiene mediante un ciclo separado de síntesis/reflexión, inspirado en las reflections de Observational Memory.
- Su activación puede venir del prompt de tarea mediante metadata determinística; la skill gobierna cómo escribir con seguridad, no los umbrales runtime.

### Política de escritura segura (obligatoria)

Este protocolo NO autoriza una reescritura libre del archivo entero. El modo correcto es **PATCH CONSERVADOR**.

1. Antes de escribir, identificar la estructura actual completa del archivo: `## SÍNTESIS DE OBSERVACIONES`, `## OBSERVACIONES` y cada subsección `### ...` existente.
2. Todo encabezado y toda viñeta que no esté siendo modificada por evidencia directa de `suggestions` o `cleanPatterns` debe sobrevivir **verbatim**.
3. En actualización normal, NO modificar el bloque `## SÍNTESIS DE OBSERVACIONES` salvo que el prompt haya activado explícitamente el ciclo de síntesis/reflexión.
4. La actualización de `OBSERVACIONES` se hace con cambios localizados sobre viñetas concretas dentro de su subsección. Nunca se debe sustituir una subsección completa por una versión abreviada si esa subsección ya tenía múltiples entradas válidas.
5. Borrados permitidos:
   - una viñeta exacta que llegó a 🟢 y debe podarse;
   - un placeholder exacto como `- (pendiente de primera corrección)` o equivalentes, cuando la sección pasa a tener contenido real.
6. Borrados prohibidos:
   - encabezados (`##`, `###`);
   - subsecciones completas por omisión;
   - viñetas existentes solo porque no aparecieron en la sesión actual.
7. Si no puedes preservar literalmente el resto del documento mientras aplicas los cambios, **NO escribas**. Falla en modo seguro: responde que abortaste la escritura por riesgo de corrupción estructural.

### Prohibiciones absolutas

- NO borrar ni descartar entradas existentes de criterios/preferencias/intocables. En la estructura canónica viven en `### Criterios de intervención`; si el perfil todavía usa `### Preferencias` y `### Elementos Intocables`, deben conservarse intactas hasta una compactación/migración explícita.
- NO fechas
- NO contadores de sesiones
- NO "confirmado en N textos"
- NO sección de historial
- NO sección de deprecados

## Sistema de Semáforo

Cada observación tiene un estado representado por un emoji al inicio de la línea:

- 🔴 **RED** — Error activo. El autor comete este error.
- 🟡 **YELLOW** — Primer reporte limpio. Fue RED, pero en la última sesión el corrector encontró la construcción usada correctamente. Necesita confirmación.
- 🟢 **GREEN** — Confirmado limpio. Segundo reporte limpio consecutivo. Se poda inmediatamente.

### Reglas de transición

| Estado actual | Evidencia en esta sesión | Nuevo estado           |
| ------------- | ------------------------ | ---------------------- |
| (nuevo)       | Aparece en suggestions   | 🔴                     |
| 🔴            | Aparece en cleanPatterns | 🟡                     |
| 🔴            | Aparece en suggestions   | 🔴 (se mantiene)       |
| 🔴            | Sin evidencia            | 🔴 (se mantiene)       |
| 🟡            | Aparece en cleanPatterns | 🟢 → se poda           |
| 🟡            | Aparece en suggestions   | 🔴 (reset)             |
| 🟡            | Sin evidencia            | 🟡 (se mantiene)       |
| Podado        | Aparece en suggestions   | 🔴 (nueva observación) |

### Reglas clave

- Un patrón va en suggestions O en cleanPatterns, NUNCA en ambos
- Si por error aparece en ambos: suggestions prevalece (fallback defensivo)
- Un cleanPattern es SOLO cuando el corrector encontró la construcción en el texto y estaba correcta. "No encontré errores" NO es un cleanPattern.
- GREEN se poda inmediatamente — no se mantiene una sesión más
- La poda de un 🟢 NO obliga por sí sola a modificar `SÍNTESIS DE OBSERVACIONES` durante una actualización normal

## Criterios de Relevancia para Observaciones

Al decidir qué observaciones crear o reforzar, priorizar:

1. Patrones que afectan COMPRENSIÓN (Nivel A) > calidad (Nivel B) > pulido (Nivel C)
2. Patrones FRECUENTES > patrones ocasionales
3. Patrones que el autor NO ha autocorregido > patrones en mejora

## Criterios de intervención

Las entradas de `### Criterios de intervención` NO usan semáforo porque no representan errores del autor.

- Se escriben como bullets planos.
- Deben provenir de feedback explícito del autor o de una migración/compactación validada.
- Pueden modificarse o eliminarse solo ante feedback posterior que contradiga, limite o reemplace el criterio.
- No se transicionan mediante `cleanPatterns`.

## Plantilla del Perfil

Usar esta plantilla al crear un perfil nuevo. No existe archivo de plantilla separado — esta es la referencia canónica.

```markdown
---
autor: { nombre }
slug: { slug }
---

# Perfil de Corrección: {nombre}

## SÍNTESIS DE OBSERVACIONES

(Pendiente de primera corrección)

## OBSERVACIONES

### Lengua

- (pendiente de primera corrección)

### Estilo

- (pendiente de primera corrección)

### Criterios de intervención

- (pendiente de primer criterio)
```

Nota: Al crear observaciones correctivas, todas inician en estado 🔴. Ejemplo:
`- 🔴 Gerundio de posterioridad/percepción: usa gerundios donde corresponde coordinación verbal o infinitivo con verbos de percepción.`

## Convención de Slug

| Nombre del autor     | Slug correcto        |
| -------------------- | -------------------- |
| María García         | maria-garcia         |
| Jorge Luis Borges    | jorge-luis-borges    |
| Ana María López Ruiz | ana-maria-lopez-ruiz |

- Minúsculas, sin tildes, guiones en lugar de espacios
- Si tiene seudónimo: usar el identificador acordado en el proyecto

## Workflow (2 agentes)

### Agente Corrector — CARGA (antes de corregir)

1. Leer `autores/{slug}.md`
2. Si existe → leer SOLO la sección `SÍNTESIS DE OBSERVACIONES` como contexto de máxima prioridad
3. Si no existe → proceder sin perfil (primera sesión)
4. NO actualizar el perfil — eso lo hace el Profile Agent

### Profile Agent — ACTUALIZACIÓN (después de corregir)

1. Leer el perfil COMPLETO (`SÍNTESIS DE OBSERVACIONES` + `OBSERVACIONES`)
2. Recibir las sugerencias (suggestions) y patrones limpios (cleanPatterns) de la sesión
3. Ejecutar las fases de actualización normal: OBSERVAR → TRANSICIONAR → PODAR
4. Aplicar un PATCH CONSERVADOR en `autores/{slug}.md`: modificar solo las viñetas necesarias en `OBSERVACIONES`; no tocar `SÍNTESIS DE OBSERVACIONES` salvo activación explícita del ciclo de síntesis/reflexión
5. Si es primera sesión → crear el archivo desde la plantilla con observaciones en 🔴

## Recursos

- **Directorio de perfiles**: `autores/`
