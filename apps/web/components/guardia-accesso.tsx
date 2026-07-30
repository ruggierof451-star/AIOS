'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { tokenCorrente } from '@/lib/api/client';

/** Se non c'è una sessione, si torna all'accesso. */
export function GuardiaAccesso() {
  const router = useRouter();
  useEffect(() => {
    if (!tokenCorrente()) router.replace('/accesso');
  }, [router]);
  return null;
}
