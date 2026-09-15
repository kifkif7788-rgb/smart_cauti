'use client';

import { useEffect, useTransition } from 'react';
import { useRouter } from 'next/navigation';

export function DashboardRefresh() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  useEffect(() => {
    const interval = window.setInterval(() => {
      if (document.visibilityState === 'visible') router.refresh();
    }, 60_000);
    return () => window.clearInterval(interval);
  }, [router]);
  return <button type="button" disabled={pending} onClick={() => startTransition(() => router.refresh())} className="min-h-11 underline">{pending ? 'กำลังอัปเดต…' : 'อัปเดตข้อมูล'} <span className="no-underline">· ทุก 60 วินาที</span></button>;
}
