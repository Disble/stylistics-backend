# Observational Memory — Integración con stylistics-backend

## Cómo se relaciona con nuestro sistema

Para entender dónde encaja OM en este proyecto, hay que tener clara la distinción entre dos tipos de memoria completamente diferentes:

### Memoria conversacional (OM)

OM comprime el **historial de chat** — los mensajes que van y vienen entre el usuario y el agente durante una sesión de corrección. Si un autor manda un texto largo, el agente hace comentarios, el autor responde, se hacen múltiples pasadas de corrección... todo eso es historial conversacional que crece rápidamente en tokens.

**OM resuelve ese problema**: comprime la conversación para que el agente no pierda contexto ni reviente el context window.

### Datos de dominio (perfiles de autor)

Los perfiles de autor son **conocimiento estructurado del negocio** — preferencias estilísticas, patrones de escritura, reglas específicas de cada autor. Son archivos `.md` que persisten entre sesiones y representan el conocimiento acumulado del sistema sobre cada autor.

**Estos datos NO son conversación** — son información de referencia que el agente necesita para hacer su trabajo.

### La distinción clave

| Aspecto | Observational Memory | Perfiles de autor |
| ------- | -------------------- | ----------------- |
| **Tipo** | Memoria conversacional | Datos de dominio |
| **Contenido** | Historial de chat comprimido | Preferencias, patrones, reglas |
| **Scope** | Intra-sesión (una conversación) | Inter-sesión (persiste siempre) |
| **Formato** | Observaciones/reflexiones generadas | Archivos `.md` estructurados |
| **Propósito** | No perder contexto en sesiones largas | Conocimiento acumulado del autor |

OM **complementa** pero **NO reemplaza** el sistema de perfiles. Son capas ortogonales.

---

## Caso de uso: sesiones de corrección largas

El caso donde OM aporta valor real en este proyecto es en **sesiones de corrección extensas**:

- Un autor manda un texto largo (10,000+ palabras).
- El agente analiza, hace comentarios, sugiere correcciones.
- El autor responde, hace preguntas, pide ajustes.
- Se hacen múltiples pasadas sobre el mismo texto.
- La conversación acumula decenas de miles de tokens.

Sin OM, el historial crece sin control. El agente puede perder contexto de lo que dijo al principio, o directamente exceder el context window.

Con OM, el historial se comprime progresivamente. Las correcciones tempranas se condensan en observaciones, el agente mantiene coherencia, y los costos se reducen significativamente.

---

## Integración propuesta

### Habilitar OM en el stylisticAgent

La propuesta es habilitar OM en el agente principal de corrección estilística para mejorar el rendimiento en sesiones largas:

```typescript
import { Memory } from '@mastra/memory'

const memory = new Memory({
  options: {
    observationalMemory: {
      model: 'google/gemini-2.5-flash',
      scope: 'thread',
      observation: {
        messageTokens: 30_000,
      },
      reflection: {
        observationTokens: 40_000,
      },
    },
  },
})
```

Configuración conservadora con los defaults. No hay razón para ajustar thresholds hasta que tengamos métricas reales de uso.

### Mantener el sistema de perfiles `.md`

Los perfiles de autor se siguen gestionando como archivos `.md` en el sistema de archivos. OM no cambia nada de eso.

El flujo sería:

1. Al iniciar una sesión, el agente carga el **perfil del autor** (datos de dominio, persistentes).
2. Durante la sesión, **OM gestiona el historial conversacional** (compresión automática).
3. Si la sesión es corta, OM prácticamente no interviene (el historial no supera el threshold).
4. Si la sesión es larga, OM comprime progresivamente y el agente mantiene coherencia sin esfuerzo adicional.

### Las dos capas son complementarias

```
┌─────────────────────────────────────────────────────┐
│                  Agente Estilístico                  │
│                                                     │
│  ┌─────────────────┐  ┌──────────────────────────┐  │
│  │  Perfil .md     │  │  Observational Memory    │  │
│  │  del autor      │  │  (historial comprimido)  │  │
│  │                 │  │                          │  │
│  │  - Preferencias │  │  - Mensajes recientes    │  │
│  │  - Patrones     │  │  - Observaciones         │  │
│  │  - Reglas       │  │  - Reflexiones           │  │
│  └─────────────────┘  └──────────────────────────┘  │
│         │                        │                   │
│    Inter-sesión             Intra-sesión             │
│  (coherencia a lo           (coherencia              │
│   largo del tiempo)          dentro de la sesión)    │
└─────────────────────────────────────────────────────┘
```

- **Perfiles** garantizan que el agente conoce al autor, sus preferencias y sus patrones — sin importar cuántas sesiones haya tenido.
- **OM** garantiza que dentro de una sesión larga, el agente no pierde el hilo de la conversación ni las decisiones que tomó al principio.

Juntas, las dos capas cubren tanto la coherencia **inter-sesión** (perfiles) como la coherencia **intra-sesión** (OM).

---

## Consideraciones para la implementación

### Storage

El proyecto necesita un storage adapter compatible con OM. Las opciones son `@mastra/pg`, `@mastra/libsql` o `@mastra/mongodb`. Verificar cuál se usa actualmente y si es compatible.

### Thread IDs

Con `scope: 'thread'`, cada sesión de corrección necesita un `threadId` explícito. Esto ya debería estar manejado si el agente soporta múltiples conversaciones, pero hay que verificar.

### Costos

OM agrega el costo del modelo del Observer/Reflector (`gemini-2.5-flash` por default), pero lo compensa con creces en sesiones largas:

- Sin OM: se paga el historial completo en cada llamada.
- Con OM: se paga la compresión (una vez) + historial reducido (en cada llamada subsiguiente).
- Reducción neta de **4-10x** en costos para sesiones que superan el threshold.

Para sesiones cortas, el overhead de OM es prácticamente nulo (no se activa si no se supera el threshold).

### Qué NO hacer

- **No usar OM para almacenar perfiles de autor**. OM es memoria conversacional, no un key-value store. Los perfiles siguen siendo archivos `.md`.
- **No usar `scope: 'resource'`** por ahora. Es experimental y no necesitamos compartir observaciones entre threads. Cada sesión de corrección es independiente.
- **No habilitar `retrieval`** salvo que haya un caso de uso claro. Agrega complejidad sin beneficio demostrado para nuestro flujo.
