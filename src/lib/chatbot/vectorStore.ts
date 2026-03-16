/**
 * Vector Store implementation using SQLite
 * Simple in-memory vector store for RAG chatbot
 */

import { createHash } from 'crypto';

export interface DocumentChunk {
  id: string;
  content: string;
  url: string;
  metadata?: Record<string, any>;
  embedding?: number[];
}

export class VectorStore {
  private chunks: Map<string, DocumentChunk> = new Map();
  private embeddings: Map<string, number[]> = new Map();

  /**
   * Add a document chunk to the store
   */
  addChunk(chunk: DocumentChunk, embedding?: number[]): void {
    this.chunks.set(chunk.id, chunk);
    if (embedding) {
      this.embeddings.set(chunk.id, embedding);
    }
  }

  /**
   * Add multiple chunks at once
   */
  addChunks(chunks: DocumentChunk[], embeddings?: Map<string, number[]>): void {
    chunks.forEach((chunk, index) => {
      const embedding = embeddings?.get(chunk.id);
      this.addChunk(chunk, embedding);
    });
  }

  /**
   * Get a chunk by ID
   */
  getChunk(id: string): DocumentChunk | undefined {
    return this.chunks.get(id);
  }

  /**
   * Get embedding for a chunk
   */
  getEmbedding(id: string): number[] | undefined {
    return this.embeddings.get(id);
  }

  /**
   * Search for similar chunks using cosine similarity
   */
  searchSimilar(queryEmbedding: number[], topK: number = 5, minScore: number = 0.7): Array<{ chunk: DocumentChunk; score: number }> {
    const results: Array<{ chunk: DocumentChunk; score: number }> = [];

    for (const [id, chunkEmbedding] of this.embeddings.entries()) {
      const score = this.cosineSimilarity(queryEmbedding, chunkEmbedding);
      if (score >= minScore) {
        const chunk = this.chunks.get(id);
        if (chunk) {
          results.push({ chunk, score });
        }
      }
    }

    // Sort by score descending and return top K
    return results.sort((a, b) => b.score - a.score).slice(0, topK);
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      return 0;
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    const denominator = Math.sqrt(normA) * Math.sqrt(normB);
    return denominator === 0 ? 0 : dotProduct / denominator;
  }

  /**
   * Get all chunks (for debugging)
   */
  getAllChunks(): DocumentChunk[] {
    return Array.from(this.chunks.values());
  }

  /**
   * Get total number of chunks
   */
  getSize(): number {
    return this.chunks.size;
  }

  /**
   * Clear all chunks
   */
  clear(): void {
    this.chunks.clear();
    this.embeddings.clear();
  }

  /**
   * Generate a unique ID for a chunk based on content and URL
   */
  static generateChunkId(content: string, url: string, index?: number): string {
    const hash = createHash('md5').update(`${url}:${content}:${index || 0}`).digest('hex');
    return hash.substring(0, 16);
  }
}

// Singleton instance
let vectorStoreInstance: VectorStore | null = null;

export function getVectorStore(): VectorStore {
  if (!vectorStoreInstance) {
    vectorStoreInstance = new VectorStore();
  }
  return vectorStoreInstance;
}
