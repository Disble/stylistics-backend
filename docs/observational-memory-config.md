# Observational Memory — Referencia de Configuración

## Configuración básica

La forma más simple de habilitar OM. Usa los defaults para todo, incluyendo el modelo (`google/gemini-2.5-flash`):

```typescript
import { Memory } from '@mastra/memory'

const memory = new Memory({
  options: {
    observationalMemory: true,
  },
})
```

Con `true`, OM se activa con todos los valores por defecto. Es suficiente para la mayoría de los casos.

---

## Configuración completa

Cuando necesitás control granular sobre cada aspecto del sistema:

```typescript
import { Memory } from '@mastra/memory'

const memory = new Memory({
  options: {
    observationalMemory: {
      model: 'google/gemini-2.5-flash',
      scope: 'thread',
      retrieval: true,
      observation: {
        messageTokens: 30_000,
        bufferTokens: 0.2,
        bufferActivation: 0.8,
        blockAfter: 1.2,
        previousObserverTokens: 2000,
      },
      reflection: {
        observationTokens: 40_000,
        bufferActivation: 0.5,
        blockAfter: 1.2,
      },
      shareTokenBudget: false,
    },
  },
})
```

---

## Tabla de parámetros

### Parámetros generales

| Parámetro | Tipo | Default | Descripción |
| --------- | ---- | ------- | ----------- |
| `model` | `string` | `'google/gemini-2.5-flash'` | Modelo usado por el Observer y el Reflector. Debe tener context window de 128K+ tokens. |
| `scope` | `'thread' \| 'resource'` | `'thread'` | Scope de las observaciones. `thread` = por conversación, `resource` = compartido entre threads de un usuario. |
| `retrieval` | `boolean` | `false` | Habilita modo retrieval experimental. Solo funciona con `scope: 'thread'`. |
| `shareTokenBudget` | `boolean` | `false` | Si `true`, observaciones y mensajes raw comparten el mismo presupuesto de tokens. Requiere `bufferTokens: false` (limitación temporal). |

### Parámetros de observación (`observation`)

| Parámetro | Tipo | Default | Descripción |
| --------- | ---- | ------- | ----------- |
| `messageTokens` | `number` | `30_000` | Threshold de tokens de mensajes raw que dispara al Observer. Cuando el historial supera este valor, se comprimen los mensajes más antiguos. |
| `bufferTokens` | `number \| false` | `0.2` | Frecuencia del buffering async, expresada como proporción de `messageTokens`. Con `0.2` y `messageTokens: 30_000`, el buffer se ejecuta cada ~6,000 tokens. `false` desactiva el buffering async. |
| `bufferActivation` | `number` | `0.8` | Agresividad al limpiar el buffer. `0.8` significa que el Observer se activa cuando el buffer llega al 80% de `messageTokens`. Valores más bajos = compresión más agresiva. |
| `blockAfter` | `number` | `1.2` | Safety net: si los mensajes raw superan `messageTokens × blockAfter` (ej: 36,000 tokens con default), se fuerza compresión sincrónica. Previene que el buffer async deje crecer el historial sin control. |
| `previousObserverTokens` | `number` | `2000` | Tokens de contexto previo que se pasan al Observer para mantener continuidad entre observaciones sucesivas. |

### Parámetros de reflexión (`reflection`)

| Parámetro | Tipo | Default | Descripción |
| --------- | ---- | ------- | ----------- |
| `observationTokens` | `number` | `40_000` | Threshold de tokens de observaciones que dispara al Reflector. Cuando las observaciones superan este valor, se condensan en reflexiones. |
| `bufferActivation` | `number` | `0.5` | Agresividad de activación del Reflector. Con `0.5`, se activa cuando las observaciones llegan al 50% de `observationTokens`. |
| `blockAfter` | `number` | `1.2` | Safety net para reflexiones. Misma lógica que en observaciones — fuerza sync si el threshold es superado por este factor. |

---

## Scopes

### `thread` (default, recomendado)

Las observaciones son **por conversación**. Cada thread tiene sus propias observaciones y reflexiones, aisladas del resto.

- Estable y bien testeado.
- Requiere `threadId` explícito al usar el agente.
- Es el scope que deberías usar salvo que tengas una razón específica para no hacerlo.

```typescript
const memory = new Memory({
  options: {
    observationalMemory: {
      scope: 'thread',
    },
  },
})
```

### `resource` (experimental)

Las observaciones se **comparten entre threads** del mismo usuario (`resourceId`). Si un usuario tiene varias conversaciones, las observaciones de una son visibles desde las otras.

- **Experimental**: task continuity no probada exhaustivamente.
- Puede ser lento con muchos threads activos.
- Útil en teoría para agentes que necesitan contexto cross-conversación, pero las limitaciones actuales lo hacen riesgoso para producción.

```typescript
const memory = new Memory({
  options: {
    observationalMemory: {
      scope: 'resource',
    },
  },
})
```

---

## Retrieval mode (experimental)

Cuando está habilitado, OM registra un tool llamado `recall` que permite al agente acceder a los **mensajes raw originales** que están detrás de una observación. Esto es útil cuando la observación comprimida no tiene suficiente detalle y el agente necesita el texto completo.

