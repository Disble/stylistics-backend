import { Agent } from "@mastra/core/agent";
import { memory } from "../constants/memory";

export const editorialAgent = new Agent({
  id: "editorial-agent",
  name: "Editorial Agent",
  instructions:
    "Eres un editor de textos en español. Analiza el texto y devuelve sugerencias editoriales.",
  model: "google/gemini-3-flash-preview",
  memory,
});
