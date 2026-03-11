import { Mastra } from "@mastra/core/mastra";
import { PinoLogger } from "@mastra/loggers";
import {
  Observability,
  DefaultExporter,
  CloudExporter,
  SensitiveDataFilter,
} from "@mastra/observability";
import { weatherWorkflow } from "./workflows/weather-workflow";
import { editorialWorkflow } from "./workflows/editorial-workflow";
import { weatherAgent } from "./agents/weather-agent";
import { editorialAgent } from "./agents/editorial-agent";
import {
  toolCallAppropriatenessScorer,
  completenessScorer,
  translationScorer,
} from "./scorers/weather-scorer";
import { pgStore } from "./constants/db";
import { workspace } from "./constants/workspaces";
import { pgVector, VECTOR_STORE } from "./constants/vector";

export const mastra = new Mastra({
  workflows: { weatherWorkflow, editorialWorkflow },
  agents: { weatherAgent, editorialAgent },
  scorers: {
    toolCallAppropriatenessScorer,
    completenessScorer,
    translationScorer,
  },
  storage: pgStore,
  vectors: {
    [VECTOR_STORE.VECTOR_NAME]: pgVector,
  },
  logger: new PinoLogger({
    name: "Mastra",
    level: "info",
  }),
  observability: new Observability({
    configs: {
      default: {
        serviceName: "mastra",
        exporters: [
          new DefaultExporter(), // Persists traces to storage for Mastra Studio
          new CloudExporter(), // Sends traces to Mastra Cloud (if MASTRA_CLOUD_ACCESS_TOKEN is set)
        ],
        spanOutputProcessors: [
          new SensitiveDataFilter(), // Redacts sensitive data like passwords, tokens, keys
        ],
      },
    },
  }),
  workspace,
});
