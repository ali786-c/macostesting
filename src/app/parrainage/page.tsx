'use client';
import { isCapacitor, capacitorNavigate } from '@/lib/capacitor';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ParrainagePage() {
  const router = useRouter();

  useEffect(() => {
    // Rediriger vers /host/referrals peu importe le mode
    if (isCapacitor()) { capacitorNavigate('/host/referrals'); } else { router.replace('/host/referrals'); }
  }, [router]);

  return null;
}
