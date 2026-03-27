import { Agent } from "@mastra/core/agent";
import { memory } from "../constants/memory";
import { modelPool } from "../constants/models";

export const editorialAgent = new Agent({
  id: "editorial-agent",
  name: "Editorial Agent",
  instructions:
    "Eres un editor de textos en español. Analiza el texto y devuelve sugerencias editoriales.",
  // model: "google/gemini-2.5-pro",
  // model: "google/gemini-3-flash-preview",
  // model: ollama("qwen3-vl:8b"),
  model: modelPool["editorial-agent"],
  memory,
});
