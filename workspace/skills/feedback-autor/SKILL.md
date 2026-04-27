---
name: feedback-autor
description: >
  Protocolo para actualizar el perfil de un autor a partir de un único comentario de feedback
  (valoración positiva o negativa sobre una sugerencia de corrección).
  Distinto del Profile Agent, que procesa sesiones completas; este skill actúa sobre un evento puntual.
license: Apache-2.0
metadata:
  author: gentleman-programming
  version: "1.4"
---

## Propósito

Este skill define cómo el **Feedback Agent** interpreta y aplica el feedback de un autor
sobre una corrección individual, actualizando su perfil de manera selectiva y controlada.

## Regla de rutas del workspace

El workspace ya está montado en su raíz operativa.
Todas las rutas de este skill son relativas a esa raíz.
Nunca antepongas `workspace/`.
Nunca crees una carpeta `workspace` dentro del workspace actual.

**Diferencia clave respecto al Profile Agent:**

| Profile Agent                                | Feedback Agent                                 |
| -------------------------------------------- | ---------------------------------------------- |
| Procesa la sesión completa (N sugerencias)   | Procesa un único comentario de feedback        |
| Actualiza `PATRONES VIVOS` mediante semáforo | Actualiza solo `CRITERIOS DE INTERVENCIÓN`     |
| Usa el sistema de semáforo (🔴🟡🟢)          | NO usa semáforo — escribe bullets planos       |
| Ejecutado al finalizar la corrección         | Ejecutado inmediatamente tras recibir feedback |

## Estructura del Perfil (referencia)

Este skill trabaja sobre el perfil del autor definido en `skills/perfil-autor/SKILL.md`.
Consultá ese documento para entender la estructura completa (`PATRONES VIVOS` + `CRITERIOS DE INTERVENCIÓN`).

La sección objetivo de este skill es:

- **`## CRITERIOS DE INTERVENCIÓN`** — preferencias explícitas, rasgos intocables, límites de corrección, preservación de voz y grado de intervención permitido

> Compatibilidad: si un perfil legacy todavía contiene `### Preferencias` y `### Elementos Intocables`, NO las borres ni las fusiones desde este skill. La fusión pertenece a una compactación/migración explícita del perfil completo.

---

## Protocolo LEER → RAZONAR → DECIDIR → ACTUAR

### FASE 1 — LEER

Antes de razonar sobre cualquier cosa:

1. Leer el perfil completo del autor desde `autores/{slug}.md`
2. Leer este skill (`skills/feedback-autor/SKILL.md`) si aún no está en contexto
3. Revisar el input recibido: `category`, `context`, `anchor`, `suggestedText`, `justification`, `action`, `severity`, `suggestionType`, `comment`

> Sin haber leído el perfil completo, NO avanzar a RAZONAR.

---

### FASE 2 — RAZONAR

Clasificar la **intención del comentario** en una de estas tres categorías.

> **Usá `justification` como contexto activo durante el razonamiento.** La justificación del corrector te dice POR QUÉ se hizo esa sugerencia. Si el autor rechaza algo que el corrector marcó como "error normativo" (ortografía, gramática), el comentario del autor puede estar explicando el contexto narrativo (diálogo, personaje, dialecto) sin que eso implique un criterio general de intervención. En ese caso, el comentario es probablemente `CONTEXTUAL` o `VAGO`, no `CRITERIO`.

#### Tabla de clasificación de intención

| Categoría     | Descripción                                             | Ejemplos                                                                                                          | Fuerza de señal                                                                |
| ------------- | ------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `CRITERIO`    | El autor declara una regla general de intervención: preferencia, límite, rasgo intocable o grado de corrección permitido | "Prefiero las comas antes de la conjunción", "No corrijas mis oraciones largas", "El ritmo cortado es intencional" | Alta cuando usa generalizadores, habla de voz/intención o define cómo quiere ser corregido |
| `CONTEXTUAL`  | El comentario aplica solo a este caso concreto          | "En este párrafo lo hice por el ritmo", "Aquí quise el efecto de ruptura", "Esta vez lo dejé así adrede"          | Débil: atado a instancia específica ("aquí", "este párrafo", "en este caso")   |
| `VAGO`        | El comentario no provee información accionable          | "No sé", "Es raro", "Medio que sí", sin explicación                                                               | Sin señal clara                                                                |

#### Heurísticas de fuerza de señal

- **Palabras generalizadoras** ("siempre", "nunca", "en general", "prefiero", "me gusta", "no me gusta") → señal **fuerte** → candidato a `CRITERIO`
- **Anclaje a instancia** ("en este párrafo", "aquí", "esta vez", "en este caso") → señal **débil** → candidato a `CONTEXTUAL`
- **Referencia a voz o identidad narrativa** ("es parte de mi estilo", "así escribo yo", "mi voz es así") → señal **fuerte** → candidato a `CRITERIO`
- **Ausencia de explicación o contradicción interna** → señal **nula** → `VAGO`

> Regla de oro: si el comentario podría aplicar a CUALQUIER texto futuro del autor → `CRITERIO`.
> Si solo aplica a ESTE texto → `CONTEXTUAL`. Si no se puede determinar → `VAGO`.

---

