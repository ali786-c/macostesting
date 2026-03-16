/**
 * API endpoint to trigger site indexing
 * POST /api/index - Start indexing process
 * GET /api/index/status - Check indexing status
 */

import { NextRequest, NextResponse } from 'next/server';
import { indexSite } from '@/scripts/index-site';

export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minutes for indexing

let isIndexing = false;
let lastIndexTime: Date | null = null;
let indexingError: string | null = null;

export async function POST(request: NextRequest) {
  // Check if indexing is already in progress
  if (isIndexing) {
    return NextResponse.json(
      { error: 'Indexing is already in progress' },
      { status: 409 }
    );
  }

  // Check for API key if configured
  const apiKey = process.env.INDEX_API_KEY;
  if (apiKey) {
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${apiKey}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
  }

  // Start indexing in background
  isIndexing = true;
  indexingError = null;

  indexSite()
    .then(() => {
      lastIndexTime = new Date();
      isIndexing = false;
      console.log('[INDEX API] Indexing completed successfully');
    })
    .catch((error) => {
      indexingError = error instanceof Error ? error.message : 'Unknown error';
      isIndexing = false;
      console.error('[INDEX API] Indexing failed:', error);
    });

  return NextResponse.json({
    message: 'Indexing started',
    status: 'in_progress',
  });
}

export async function GET() {
  return NextResponse.json({
    isIndexing,
    lastIndexTime: lastIndexTime?.toISOString() || null,
    error: indexingError,
  });
}
