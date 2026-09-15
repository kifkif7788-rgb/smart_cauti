'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { countQueued, syncQueuedAssessments } from '@/lib/offline';

/**
 * แสดงจำนวนรายการที่รอส่ง และ sync อัตโนมัติเมื่อกลับมาออนไลน์
 *
 * ต้องแสดงให้ชัด เพราะถ้าพยาบาลไม่รู้ว่ายังมีข้อมูลค้างอยู่ในเครื่อง
 * แล้วปิดแอปหรือเปลี่ยนเครื่อง ข้อมูลเวรนั้นจะหายไปจากการวิเคราะห์
 */
export function OfflineQueueBadge() {
  const router = useRouter();
  const [count, setCount] = useState(0);
  const [syncing, setSyncing] = useState(false);

  const refresh = useCallback(async () => {
    setCount(await countQueued());
  }, []);

  const runSync = useCallback(async () => {
    if (syncing || !navigator.onLine) return;
    setSyncing(true);
    const result = await syncQueuedAssessments();
    await refresh();
    setSyncing(false);
    if (result.synced > 0) router.refresh();
  }, [syncing, refresh, router]);

  useEffect(() => {
    void refresh().then(() => {
      if (navigator.onLine) void runSync();
    });

    const onOnline = () => void runSync();
    window.addEventListener('online', onOnline);
    return () => window.removeEventListener('online', onOnline);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (count === 0) return null;

  return (
    <div
      className="mb-4 flex items-center gap-3 rounded-xl border-l-4 px-4 py-3"
      role="status"
      style={{ background: 'var(--correct-bg)', borderColor: 'var(--correct)' }}
    >
      <span aria-hidden="true" className="text-lg leading-none">📤</span>
      <div className="flex-1 text-[13px] leading-relaxed">
        <strong>รอส่ง {count} รายการ</strong>
        <div style={{ color: 'var(--muted)' }}>
          {syncing ? 'กำลังส่งข้อมูล…' : 'จะส่งอัตโนมัติเมื่อมีสัญญาณ'}
        </div>
      </div>
      <button
        type="button"
        onClick={() => void runSync()}
        disabled={syncing}
        className="shrink-0 rounded-lg px-3 py-2 text-[13px] font-bold"
        style={{ background: 'var(--correct)', color: '#fff' }}
      >
        ส่งเลย
      </button>
    </div>
  );
}
