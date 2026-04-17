---
name: feedback-autor
description: >
  Protocolo para actualizar el perfil de un autor a partir de un único comentario de feedback
  (valoración positiva o negativa sobre una sugerencia de corrección).
  Distinto del Profile Agent, que procesa sesiones completas; este skill actúa sobre un evento puntual.
license: Apache-2.0
metadata:
  author: gentleman-programming
  version: "1.0"
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

| Profile Agent                              | Feedback Agent                                     |
| ------------------------------------------ | -------------------------------------------------- |
| Procesa la sesión completa (N sugerencias) | Procesa un único comentario de feedback            |
| Actualiza Observaciones + Reflexiones      | Actualiza solo Preferencias o Elementos Intocables |
| Usa el sistema de semáforo (🔴🟡🟢)        | NO usa semáforo — escribe bullets planos           |
| Ejecutado al finalizar la corrección       | Ejecutado inmediatamente tras recibir feedback     |

## Estructura del Perfil (referencia)

Este skill trabaja sobre el perfil del autor definido en `skills/perfil-autor/SKILL.md`.
Consultá ese documento para entender la estructura completa (REFLEXIONES + OBSERVACIONES).

Las secciones objetivo de este skill son:

- **`### Preferencias`** — Elecciones estilísticas declaradas por el autor
- **`### Elementos Intocables`** — Rasgos de voz que el autor prohíbe corregir

---

## Protocolo LEER → RAZONAR → DECIDIR → ACTUAR

### FASE 1 — LEER

Antes de razonar sobre cualquier cosa:

1. Leer el perfil completo del autor desde `autores/{slug}.md`
2. Leer este skill (`skills/feedback-autor/SKILL.md`) si aún no está en contexto
3. Revisar el input recibido: `category`, `originalText`, `suggestedText`, `justification`, `rating`, `severity`, `comment`

> Sin haber leído el perfil completo, NO avanzar a RAZONAR.

---

### FASE 2 — RAZONAR

Clasificar la **intención del comentario** en una de estas cuatro categorías.

> **Usá `justification` como contexto activo durante el razonamiento.** La justificación del corrector te dice POR QUÉ se hizo esa sugerencia. Si el autor rechaza algo que el corrector marcó como "error normativo" (ortografía, gramática), el comentario del autor puede estar explicando el contexto narrativo (diálogo, personaje, dialecto) sin que eso implique una preferencia de estilo del autor en sí mismo. En ese caso, el comentario es probablemente `CONTEXTUAL` o `VAGO`, no `INTOCABLE`.

#### Tabla de clasificación de intención

| Categoría     | Descripción                                             | Ejemplos                                                                                                          | Fuerza de señal                                                                |
| ------------- | ------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `PREFERENCIA` | El autor declara una elección estilística general       | "Prefiero las comas antes de la conjunción", "Siempre uso puntos suspensivos así", "No me gusta el estilo formal" | Alta cuando usa generalizadores: "siempre", "nunca", "prefiero", "no me gusta" |
| `INTOCABLE`   | El autor declara un rasgo de voz que no debe corregirse | "Esto es parte de mi voz", "No corrijas mis oraciones largas", "El ritmo cortado es intencional"                  | Alta cuando menciona identidad narrativa o uso intencional explícito           |
| `CONTEXTUAL`  | El comentario aplica solo a este caso concreto          | "En este párrafo lo hice por el ritmo", "Aquí quise el efecto de ruptura", "Esta vez lo dejé así adrede"          | Débil: atado a instancia específica ("aquí", "este párrafo", "en este caso")   |
| `VAGO`        | El comentario no provee información accionable          | "No sé", "Es raro", "Medio que sí", sin explicación                                                               | Sin señal clara                                                                |

#### Heurísticas de fuerza de señal

- **Palabras generalizadoras** ("siempre", "nunca", "en general", "prefiero", "me gusta", "no me gusta") → señal **fuerte** → candidato a `PREFERENCIA` o `INTOCABLE`
- **Anclaje a instancia** ("en este párrafo", "aquí", "esta vez", "en este caso") → señal **débil** → candidato a `CONTEXTUAL`
- **Referencia a voz o identidad narrativa** ("es parte de mi estilo", "así escribo yo", "mi voz es así") → señal **fuerte** → candidato a `INTOCABLE`
- **Ausencia de explicación o contradicción interna** → señal **nula** → `VAGO`

