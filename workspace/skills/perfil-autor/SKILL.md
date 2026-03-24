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
- **Profile Agent**: al finalizar una corrección — ejecutar el protocolo de actualización completo (observar, reflejar, podar)
- Cuando no existe perfil del autor — crear el archivo inicial desde la plantilla incluida abajo

## Estructura del Perfil (2 Capas)

El perfil implementa un modelo destilado de Observational Memory con dos capas:

### Capa 1: REFLEXIONES (acotada)
- Budget: ~500 tokens máximo
- Contenido: síntesis ejecutiva del autor — patrones principales, preferencias clave, elementos intocables, nivel de intervención
- Propósito: contexto rápido para el agente corrector. Es lo ÚNICO que el corrector necesita leer.
- Se reescribe COMPLETA en cada actualización

### Capa 2: OBSERVACIONES (flexible)
- Sin límite fijo de entradas
- Organizada por CATEGORÍAS: Ortografía, Gramática, Puntuación, Tipografía, Estilo, Preferencias, Elementos Intocables
- Cada entrada describe un PATRÓN, no un evento
- Los patrones se actualizan in-place (refuerzan), no se duplican
- Los patrones superados se PODAN

## Protocolo de Actualización (solo Profile Agent)

El agente corrector NO actualiza el perfil. Solo lo lee.
Este protocolo es ejecutado exclusivamente por el Profile Agent.

### Fase 1: OBSERVAR (siempre)
1. Recibir las sugerencias de corrección de la sesión (JSON estructurado)
2. Comparar contra las observaciones existentes del perfil
3. Para cada patrón detectado en las sugerencias:
   - Si ya existe en observaciones → reforzar (actualizar descripción/frecuencia relativa)
   - Si es nuevo → agregar como nueva observación en la categoría correspondiente
4. Para patrones existentes NO detectados en esta sesión:
   - Si hay evidencia de mejora (el autor ya no comete el error) → marcar para poda
   - Si simplemente no apareció → mantener sin cambios

### Fase 2: REFLEJAR (siempre)
1. Leer TODAS las observaciones actualizadas
2. Sintetizar las REFLEXIONES completas (~500 tokens máx):
   - Principales desafíos del autor (los más frecuentes/severos)
   - Preferencias estilísticas confirmadas
   - Elementos que nunca se deben tocar
   - Nivel de intervención recomendado
3. Las reflexiones se reescriben COMPLETAS cada vez — no se appendean

### Fase 3: PODAR (siempre)
1. Eliminar observaciones marcadas para poda (patrones superados)
2. Si el autor mejoró en un patrón → eliminarlo de observaciones
3. Las reflexiones se actualizan automáticamente en la Fase 2 al no incluir patrones podados

### Prohibiciones absolutas
- NO fechas
- NO contadores de sesiones
- NO "confirmado en N textos"
- NO sección de historial
- NO sección de deprecados

## Criterios de Relevancia

Al sintetizar reflexiones, priorizar:
1. Patrones que afectan COMPRENSIÓN (Nivel A) > calidad (Nivel B) > pulido (Nivel C)
2. Patrones FRECUENTES > patrones ocasionales
3. Patrones que el autor NO ha autocorregido > patrones en mejora

## Plantilla del Perfil

Usar esta plantilla al crear un perfil nuevo. No existe archivo de plantilla separado — esta es la referencia canónica.

```markdown
---
autor: {nombre}
slug: {slug}
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
- (pendiente de primera corrección)

### Elementos Intocables
- (pendiente de primera corrección)
```

## Convención de Slug

| Nombre del autor       | Slug correcto        |
|------------------------|----------------------|
| María García           | maria-garcia         |
| Jorge Luis Borges      | jorge-luis-borges    |
| Ana María López Ruiz   | ana-maria-lopez-ruiz |

- Minúsculas, sin tildes, guiones en lugar de espacios
- Si tiene seudónimo: usar el identificador acordado en el proyecto

## Workflow (2 agentes)

### Agente Corrector — CARGA (antes de corregir)
1. Leer `workspace/autores/{slug}.md`
2. Si existe → leer SOLO la sección REFLEXIONES como contexto de máxima prioridad
3. Si no existe → proceder sin perfil (primera sesión)
4. NO actualizar el perfil — eso lo hace el Profile Agent

### Profile Agent — ACTUALIZACIÓN (después de corregir)
1. Leer el perfil COMPLETO (reflexiones + observaciones)
2. Recibir las sugerencias de corrección del agente corrector (JSON)
3. Ejecutar las 3 fases: OBSERVAR → REFLEJAR → PODAR
4. Escribir el perfil reescrito en `workspace/autores/{slug}.md`
5. Si es primera sesión → crear el archivo desde la plantilla

## Recursos

- **Directorio de perfiles**: `workspace/autores/`