- Solo funciona con `scope: 'thread'`.
- Agrega un tool al agente, NO modifica el flujo de compresión.

```typescript
const memory = new Memory({
  options: {
    observationalMemory: {
      scope: 'thread',
      retrieval: true,
    },
  },
})
```

### Parámetros del tool `recall`

El tool `recall` acepta los siguientes parámetros cuando el agente lo invoca:

| Parámetro | Descripción |
| --------- | ----------- |
| `range` | Rango temporal o de observaciones a recuperar. |
| `detail` | Nivel de detalle deseado en la respuesta. |
| `part` | Parte específica de la conversación a recuperar. |
| `pagination` | Control de paginación para resultados extensos. |
| `token limiting` | Límite de tokens para la respuesta del recall. |

---

## Async Buffering

El buffering async es una optimización de performance que viene **habilitada por default**.

### Cómo funciona

1. En lugar de esperar a que el threshold se alcance y comprimir todo de golpe, el Observer corre en **background a intervalos regulares**.
2. La frecuencia está controlada por `bufferTokens` (proporción de `messageTokens`).
3. Los chunks comprimidos se almacenan en un buffer interno.
4. Cuando los mensajes raw alcanzan el threshold × `bufferActivation`, los chunks del buffer se **activan instantáneamente** como observaciones.

### Ventaja

La compresión se distribuye en el tiempo, evitando un spike de latencia cuando se alcanza el threshold. En vez de un bloqueo largo, hay múltiples compresiones pequeñas en background.

### Safety net (`blockAfter`)

Si por alguna razón el buffer no alcanza a comprimir a tiempo y los mensajes raw superan `messageTokens × blockAfter`, se fuerza una compresión **sincrónica**. Esto garantiza que el historial nunca crezca sin control.

### Deshabilitar buffering

Si preferís compresión sincrónica pura (más simple, más predecible, pero con spikes de latencia):

```typescript
const memory = new Memory({
  options: {
    observationalMemory: {
      observation: {
        bufferTokens: false,
      },
    },
  },
})
```

---

## Storage Adapters

OM requiere un storage adapter compatible. **No todos los adapters de Mastra soportan OM**. Los adapters compatibles son:

| Adapter | Paquete |
| ------- | ------- |
| PostgreSQL | `@mastra/pg` |
| LibSQL (SQLite) | `@mastra/libsql` |
| MongoDB | `@mastra/mongodb` |

Si usás un adapter que no está en esta lista, OM no va a funcionar. Asegurate de verificar compatibilidad antes de habilitar.

```typescript
import { Memory } from '@mastra/memory'
import { PostgresStore } from '@mastra/pg'

const memory = new Memory({
  storage: new PostgresStore({
    connectionString: process.env.DATABASE_URL,
  }),
  options: {
    observationalMemory: true,
  },
})
```

---

## Modelos recomendados

El modelo configurado en OM se usa para el Observer y el Reflector, que corren en background. Los requisitos son:

- **Context window de 128K+ tokens**: el Observer necesita leer bloques grandes de mensajes para comprimirlos.
- **Velocidad suficiente para background**: no necesitás el modelo más capaz, necesitás uno que sea rápido y barato.

### Modelos testeados

| Modelo | Notas |
| ------ | ----- |
| `openai/gpt-5-mini` | Mejor score en LongMemEval (94.87%). Excelente relación calidad/costo. |
| `anthropic/claude-haiku-4-5` | Rápido y capaz. Buena opción si ya usás Anthropic. |
| `google/gemini-2.5-flash` | Default de OM. Muy rápido, buen costo. |
| `deepseek/deepseek-reasoner` | Alternativa económica con buen rendimiento. |
| `qwen3` | Opción open-source con context window suficiente. |
| `glm-4.7` | Opción open-source alternativa. |

El default (`google/gemini-2.5-flash`) es una buena elección para la mayoría de los casos. Solo cambialo si tenés una razón específica (costo, latencia, proveedor preferido).

---

## Limitaciones conocidas

1. **`scope: 'thread'` requiere `threadId` explícito**: si no pasás un `threadId` al usar el agente, OM con scope thread no funciona. No hay auto-generación de threadId.

2. **`scope: 'resource'` — task continuity no probada**: el scope resource es experimental. No hay garantía de que las observaciones compartidas entre threads mantengan coherencia en tareas que se extienden entre múltiples conversaciones.

3. **`scope: 'resource'` puede ser lento**: con muchos threads activos para un mismo usuario, la carga de observaciones compartidas puede impactar latencia.

4. **Retrieval mode solo con `scope: 'thread'`**: no podés usar `retrieval: true` con `scope: 'resource'`. No está soportado.

5. **`shareTokenBudget: true` requiere `bufferTokens: false`**: esta es una limitación temporal. Si habilitás `shareTokenBudget`, tenés que deshabilitar el buffering async. Es un bug conocido que debería resolverse en versiones futuras.

6. **Compatibilidad de storage**: solo `@mastra/pg`, `@mastra/libsql` y `@mastra/mongodb` soportan OM. Otros adapters no tienen las tablas/colecciones necesarias.
