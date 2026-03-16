'use client';
import { isCapacitor, capacitorNavigate } from '@/lib/capacitor';

import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

/**
 * Redirection vers /messages (Messagerie Rentoall).
 * Conservé pour les anciens liens /conversations.
 */
function ConversationsRedirectContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const conversationId = searchParams.get('conversationId');
    const target = conversationId
      ? `/messages?conversationId=${conversationId}`
      : '/messages';
    router.replace(target);
  }, [router, searchParams]);

  return null;
}

export default function ConversationsRedirect() {
  return (
    <Suspense fallback={null}>
      <ConversationsRedirectContent />
    </Suspense>
  );
}
