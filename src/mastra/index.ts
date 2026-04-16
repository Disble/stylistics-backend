import { Mastra } from "@mastra/core/mastra";
import { PinoLogger } from "@mastra/loggers";
import {
  CloudExporter,
  DefaultExporter,
  Observability,
  SensitiveDataFilter,
} from "@mastra/observability";
import { editorialAgent } from "./agents/editorial-agent";
import { feedbackAgent } from "./agents/feedback-agent";
import { profileAgent } from "./agents/profile-agent";
import { stylisticAgent } from "./agents/stylistic-agent";
import { stylisticConsultationAgent } from "./agents/stylistic-consultation-agent";
import { weatherAgent } from "./agents/weather-agent";
import { pgStore } from "./constants/db";
import { pgVector, VECTOR_STORE } from "./constants/vector";
import {
  completenessScorer,
  toolCallAppropriatenessScorer,
  translationScorer,
} from "./scorers/weather-scorer";
import { editorialWorkflow } from "./workflows/editorial-workflow";
import { feedbackWorkflow } from "./workflows/feedback/feedback-workflow";
import { stylisticWorkflow } from "./workflows/stylistic/stylistic-workflow";
import { weatherWorkflow } from "./workflows/weather-workflow";

export const mastra = new Mastra({
  workflows: {
    weatherWorkflow,
    editorialWorkflow,
    stylisticWorkflow,
    feedbackWorkflow,
  },
  agents: {
    weatherAgent,
    editorialAgent,
    stylisticAgent,
    stylisticConsultationAgent,
    profileAgent,
    feedbackAgent,
  },
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
});
