import { NextRequest, NextResponse } from 'next/server';
import { answerQuestion } from '@/lib/chatbot/faq-bot';

export const runtime = 'nodejs';

interface ChatFaqRequest {
  message: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: ChatFaqRequest = await request.json();
    const { message } = body;

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    const result = answerQuestion(message.trim());

    return NextResponse.json({
      answer: result.answer,
      matchedQuestion: result.matchedQuestion,
      suggestedQuestions: result.suggestedQuestions,
      model: 'faq',
    });
  } catch (error) {
    console.error('[CHAT FAQ] Error:', error);
    return NextResponse.json(
      {
        error: 'Une erreur est survenue.',
        details: error instanceof Error ? error.message : 'Unknown',
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    model: 'faq',
    description: 'Bot FAQ avec questions préenregistrées',
  });
}
