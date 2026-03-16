import { NextRequest, NextResponse } from 'next/server';
import { getVectorStore } from '@/lib/chatbot/vectorStore';
import { generateEmbedding } from '@/lib/chatbot/embeddings';
import { generateResponse } from '@/lib/chatbot/llm';

export const runtime = 'nodejs';
export const maxDuration = 30;

interface ChatRequest {
  message: string;
  conversationHistory?: Array<{ role: string; content: string }>;
}

export async function POST(request: NextRequest) {
  try {
    const body: ChatRequest = await request.json();
    const { message, conversationHistory = [] } = body;

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    console.log('[CHAT API] Received question:', message.substring(0, 100));

    // Get vector store instance
    const vectorStore = getVectorStore();

    // Check if vector store is empty
    if (vectorStore.getSize() === 0) {
      console.warn('[CHAT API] Vector store is empty - returning fallback response');
      return NextResponse.json({
        answer: 'Je suis désolé, mais la base de connaissances n\'a pas encore été indexée. Veuillez contacter le support ou réessayer plus tard.',
        sources: [],
        model: 'fallback',
      });
    }

    // Generate embedding for the question
    console.log('[CHAT API] Generating query embedding...');
    const queryEmbedding = await generateEmbedding(message);

    // Search for similar chunks
    console.log('[CHAT API] Searching for similar chunks...');
    const MIN_SIMILARITY_SCORE = parseFloat(process.env.MIN_SIMILARITY_SCORE || '0.7');
    const TOP_K = parseInt(process.env.TOP_K_CHUNKS || '5', 10);

    const similarChunks = vectorStore.searchSimilar(queryEmbedding, TOP_K, MIN_SIMILARITY_SCORE);

    console.log(`[CHAT API] Found ${similarChunks.length} similar chunks`);

    // If no similar chunks found or score too low, return fallback
    if (similarChunks.length === 0 || (similarChunks[0]?.score || 0) < MIN_SIMILARITY_SCORE) {
      console.log('[CHAT API] No relevant chunks found - returning fallback');
      return NextResponse.json({
        answer: 'Je n\'ai pas trouvé d\'information pertinente sur ce sujet dans la documentation. Pouvez-vous reformuler votre question ou essayer une autre question ?\n\nVoici quelques questions que je peux vous aider à résoudre :\n- Comment réserver un espace ?\n- Comment voir les biens disponibles ?\n- Comment fonctionne l\'annulation ?',
        sources: [],
        model: 'fallback',
      });
    }

    // Prepare context chunks for LLM
    const contextChunks = similarChunks.map(({ chunk }) => ({
      content: chunk.content,
      url: chunk.url,
    }));

    // Generate response using LLM
    console.log('[CHAT API] Generating response with LLM...');
    const llmResponse = await generateResponse(
      message,
      contextChunks,
      conversationHistory.map(msg => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      }))
    );

    // Extract unique sources
    const sources = Array.from(new Set(similarChunks.map(({ chunk }) => chunk.url)));

    console.log('[CHAT API] Response generated successfully');

    return NextResponse.json({
      answer: llmResponse.answer,
      sources,
      model: llmResponse.model,
      chunksUsed: similarChunks.length,
      avgScore: similarChunks.reduce((sum, { score }) => sum + score, 0) / similarChunks.length,
    });
  } catch (error) {
    console.error('[CHAT API] Error:', error);
    return NextResponse.json(
      {
        error: 'Une erreur est survenue lors du traitement de votre demande.',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// Health check endpoint
export async function GET() {
  const vectorStore = getVectorStore();
  return NextResponse.json({
    status: 'ok',
    chunksIndexed: vectorStore.getSize(),
    timestamp: new Date().toISOString(),
  });
}
