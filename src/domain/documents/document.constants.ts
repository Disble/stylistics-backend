export const DOCUMENT_GENRES = [
  "narrativa-literaria",
  "ensayo-academico",
  "periodismo-cultural",
  "general",
] as const;

export const DEFAULT_DOCUMENT_GENRE = "general";

export const DEFAULT_DOCUMENT_PROCESSING_CONFIG = {
  chunking: {
    mode: "default",
  },
} as const;

export const INITIAL_DOCUMENT_STYLE_PROFILE_TEMPLATE = `# Perfil estilístico del documento

## PATRONES VIVOS

### Ortografía

### Gramática

### Puntuación

### Tipografía

### Léxico

### Estilo

## CRITERIOS DE INTERVENCIÓN
`;