### FASE 3 — DECIDIR

#### Si la categoría es `CRITERIO`:

1. Determinar la sección objetivo: `## CRITERIOS DE INTERVENCIÓN`.

2. Verificar duplicados semánticamente (no por texto exacto):
   - ¿Ya existe una entrada que exprese la misma idea?
   - Si **sí** → NO agregar. Actualizar la entrada existente solo si el nuevo comentario la enriquece.
   - Si **no** → agregar nueva entrada.

3. NO actualizar `## PATRONES VIVOS` desde este skill.
   - Este skill procesa un evento puntual de preferencia/límite, no evidencia de patrón correctivo.
   - Un criterio agregado aquí queda persistido en `## CRITERIOS DE INTERVENCIÓN` y no participa del semáforo.

#### Si la categoría es `CONTEXTUAL` o `VAGO`:

1. **NO actualizar el perfil.**
2. Registrar internamente la razón del descarte:
   - `CONTEXTUAL`: "Comentario atado a instancia específica — sin valor de patrón"
   - `VAGO`: "Señal insuficiente — no se puede inferir criterio accionable"
3. Confirmar en la respuesta que no se actualizó y por qué.

---

### FASE 4 — ACTUAR

#### Formato de escritura

Escribir la nueva entrada como **bullet plano**, sin prefijo de semáforo:

```
- {observación en una línea, directa y descriptiva}
```

**Ejemplos correctos:**

```
- Prefiere coma serial antes de conjunción final en listas
- Uso de oraciones cortas y cortadas como recurso rítmico intencional — no corregir
- Rechaza el tuteo formal; usa voseo de manera consistente
```

**Ejemplos incorrectos:**

```
- 🔴 Prefiere coma serial...        ← NO: el semáforo no aplica aquí
- 🟡 Uso de oraciones cortas...     ← NO: el semáforo no aplica aquí
- Posiblemente prefiere...          ← NO: no inferir, no especular
- En este texto prefirió...         ← NO: si es contextual, no se escribe
```

#### Confirmación en respuesta

Siempre confirmar en la respuesta qué se hizo:

- Si se actualizó: indicar la sección y el texto exacto de la entrada agregada o modificada.
- Si no se actualizó: indicar la categoría asignada y la razón del descarte.

#### Política de escritura segura (obligatoria)

Este skill NO autoriza reescritura libre del perfil. El modo correcto es **PATCH CONSERVADOR** sobre la sección objetivo.

1. Identificar primero la sección objetivo exacta: `## CRITERIOS DE INTERVENCIÓN`.
2. Todo encabezado y toda viñeta fuera de la sección objetivo debe sobrevivir **verbatim**.
3. Si la sección objetivo existe y contiene un placeholder, reemplazar SOLO la línea del placeholder.
4. Si la sección objetivo existe y contiene entradas reales, actualizar una viñeta concreta o agregar una nueva debajo de la última viñeta. No reemplazar la sección completa.
5. Si la sección objetivo no existe, crear `## CRITERIOS DE INTERVENCIÓN` después de `## PATRONES VIVOS` sin tocar ni resumir las subsecciones vecinas.
6. Borrados permitidos:
   - el placeholder exacto de la sección que pasa a tener contenido real;
   - una viñeta exacta que se reemplaza in-place por una versión más rica de la misma idea.
7. Borrados prohibidos:
   - encabezados (`##`, `###`);
   - subsecciones completas por omisión;
   - viñetas existentes de otras subsecciones;
   - contenido existente de criterios, preferencias o intocables sin una sustitución explícita uno a uno.
8. Si no puedes anclar la edición sin riesgo de corrupción estructural, **NO escribas**. Falla en modo seguro y responde que abortaste la escritura.

---

## Prohibiciones absolutas

- **NO** usar prefijos de semáforo (🔴🟡🟢) en entradas de `CRITERIOS DE INTERVENCIÓN`
- **NO** inventar patrones — solo lo que el autor declaró explícitamente en el comentario
- **NO** inferir más allá del texto del comentario
- **NO** duplicar entradas — verificar semánticamente antes de escribir
- **NO** actualizar `PATRONES VIVOS`; este skill solo modifica `CRITERIOS DE INTERVENCIÓN`
- **NO** actualizar el perfil para comentarios `CONTEXTUAL` o `VAGO`
- **NO** omitir la confirmación en la respuesta

---

## Input que recibe el agente

```typescript
{
  category: string,        // categoría de la corrección original
  context: string,         // contexto/parrafo completo donde vive la sugerencia
  anchor: string,          // fragmento exacto dentro de `context` al que apunta la sugerencia
  suggestedText?: string,  // texto sugerido por el corrector; ausente en `comment-only`
  justification: string,   // justificación que generó el corrector — contexto clave para RAZONAR
  action: "accept" | "reject",
  severity: "high" | "medium" | "low",
  suggestionType: "track-change" | "comment-only",
  comment?: string,        // comentario libre del autor (puede estar vacío)
}
```

> Si `comment` está ausente o vacío → clasificar directamente como `VAGO` → no actualizar.

---

## Recursos

- **Estructura del perfil**: `skills/perfil-autor/SKILL.md`
- **Directorio de perfiles**: `autores/`
