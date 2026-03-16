/**
 * LLM service using OpenAI API for generating responses
 */

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';
const LLM_MODEL = 'gpt-4o-mini'; // Cost-effective model

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LLMResponse {
  answer: string;
  model: string;
}

/**
 * Generate a response using OpenAI Chat API with RAG context
 */
export async function generateResponse(
  userQuestion: string,
  contextChunks: Array<{ content: string; url: string }>,
  conversationHistory: ChatMessage[] = []
): Promise<LLMResponse> {
  if (!OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not set in environment variables');
  }

  // Build context from chunks
  const contextText = contextChunks
    .map((chunk, idx) => `[Source ${idx + 1}: ${chunk.url}]\n${chunk.content}`)
    .join('\n\n---\n\n');

  // System prompt with strict instructions
  const systemPrompt = `Tu es un assistant virtuel pour Rentoall, une plateforme de location d'espaces (parkings, caves, box de stockage).

INSTRUCTIONS CRITIQUES:
1. Réponds UNIQUEMENT en te basant sur le contexte fourni ci-dessous.
2. Si la réponse n'est pas dans le contexte, dis clairement "Je n'ai pas trouvé d'information sur ce sujet dans la documentation. Pouvez-vous reformuler votre question ?"
3. Cite toujours les sources (URLs) que tu utilises pour répondre.
4. Réponds en français de manière claire et concise.
5. Ne jamais inventer d'informations qui ne sont pas dans le contexte.

CONTEXTE:
${contextText}`;

  // Build messages array
  const messages: ChatMessage[] = [
    { role: 'system', content: systemPrompt },
    ...conversationHistory.slice(-6), // Keep last 6 messages for context
    { role: 'user', content: userQuestion },
  ];

  try {
    const response = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: LLM_MODEL,
        messages: messages,
        temperature: 0.7,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`OpenAI API error: ${response.status} - ${JSON.stringify(errorData)}`);
    }

    const data = await response.json();
    const answer = data.choices[0]?.message?.content;

    if (!answer) {
      throw new Error('Invalid response from OpenAI');
    }

    return {
      answer,
      model: data.model || LLM_MODEL,
    };
  } catch (error) {
    console.error('[LLM] Error generating response:', error);
    throw error;
  }
}
