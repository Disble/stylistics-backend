/**
 * Assembles the Mastra runtime for this backend, wiring registered agents,
 * workflows, storage, vectors, logging, and observability.
 */
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
import { storageCompositeStore } from "./constants/storage";
import { pgVector, VECTOR_STORE } from "./constants/vector";
import { editorialWorkflow } from "./workflows/editorial-workflow";
import { feedbackWorkflow } from "./workflows/feedback/feedback-workflow";
import { stylisticWorkflow } from "./workflows/stylistic/stylistic-workflow";

/** Exposes the configured Mastra application instance consumed by the runtime. */
export const mastra = new Mastra({
  workflows: {
    editorialWorkflow,
    stylisticWorkflow,
    feedbackWorkflow,
  },
  agents: {
    editorialAgent,
    stylisticAgent,
    stylisticConsultationAgent,
    profileAgent,
    feedbackAgent,
  },
  storage: storageCompositeStore,
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
