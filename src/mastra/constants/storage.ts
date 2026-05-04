import { MastraCompositeStore } from "@mastra/core/storage";
import { DuckDBStore } from "@mastra/duckdb";
import { pgStore } from "./db";

export const storageCompositeStore = new MastraCompositeStore({
  id: "composite-storage",
  default: pgStore, // Tu PostgreSQL existente para memory, workflows, scores, etc.
  domains: {
    observability: await new DuckDBStore().getStore("observability"),
  },
});
