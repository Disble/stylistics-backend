import { Memory } from "@mastra/memory";
import { pgStore } from "./db";
import embedder from "./embedding";
import { pgVector } from "./vector";

export const memory = new Memory({
  storage: pgStore,
  vector: pgVector,
  embedder,
  options: {
    lastMessages: 10,
    semanticRecall: {
      topK: 3,
      messageRange: 2,
    },
  },
});
