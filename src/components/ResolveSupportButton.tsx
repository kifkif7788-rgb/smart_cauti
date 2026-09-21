'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

/**
 * ปิดเรื่องที่แจ้งมา พร้อมเขียนคำตอบให้ผู้แจ้งเห็น
 *
 * คำตอบไม่บังคับ แต่เปิดช่องไว้เพราะผู้แจ้งเห็นแค่สถานะ "แก้ไขแล้ว"
 * โดยไม่รู้ว่าแก้อย่างไร มักจะกลับมาถามซ้ำ
 */
export function ResolveSupportButton({ requestId }: { requestId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function resolve() {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/support/${requestId}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note: note.trim() || null }),
      });
      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as { error?: string };
        setError(data.error ?? 'ปิดเรื่องไม่สำเร็จ');
        setBusy(false);
        return;
      }
      setOpen(false);
      router.refresh();
    } catch {
      setError('เชื่อมต่อเซิร์ฟเวอร์ไม่ได้');
    }
    setBusy(false);
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-2 w-full rounded-lg px-3 py-2.5 text-[13px] font-bold"
        style={{ background: 'var(--surface-2)', color: 'var(--primary)' }}
      >
        ทำเครื่องหมายว่าแก้ไขแล้ว
      </button>
    );
  }

  return (
    <div className="mt-2">
      <label htmlFor={`note-${requestId}`} className="text-[12.5px] font-bold">
        แก้ไขอย่างไร <span style={{ color: 'var(--muted)' }}>(ผู้แจ้งจะเห็นข้อความนี้)</span>
      </label>
      <textarea
        id={`note-${requestId}`}
        rows={3}
        maxLength={500}
        value={note}
        onChange={(e) => setNote(e.target.value)}
        className="mt-1 w-full rounded-lg border px-3 py-2 text-[14px]"
        style={{ background: 'var(--surface-2)', borderColor: 'var(--border)', color: 'var(--text)' }}
      />
      {error && (
        <p role="alert" className="mt-1 text-[12px] font-semibold" style={{ color: 'var(--review)' }}>
          {error}
        </p>
      )}
      <div className="mt-2 flex gap-2">
        <button
          type="button"
          onClick={resolve}
          disabled={busy}
          className="btn-primary flex-1 text-[14px]"
          style={{ minHeight: '44px' }}
        >
          {busy ? 'กำลังปิดเรื่อง…' : 'ปิดเรื่อง'}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          disabled={busy}
          className="rounded-lg px-4 text-[13px] font-bold"
          style={{ color: 'var(--muted)' }}
        >
          ยกเลิก
        </button>
      </div>
    </div>
  );
}
