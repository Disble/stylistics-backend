# Observational Memory — Overview

## Qué es Observational Memory

Observational Memory (OM) es el sistema de **compresión de contexto conversacional** de Mastra, disponible a partir de `@mastra/memory >= 1.1.0`. En vez de mantener un historial crudo de mensajes que crece sin control, OM lo reemplaza progresivamente con **notas densas y comprimidas** a medida que la conversación avanza.

El sistema opera con **dos agentes en background**:

- **Observer**: comprime mensajes raw en observaciones cuando el historial supera un threshold de tokens.
- **Reflector**: condensa observaciones acumuladas en reflexiones cuando estas, a su vez, superan su propio threshold.

La idea central es simple: no necesitás guardar cada mensaje textual si podés extraer la información relevante y descartar el ruido. Es compresión inteligente, no truncamiento.

---

## Arquitectura de 3 capas

OM organiza la memoria conversacional en tres capas jerárquicas:

### 1. Mensajes recientes (raw)

El historial de conversación tal cual — mensajes del usuario, respuestas del agente, tool calls. Esta capa es la más costosa en tokens pero la más detallada. Se mantiene mientras el volumen esté por debajo del threshold del Observer.

### 2. Observaciones (comprimidas)

Cuando los tokens de mensajes raw superan el threshold (default: **30,000 tokens**), el Observer entra en acción y los comprime en **notas estructuradas**. Cada observación es un resumen denso que preserva la información relevante con marcas temporales y priorización.

### 3. Reflexiones (ultra-comprimidas)

Cuando las observaciones acumuladas superan su propio threshold (default: **40,000 tokens**), el Reflector las condensa en **reflexiones**. Esto es garbage collection cognitivo: combina observaciones relacionadas, descarta las irrelevantes y produce un nivel de compresión aún mayor.

```
┌─────────────────────────────────────┐
│          Reflexiones                │  ← Ultra-comprimidas (Reflector)
│   (condensan observaciones)         │
├─────────────────────────────────────┤
│          Observaciones              │  ← Comprimidas (Observer)
│   (condensan mensajes raw)          │
├─────────────────────────────────────┤
│       Mensajes recientes            │  ← Raw (historial actual)
│   (conversación en curso)           │
└─────────────────────────────────────┘
```

---

## Cómo funciona internamente

### Observer

El Observer es el primer agente de compresión. Cuando los mensajes raw superan el threshold configurado (`messageTokens`), toma los mensajes más antiguos y los convierte en notas compactas.

Cada observación usa un formato con:

- **Marcas temporales**: cuándo se observó, a qué momento se refiere, y tiempo relativo.
- **Priorización por emojis**:
  - 🔴 **Crítico**: información que NO se puede perder (decisiones, errores, datos clave).
  - 🟡 **Moderado**: contexto útil pero no esencial.
  - 🟢 **Informativo**: detalles de background, nice-to-have.

El Observer no solo resume — **prioriza**. La información marcada como crítica se preserva con mayor detalle, mientras que la informativa se comprime más agresivamente.

### Reflector

El Reflector es el garbage collector de observaciones. Cuando las observaciones acumuladas superan su threshold (`observationTokens`), las procesa:

- **Combina** observaciones relacionadas en una sola nota más densa.
- **Descarta** observaciones que ya no son relevantes para el contexto actual.
- **Produce reflexiones** que representan el nivel máximo de compresión.

Las reflexiones son infrecuentes — solo se generan cuando hay suficientes observaciones acumuladas.

### Ratios de compresión

- **Texto conversacional**: compresión de **3-6×** (un bloque de 30K tokens se reduce a ~5-10K).
- **Workloads con tool calls**: compresión de **5-40×** (los tool calls son extremadamente verbosos y se comprimen muy bien).

### Modelo de tres fechas

Cada observación registra tres timestamps:

1. **Fecha de observación**: cuándo se creó la nota.
2. **Fecha referenciada**: a qué momento de la conversación se refiere.
3. **Fecha relativa**: tiempo transcurrido desde el evento (ej: "hace 2 horas").

Esto permite al agente razonar temporalmente sobre eventos pasados sin ambigüedad.

### Texto plano, NO grafos de conocimiento

Una decisión de diseño fundamental: OM usa **texto plano** como formato de almacenamiento. No hay grafos de conocimiento, no hay entidades con relaciones, no hay ontologías.

