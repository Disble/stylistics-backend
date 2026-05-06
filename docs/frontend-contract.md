# Contrato Frontend — Stylistic Correction API

Documento de referencia para el equipo frontend. Describe el input y output del workflow de corrección estilística.

El frontend debe autenticarse antes de llamar workflows protegidos. El token de
sesión de Better Auth se envía como bearer token:

```http
Authorization: Bearer <better-auth-session-token>
```

El login, logout y refresh de sesión pertenecen al contrato de autenticación y se
documentan en [`auth.md`](./auth.md). Este documento cubre el contrato funcional
del workflow una vez que la request ya está autenticada.

---

## Input

```ts
{
  text: string;           // Texto a corregir
  autorSlug?: string;     // Identificador del autor en kebab-case (ej: "maria-garcia"). Default: "Disble"
  genero?: Genre;         // Default: "general"
}

type Genre = "narrativa-literaria" | "ensayo-academico" | "periodismo-cultural" | "general";
```

---

## Output

```ts
{
  suggestions: Suggestion[];
  cleanPatterns: string[];
}
```

### `cleanPatterns`

Array de strings. Patrones encontrados en el texto con evidencia de uso correcto — se usan para actualizar el perfil del autor. El frontend puede ignorarlos o mostrarlos como feedback positivo.

### `suggestions`

Array de sugerencias. Cada item es un `discriminatedUnion` por `type`:

#### `track-change`

Representa una corrección con reemplazo de texto. El frontend debe aplicarla como un Track Change de Word.

```ts
{
  type: "track-change";
  context: string;       // Fragmento largo del documento para localizar la corrección de forma inequívoca
  anchor: string;        // Parte exacta del texto que se reemplaza (substring de context)
  suggestedText: string; // Reemplazo del anchor. Siempre distinto al anchor.
  justification: string;
  category: string;
  severity: "high" | "medium" | "low";
}
```

#### `comment-only`

Representa una observación sin cambio de texto. El frontend debe insertarla como un comentario de Word sobre el anchor.

```ts
{
  type: "comment-only";
  context: string;       // Fragmento largo del documento para localizar el comentario de forma inequívoca
  anchor: string;        // Parte exacta del texto sobre la que recae el comentario (substring de context)
  justification: string;
  category: string;
  severity: "high" | "medium" | "low";
}
```

---

## Cómo usar `context` y `anchor` para marcar en Word

La estrategia de localización es en dos pasos:

1. **Buscar `context`** en el documento completo para identificar el párrafo o fragmento correcto (evita colisiones cuando una misma frase aparece más de una vez).
2. **Buscar `anchor` dentro de `context`** para obtener el rango exacto donde aplicar el track change o el comentario.

`anchor` siempre es un substring de `context`.

```
documento:  "...El gato duerme. El gato come. El gato juega..."
context:    "El gato come."
anchor:     "El gato"         ← esto es lo que se reemplaza o comenta
```

---

## Breaking changes

### v2 — `originalText` → `context` + `anchor`

**Fecha:** 2026-04-01

El campo `originalText` fue eliminado y reemplazado por dos campos:

| Antes | Ahora |
|-------|-------|
| `originalText: string` | `context: string` + `anchor: string` |

**Motivación:** `originalText` era ambiguo — a veces contenía el fragmento exacto a reemplazar, a veces un fragmento más amplio. La separación en `context` (localizador) y `anchor` (target exacto) permite al frontend marcar con precisión quirúrgica en documentos con texto repetido.

Afecta a `track-change` y `comment-only`.
