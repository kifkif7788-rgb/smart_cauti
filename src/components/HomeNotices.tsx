'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function Notices() {
  const params = useSearchParams();
  const saved = params.get('saved') === '1';
  const queued = params.get('queued') === '1';

  if (!saved && !queued) return null;

  return (
    <div
      className="mb-4 flex items-start gap-3 rounded-xl border-l-4 px-4 py-3"
      role="status"
      style={{
        background: queued ? 'var(--correct-bg)' : 'var(--pass-bg)',
        borderColor: queued ? 'var(--correct)' : 'var(--pass)',
      }}
    >
      <span aria-hidden="true" className="text-lg leading-none">
        {queued ? '📴' : '✅'}
      </span>
      <div className="text-[13px] leading-relaxed">
        {queued ? (
          <>
            <strong>บันทึกไว้ในเครื่องแล้ว</strong> — ขณะนี้ไม่มีสัญญาณ
            ระบบจะส่งข้อมูลให้อัตโนมัติเมื่อกลับมาออนไลน์
          </>
        ) : (
          <strong>บันทึกข้อมูลเรียบร้อย</strong>
        )}
      </div>
    </div>
  );
}

export function HomeNotices() {
  return (
    <Suspense fallback={null}>
      <Notices />
    </Suspense>
  );
}