La filosofía es: **"Text is the universal interface"**. El texto plano es interpretable por cualquier modelo, no requiere schemas rígidos, y escala sin complejidad adicional. Los grafos de conocimiento suenan elegantes pero agregan fragilidad y overhead de mantenimiento que no se justifica para memoria conversacional.

---

## Prompt Caching

OM está diseñado para maximizar los **cache hits** de prompt caching (Anthropic, OpenAI, etc.):

### Full cache hits (durante acumulación)

Las observaciones son **append-only** — una vez creadas, no se modifican. Esto genera un **prefix estable** en el prompt: las observaciones anteriores siempre están en la misma posición, lo que permite cache hits consistentes mientras se acumulan mensajes raw nuevos.

### Partial cache hits (al comprimir)

Cuando el Observer genera nuevas observaciones, el bloque de observaciones cambia (se agregan las nuevas), pero las observaciones anteriores siguen en el mismo orden. Esto produce **partial cache hits** — el prefix previo sigue cacheado.

### Invalidación completa (reflexiones)

Solo cuando el Reflector genera reflexiones (evento infrecuente) se invalida el cache significativamente, porque las reflexiones reemplazan y condensan observaciones existentes. Pero como esto pasa pocas veces, el impacto neto es bajo.

```
Tiempo ──────────────────────────────────────────────►

[Obs1][Obs2][Obs3]  + mensajes raw    → Full cache hit ✅
[Obs1][Obs2][Obs3][Obs4]  + raw nuevo  → Partial cache hit 🟡
[Reflexión1]  + Obs5 + raw nuevo       → Cache miss (infrecuente) ❌
[Reflexión1][Obs5][Obs6]  + raw nuevo  → Full cache hit ✅
```

---

## Benchmarks (LongMemEval)

OM fue evaluado usando **LongMemEval**, un benchmark estándar para memoria conversacional a largo plazo. Los resultados son contundentes:

| Modelo + Sistema          | Score     | Notas                                   |
| ------------------------- | --------- | --------------------------------------- |
| gpt-5-mini + OM           | **94.87%** | SOTA — score más alto jamás registrado |
| gemini-3-pro + OM         | **93.27%** | Segundo lugar                           |
| gpt-4o + OM               | **84.23%** | Supera el oracle de 82.4%              |
| Supermemory               | 81.6%     | Sistema especializado                   |
| RAG topK20                | 80.05%    | Retrieval puro                          |
| Zep                       | 71.2%     | Memory system alternativo               |
| Full context (sin compresión) | 60.2% | Baseline — contexto completo sin gestión |

Puntos clave:

- OM con gpt-5-mini **supera a todos los sistemas de memoria conocidos** en el benchmark.
- Incluso gpt-4o con OM **supera al oracle** (82.4%), que es el techo teórico de un sistema con acceso perfecto a la información.
- Full context (mandar todo el historial sin comprimir) solo llega a 60.2% — demostración de que más contexto ≠ mejor rendimiento.

### Reducción de costos

Gracias a la compresión y el prompt caching, OM reduce costos en un factor de **4-10×** comparado con mantener el historial completo.

---

## Dónde encaja en el ecosistema Mastra

Mastra ofrece múltiples sistemas de memoria. OM **complementa** a los demás, no los reemplaza:

| Sistema            | Propósito                                 | Tipo de datos                     |
| ------------------ | ----------------------------------------- | --------------------------------- |
| **Working Memory** | Estado estructurado persistente           | JSON/Markdown (nombres, preferencias, config) |
| **Semantic Recall** | Búsqueda por significado (RAG)           | Embeddings de mensajes pasados    |
| **Message History** | Historial raw de mensajes                | Mensajes completos                |
| **Observational Memory** | Compresión inteligente de historial largo | Notas comprimidas (observaciones + reflexiones) |

### Cómo se complementan

- **Working Memory** guarda datos estructurados que el agente necesita siempre (nombre del usuario, preferencias, estado de un workflow). Es como la RAM.
- **Semantic Recall** permite buscar por significado en mensajes pasados. Es como un search engine.
- **OM** comprime el historial conversacional para que no explote en tokens. Es como un compresor de disco.

Los tres pueden estar activos simultáneamente. OM no compite con Working Memory ni con Semantic Recall — resuelve un problema diferente: **mantener coherencia en conversaciones largas sin reventar el context window ni el presupuesto**.