> Regla de oro: si el comentario podría aplicar a CUALQUIER texto futuro del autor → `PREFERENCIA` o `INTOCABLE`.
> Si solo aplica a ESTE texto → `CONTEXTUAL`. Si no se puede determinar → `VAGO`.

---

### FASE 3 — DECIDIR

#### Si la categoría es `PREFERENCIA` o `INTOCABLE`:

1. Determinar la sección objetivo:
   - `PREFERENCIA` → `### Preferencias`
   - `INTOCABLE` → `### Elementos Intocables`

2. Verificar duplicados semánticamente (no por texto exacto):
   - ¿Ya existe una entrada que exprese la misma idea?
   - Si **sí** → NO agregar. Actualizar la entrada existente solo si el nuevo comentario la enriquece.
   - Si **no** → agregar nueva entrada.

3. Evaluar si corresponde actualizar `## REFLEXIONES`:
   - Solo si el comentario revela un **insight macro de voz** que no es capturable en Preferencias ni Elementos Intocables.
   - Ejemplo válido: el feedback revela un principio narrativo fundamental que afecta múltiples dimensiones del estilo.
   - Ejemplo inválido: cualquier preferencia puntual, por más importante que sea.
   - **Umbral alto**: la duda debe resolverse NO actualizando REFLEXIONES.

#### Si la categoría es `CONTEXTUAL` o `VAGO`:

1. **NO actualizar el perfil.**
2. Registrar internamente la razón del descarte:
   - `CONTEXTUAL`: "Comentario atado a instancia específica — sin valor de patrón"
   - `VAGO`: "Señal insuficiente — no se puede inferir preferencia"
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

Este skill NO autoriza reescritura libre del perfil. El modo correcto es **PATCH CONSERVADOR** sobre la subsección objetivo.

1. Identificar primero la subsección objetivo exacta: `### Preferencias` o `### Elementos Intocables`.
2. Todo encabezado y toda viñeta fuera de la subsección objetivo debe sobrevivir **verbatim**.
3. Si la subsección objetivo existe y contiene un placeholder, reemplazar SOLO la línea del placeholder.
4. Si la subsección objetivo existe y contiene entradas reales, actualizar una viñeta concreta o agregar una nueva debajo de la última viñeta. No reemplazar la subsección completa.
5. Si la subsección objetivo no existe, recrearla en el orden canónico de `OBSERVACIONES` sin tocar ni resumir las subsecciones vecinas:
   - `### Preferencias` va antes de `### Elementos Intocables`.
   - `### Elementos Intocables` va después de `### Preferencias` o al final de `OBSERVACIONES` si `Preferencias` tampoco existe.
6. Borrados permitidos:
   - el placeholder exacto de la subsección que pasa a tener contenido real;
   - una viñeta exacta que se reemplaza in-place por una versión más rica de la misma idea.
7. Borrados prohibidos:
   - encabezados (`##`, `###`);
   - subsecciones completas por omisión;
   - viñetas existentes de otras subsecciones;
   - contenido existente de `Preferencias` o `Elementos Intocables` sin una sustitución explícita uno a uno.
8. Si no puedes anclar la edición sin riesgo de corrupción estructural, **NO escribas**. Falla en modo seguro y responde que abortaste la escritura.

---

## Prohibiciones absolutas

- **NO** usar prefijos de semáforo (🔴🟡🟢) en entradas de Preferencias ni Elementos Intocables
- **NO** inventar patrones — solo lo que el autor declaró explícitamente en el comentario
- **NO** inferir más allá del texto del comentario
- **NO** duplicar entradas — verificar semánticamente antes de escribir
- **NO** actualizar REFLEXIONES salvo que el insight sea macro y no capturable en las secciones de observaciones
- **NO** actualizar el perfil para comentarios `CONTEXTUAL` o `VAGO`
- **NO** omitir la confirmación en la respuesta

---

## Input que recibe el agente

```typescript
{
  category: string,        // categoría de la corrección original
  originalText: string,    // texto original antes de la corrección
  suggestedText: string,   // texto sugerido por el corrector
  justification: string,   // justificación que generó el corrector — contexto clave para RAZONAR
  rating: "positive" | "negative",
  severity: "high" | "medium" | "low",
  comment?: string,        // comentario libre del autor (puede estar vacío)
}
```

> Si `comment` está ausente o vacío → clasificar directamente como `VAGO` → no actualizar.

---

## Recursos

- **Estructura del perfil**: `skills/perfil-autor/SKILL.md`
- **Directorio de perfiles**: `autores/`
