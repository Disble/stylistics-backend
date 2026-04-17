---
name: diccionario
description: >
  Skill para consultar dudas lingüísticas normativas (RAE / DPD) usando el binario local `.\dlexa.exe` desde `workspace/`.
  Combina la exploración detallada y el mindset de no inventar respuestas, con el flujo de trabajo en dos pasos (buscar -> extraer).
  Trigger: cargar cuando el modelo necesite buscar un término, validar una grafía, explorar variantes, o cuando el usuario pregunte "cómo se escribe", "es correcto decir", etc.
license: Apache-2.0
metadata:
  author: gentleman-programming, disble
  version: "2.0.0"
---

# Skill: Diccionario (dlexa CLI)

## When to Use

- Cuando una tarea pida consultar una palabra, expresión o variante y exista el binario local `.\dlexa.exe`.
- Cuando haya que validar una grafía o explorar resultados del diccionario (RAE/DPD) sin inventar contenido.
- Cuando el usuario pregunte sobre normativas del español (ortografía, gramática, morfología, puntuación, uso léxico).
- Ejemplos reales: "¿Lleva tilde 'solo'?", "¿es 'la calor' o 'el calor'?", "plural de currículum".

**No usar esta skill para:**

- Traducciones ("cómo se dice casa en inglés").
- Etimologías ("de dónde viene la palabra...").
- Definiciones enciclopédicas genéricas.

## Critical Patterns & Mindset

- **Fuente de verdad única:** Esta skill usa **solo** `.\dlexa.exe`; no depende de referencias markdown locales ni de tu memoria.
- **Ejecución local:** Ejecutar `.\dlexa.exe` desde el directorio `workspace/`, donde vive el binario.
- **No inventar:** No inventes definiciones, acepciones, reglas ni etimologías si el binario no las muestra explícitamente.
- **Transparencia:** Si el resultado es ambiguo, incompleto o vacío, dilo explícitamente al usuario.
- **Iteración:** Si no hay resultado claro o hace falta refinar, prueba con otra grafía, singular/plural o una variante cercana/abstracta (ej. buscar el verbo en infinitivo).

## Common Workflows

El flujo consiste en un proceso de dos pasos: buscar primero, y luego ejecutar la sugerencia exacta obtenida.

### 1. Búsqueda y Extracción (Two-Step Consultation)

Siempre empieza buscando. Revisa la lista de candidatos que devuelve el comando, elige el que coincida con tu intención y **copia y pega el comando exacto** que aparece en el campo `- sugerencia:`. No intentes adivinar el formato del comando.

```bash
# Paso 1: Buscar
.\dlexa.exe search tilde

# (El agente lee la salida y elige el candidato #6)
# ### 6. Tilde en las mayúsculas
# - clasificación: linguistic-article
# - sugerencia: `dlexa espanol-al-dia tilde-en-las-mayusculas`

# Paso 2: Ejecutar la sugerencia exacta (adaptando a .\dlexa.exe si es necesario)
.\dlexa.exe espanol-al-dia tilde-en-las-mayusculas
```

### 2. Consulta exclusiva al DPD

Si quieres restringir la búsqueda solo al índice del Diccionario panhispánico de dudas, usa `dpd search`.

```bash
# Paso 1: Buscar en DPD
.\dlexa.exe dpd search alicuota

# Paso 2: Ejecutar sugerencia
.\dlexa.exe dpd alícuota
```

### 3. Forzar datos actualizados (No Cache)

```bash
.\dlexa.exe --no-cache tilde
```

Omite el caché (que dura 24 hs) y consulta directo a las fuentes. Útil si los datos parecen viejos.

### 4. Manejar una búsqueda sin resultados (Miss) explícitamente

Si una consulta estándar (`.\dlexa.exe <query>`) no devuelve resultados o no es concluyente, lee la salida. A veces sugiere un comando alternativo o usar `search`. Ejecuta el comando sugerido o prueba variantes de la palabra.

### 5. Health Check

```bash
.\dlexa.exe --doctor
```

Corre pruebas de diagnóstico. Exit code 0 significa que está saludable.

## Troubleshooting

| Problema                                    | Revisar                             | Acción                                                                                                                              |
| ------------------------------------------- | ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Falla con `search command requires a query` | ¿Pasaste texto después de `search`? | Usar `.\dlexa.exe search <query>`                                                                                                   |
| Resultados vacíos                           | ¿La duda está cubierta por el DPD?  | Intentar `--no-cache`, chequear ortografía, buscar variantes (infinitivo, singular), o considerar si la duda está fuera de alcance. |
| Exit code 1                                 | Revisar stderr                      | Leer el mensaje de error en stderr y seguir sus instrucciones.                                                                      |
