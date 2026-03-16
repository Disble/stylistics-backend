---
name: diccionario
description: >
  Skill para consultar el diccionario usando exclusivamente el binario local
  `.\dlexa.exe` desde `workspace/`. Trigger: cargar cuando el modelo necesite
  buscar un termino, validar una grafia, explorar variantes o apoyarse en el
  CLI local en vez de asumir resultados.
license: Apache-2.0
metadata:
  author: gentleman-programming
  version: "1.1"
---

# Diccionario

## When to Use

- Cuando una tarea pida consultar una palabra, expresion o variante y exista el binario local `.\dlexa.exe`.
- Cuando haya que validar una grafia o explorar resultados del diccionario sin inventar contenido.
- Cuando convenga resolver una consulta con el CLI local en `workspace/` en lugar de depender de memoria del modelo.

## Critical Patterns

- Esta skill usa solo `.\dlexa.exe`; no depende de referencias markdown locales.
- Ejecutar `.\dlexa.exe` desde `workspace/`, donde el binario vive junto al directorio `skills/`.
- No inventar definiciones, acepciones ni etimologias si el binario no las muestra.
- Si el resultado es ambiguo, incompleto o vacio, decirlo explicitamente.
- Si hace falta refinar la consulta, probar con otra grafia, singular/plural o una variante cercana.

## Workflow

1. Ejecutar `.\dlexa.exe <consulta>` desde `workspace/`.
2. Inspeccionar la salida y extraer solo lo que el CLI permita sostener.
3. Si no hay resultado claro, probar una variante razonable del termino.
4. Responder con base en la salida observada; si falta evidencia, declarar la limitacion.

## Code Examples

```text
Consulta: "Buscame `tilde` en el diccionario"
Accion esperada: ejecutar `.\dlexa.exe tilde` desde `workspace/` y responder usando la salida del CLI.
```

```text
Consulta: "`hashtag` existe?"
Accion esperada: ejecutar `.\dlexa.exe hashtag`; si no hay salida concluyente, indicar que no pudo verificarse con el CLI en ese intento.
```

## Commands

```bash
.\dlexa.exe tilde
.\dlexa.exe hashtag
.\dlexa.exe "agua"
```
