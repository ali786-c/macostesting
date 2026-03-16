/**
 * Embeddings service using OpenAI API
 */

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_API_URL = 'https://api.openai.com/v1/embeddings';
const EMBEDDING_MODEL = 'text-embedding-3-small'; // Smaller, cheaper model

export interface EmbeddingResponse {
  embedding: number[];
  model: string;
}

/**
 * Generate embedding for a text using OpenAI API
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  if (!OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not set in environment variables');
  }

  console.log(`[EMBEDDINGS] Generating embedding for text (length: ${text.length})`);

  try {
    const response = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: EMBEDDING_MODEL,
        input: text,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`OpenAI API error: ${response.status} - ${JSON.stringify(errorData)}`);
    }

    const data = await response.json();
    const embedding = data.data[0]?.embedding;

    if (!embedding || !Array.isArray(embedding)) {
      throw new Error('Invalid embedding response from OpenAI');
    }

    console.log(`[EMBEDDINGS] Generated embedding (dimensions: ${embedding.length})`);
    return embedding;
  } catch (error) {
    console.error('[EMBEDDINGS] Error generating embedding:', error);
    throw error;
  }
}

/**
 * Generate embeddings for multiple texts in batch
 */
export async function generateEmbeddingsBatch(texts: string[]): Promise<number[][]> {
  if (!OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not set in environment variables');
  }

  console.log(`[EMBEDDINGS] Generating embeddings for ${texts.length} texts`);

  try {
    const response = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: EMBEDDING_MODEL,
        input: texts,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`OpenAI API error: ${response.status} - ${JSON.stringify(errorData)}`);
    }

    const data = await response.json();
    const embeddings = data.data.map((item: any) => item.embedding);

    if (!embeddings || !Array.isArray(embeddings)) {
      throw new Error('Invalid embeddings response from OpenAI');
    }

    console.log(`[EMBEDDINGS] Generated ${embeddings.length} embeddings`);
    return embeddings;
  } catch (error) {
    console.error('[EMBEDDINGS] Error generating embeddings batch:', error);
    throw error;
  }
}
