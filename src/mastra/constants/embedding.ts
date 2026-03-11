import { ollama } from "ai-sdk-ollama";
import { VECTOR_STORE } from "./vector";

const embedder = ollama.embedding(VECTOR_STORE.EMBEDDING_NAME);

/**
 * Default embedder configuration for the Mastra memory system.
 * Uses Ollama's Qwen3-Embedding:0.6b model which produces 768-dimensional vectors.
 * This embedder is used to convert text into numerical vectors for semantic search and memory retrieval.
 *
 * @see {@link VECTOR_STORE} in constants.ts for the expected vector dimension
 */
export default embedder;
