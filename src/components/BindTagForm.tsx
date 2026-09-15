'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface Props {
  tagCode: string;
  wardCode: string;
  today: string;
}

export function BindTagForm({ tagCode, wardCode, today }: Props) {
  const router = useRouter();
  const [studyCode, setStudyCode] = useState('');
  const [bedNo, setBedNo] = useState('');
  const [insertDate, setInsertDate] = useState(today);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);

    try {
      const response = await fetch('/api/episodes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tagCode,
          studyCode: studyCode.trim(),
          bedNo: bedNo.trim(),
          insertDate,
        }),
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? 'บันทึกไม่สำเร็จ');
      }

      router.push(`/assess/${tagCode}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'บันทึกไม่สำเร็จ');
      setBusy(false);
    }
  }

  const inputStyle = {
    background: 'var(--surface-2)',
    borderColor: 'var(--border)',
    color: 'var(--text)',
    minHeight: '50px',
  };

  return (
    <main className="mx-auto max-w-2xl px-4 pb-16 pt-4">
      <div
        className="rounded-xl border-l-4 px-4 py-3 text-[13px] leading-relaxed"
        style={{ background: 'var(--review-bg)', borderColor: 'var(--review)' }}
      >
        <strong style={{ color: 'var(--review)' }}>ห้ามกรอก HN หรือชื่อผู้ป่วย</strong>
        {' — '}
        ป้าย QR ติดอยู่ในตำแหน่งที่ผู้อื่นมองเห็นได้
        กรุณาใช้ Study ID ตามที่หน่วยงานกำหนดเท่านั้น
      </div>

      <form onSubmit={handleSubmit} className="surface mt-4 space-y-4 p-4">
        <div>
          <label htmlFor="study-code" className="text-sm font-bold">
            Study ID
          </label>
          <input
            id="study-code"
            value={studyCode}
            onChange={(e) => setStudyCode(e.target.value)}
            required
            placeholder="เช่น SM-001"
            className="mt-1.5 w-full rounded-lg border px-3.5 text-[16px]"
            style={inputStyle}
          />
        </div>

        <div>
          <label htmlFor="bed-no" className="text-sm font-bold">
            หมายเลขเตียง
          </label>
          <input
            id="bed-no"
            value={bedNo}
            onChange={(e) => setBedNo(e.target.value)}
            required
            inputMode="numeric"
            placeholder="เช่น 12"
            className="mt-1.5 w-full rounded-lg border px-3.5 text-[16px]"
            style={inputStyle}
          />
        </div>

        <div>
          <label htmlFor="insert-date" className="text-sm font-bold">
            วันที่ใส่สายสวน
          </label>
          <input
            id="insert-date"
            type="date"
            value={insertDate}
            max={today}
            onChange={(e) => setInsertDate(e.target.value)}
            required
            className="mt-1.5 w-full rounded-lg border px-3.5 text-[16px]"
            style={inputStyle}
          />
        </div>

        <div
          className="rounded-lg px-3 py-2.5 text-[12.5px] leading-relaxed"
          style={{ background: 'var(--surface-2)', color: 'var(--muted)' }}
        >
          ป้าย <strong>{tagCode}</strong> · หอผู้ป่วย {wardCode}
          <br />
          ติดป้ายบน drainage tubing โดยไม่คร่อม catheter–drainage junction
          และไม่กดทับสาย
        </div>

        {error && (
          <p
            role="alert"
            className="rounded-lg px-3 py-2.5 text-[13px] font-semibold"
            style={{ background: 'var(--review-bg)', color: 'var(--review)' }}
          >
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={busy || !studyCode.trim() || !bedNo.trim()}
          className="btn-primary w-full text-[16px]"
        >
          {busy ? 'กำลังบันทึก…' : 'ผูกป้ายและเริ่มประเมิน'}
        </button>
      </form>
    </main>
  );
}
