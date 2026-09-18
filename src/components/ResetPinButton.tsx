'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

/**
 * ปุ่มตั้ง PIN ใหม่ให้พนักงานที่ลืม PIN
 *
 * PIN ที่ได้แสดงครั้งเดียวตรงนี้ ปิดแล้วดูซ้ำไม่ได้ เพราะระบบเก็บแต่ hash
 * ถ้าแอดมินปิดไปก่อนบอกเจ้าตัว ต้องกดตั้งใหม่อีกครั้ง
 */
export function ResetPinButton({
  userId,
  employeeId,
}: {
  userId: string;
  employeeId: string;
}) {
  const router = useRouter();
  const [pin, setPin] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function reset() {
    if (busy) return;
    if (!window.confirm(`ตั้ง PIN ใหม่ให้ ${employeeId}? PIN เดิมจะใช้ไม่ได้ทันที`)) return;

    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/users/${userId}/reset-pin`, { method: 'POST' });
      const data = (await response.json().catch(() => ({}))) as { pin?: string; error?: string };
      if (!response.ok || !data.pin) {
        setError(data.error ?? 'ตั้ง PIN ใหม่ไม่สำเร็จ');
        setBusy(false);
        return;
      }
      setPin(data.pin);
      router.refresh();
    } catch {
      setError('เชื่อมต่อเซิร์ฟเวอร์ไม่ได้');
    }
    setBusy(false);
  }

  if (pin) {
    return (
      <div
        className="mt-2 w-full rounded-lg px-3 py-2.5 text-[13px]"
        style={{ background: 'var(--correct-bg)', color: 'var(--correct)' }}
      >
        <div className="font-bold">
          PIN ใหม่ของ {employeeId} คือ{' '}
          <span className="text-[17px] tracking-[0.25em] tabular-nums">{pin}</span>
        </div>
        <p className="mt-1 leading-relaxed">
          บอกเจ้าตัวเดี๋ยวนี้ หน้านี้แสดงครั้งเดียวและดูย้อนหลังไม่ได้
          แนะนำให้เจ้าตัวตั้ง PIN ของตัวเองต่อที่เมนู "เปลี่ยน PIN"
        </p>
        <button
          type="button"
          onClick={() => setPin(null)}
          className="mt-2 text-[12.5px] font-bold underline"
        >
          รับทราบแล้ว ปิดข้อความนี้
        </button>
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={reset}
        disabled={busy}
        className="shrink-0 rounded-full px-3 py-1.5 text-[12px] font-bold"
        style={{ background: 'var(--surface-2)', color: 'var(--muted)' }}
      >
        {busy ? 'กำลังตั้ง…' : 'ตั้ง PIN ใหม่'}
      </button>
      {error && (
        <p role="alert" className="mt-1 text-[12px] font-semibold" style={{ color: 'var(--review)' }}>
          {error}
        </p>
      )}
    </>
  );
}
