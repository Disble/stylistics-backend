---
name: perfil-autor
description: >
  Fuente única de verdad para perfiles de corrección de autores.
  Arquitectura de 2 capas (Reflexiones + Observaciones) inspirada en Observational Memory.
  El corrector lee solo las reflexiones; el Profile Agent ejecuta la actualización completa.
license: Apache-2.0
metadata:
  author: gentleman-programming
  version: "3.0"
---

## Cuándo Usar

- **Agente Corrector**: al iniciar una corrección — leer SOLO las reflexiones del perfil como contexto rápido
- **Profile Agent**: al finalizar una corrección — ejecutar el protocolo de actualización completo (observar, transicionar, podar, reflejar)
- Cuando no existe perfil del autor — crear el archivo inicial desde la plantilla incluida abajo

## Regla de rutas del workspace

El workspace ya está montado en su raíz operativa.
Todas las rutas de este skill son relativas a esa raíz.
Nunca antepongas `workspace/`.
Nunca crees una carpeta `workspace` dentro del workspace actual.

## Estructura del Perfil (2 Capas)

El perfil implementa un modelo destilado de Observational Memory con dos capas:

### Capa 1: REFLEXIONES (acotada)

- Budget: ~500 tokens máximo
- Contenido: síntesis ejecutiva del autor — patrones principales, preferencias clave, elementos intocables, nivel de intervención
- Propósito: contexto rápido para el agente corrector. Es lo ÚNICO que el corrector necesita leer.
- Se regenera COMPLETA en cada actualización, pero reemplazando SOLO el bloque entre `## REFLEXIONES` y `## OBSERVACIONES`.

### Capa 2: OBSERVACIONES (flexible)

- Sin límite fijo de entradas
- Organizada por CATEGORÍAS: Ortografía, Gramática, Puntuación, Tipografía, Estilo, Preferencias, Elementos Intocables
- Cada entrada describe un PATRÓN, no un evento
- Los patrones se actualizan in-place (refuerzan), no se duplican
- Los patrones superados se PODAN

## Protocolo de Actualización (solo Profile Agent)

El agente corrector NO actualiza el perfil. Solo lo lee.
Este protocolo es ejecutado exclusivamente por el Profile Agent.

### Fase 1: OBSERVAR

1. Recibir las sugerencias de corrección (suggestions) y los patrones limpios (cleanPatterns) de la sesión
2. Comparar contra las observaciones existentes del perfil
3. Para cada patrón en suggestions:
   - Si ya existe en observaciones → reforzar descripción, estado se mantiene o vuelve a 🔴 si era 🟡
   - Si es nuevo → agregar como nueva observación 🔴 en la categoría correspondiente
4. Para patrones existentes NO mencionados en suggestions ni en cleanPatterns:
   - Mantener sin cambios (sin evidencia no se toca)

### Fase 2: TRANSICIONAR

1. Para cada patrón en cleanPatterns:
   - Buscar semánticamente en las observaciones (no matching exacto)
   - Aplicar las reglas de transición del semáforo
   - 🔴 → 🟡, 🟡 → 🟢
2. Si un patrón aparece en suggestions Y cleanPatterns: suggestions prevalece (fallback defensivo)

### Fase 3: PODAR

1. Eliminar todas las observaciones en estado 🟢
2. Estos patrones están confirmados como superados por el autor

### Fase 4: REFLEJAR

1. Reescribir las REFLEXIONES completas basándose en las observaciones actualizadas
2. Las reflexiones son una SÍNTESIS del perfil (~500 tokens máx cuando hay muchas observaciones)
3. Se reescriben SIEMPRE, sin importar si hubo cambios significativos o no

### Política de escritura segura (obligatoria)

Este protocolo NO autoriza una reescritura libre del archivo entero. El modo correcto es **PATCH CONSERVADOR**.

1. Antes de escribir, identificar la estructura actual completa del archivo: `## REFLEXIONES`, `## OBSERVACIONES` y cada subsección `### ...` existente.
2. Todo encabezado y toda viñeta que no esté siendo modificada por evidencia directa de `suggestions` o `cleanPatterns` debe sobrevivir **verbatim**.
3. La actualización de `REFLEXIONES` se hace reemplazando únicamente el bloque comprendido entre `## REFLEXIONES` y `## OBSERVACIONES`.
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

- NO borrar ni descartar las entradas existentes en las secciones `### Preferencias` y `### Elementos Intocables`. Puedes AGREGAR nuevos patrones a estas secciones si corresponden, pero si reescribes el archivo completo, DEBES conservar intactas las entradas que ya estaban.
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
- La poda de un 🟢 debe reflejarse en las reflexiones (se reescriben siempre)

## Criterios de Relevancia

Al sintetizar reflexiones, priorizar:

1. Patrones que afectan COMPRENSIÓN (Nivel A) > calidad (Nivel B) > pulido (Nivel C)
2. Patrones FRECUENTES > patrones ocasionales
3. Patrones que el autor NO ha autocorregido > patrones en mejora

## Plantilla del Perfil

Usar esta plantilla al crear un perfil nuevo. No existe archivo de plantilla separado — esta es la referencia canónica.

```markdown
---
autor: { nombre }
slug: { slug }
---

# Perfil de Corrección: {nombre}

## REFLEXIONES

(Pendiente de primera corrección)

## OBSERVACIONES

### Ortografía

- (pendiente de primera corrección)

### Gramática

- (pendiente de primera corrección)

### Puntuación

- (pendiente de primera corrección)

### Tipografía

- (pendiente de primera corrección)

### Estilo

- (pendiente de primera corrección)

### Preferencias

- (pendiente de primera preferencia)

### Elementos Intocables

- (pendiente de primer intocable)
```

Nota: Al crear observaciones, todas inician en estado 🔴. Ejemplo:
`- 🔴 Omisión de tildes en gerundios enclíticos: frecuente, severidad alta`

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
2. Si existe → leer SOLO la sección REFLEXIONES como contexto de máxima prioridad
3. Si no existe → proceder sin perfil (primera sesión)
4. NO actualizar el perfil — eso lo hace el Profile Agent

### Profile Agent — ACTUALIZACIÓN (después de corregir)

1. Leer el perfil COMPLETO (reflexiones + observaciones)
2. Recibir las sugerencias (suggestions) y patrones limpios (cleanPatterns) de la sesión
3. Ejecutar las 4 fases: OBSERVAR → TRANSICIONAR → PODAR → REFLEJAR
4. Aplicar un PATCH CONSERVADOR en `autores/{slug}.md`: reemplazar solo el bloque de `REFLEXIONES` y modificar solo las viñetas necesarias en `OBSERVACIONES`
5. Si es primera sesión → crear el archivo desde la plantilla con observaciones en 🔴

## Recursos

- **Directorio de perfiles**: `autores/`
