'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface Props {
  tagCode: string;
  wardCode: string;
  bedNo: string;
  today: string;
}

export function BindTagForm({ tagCode, wardCode, bedNo, today }: Props) {
  const router = useRouter();
  const [hn, setHn] = useState('');
  const [insertDate, setInsertDate] = useState(today);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** เมื่อ HN นี้คาสายอยู่เตียงอื่น — ทางลัดไปหน้าเตียงนั้นเพื่อกดย้ายเตียง */
  const [existing, setExisting] = useState<{ tagCode: string; bedNo: string } | null>(
    null,
  );

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setExisting(null);

    try {
      const response = await fetch('/api/episodes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tagCode, hn: hn.trim(), insertDate }),
      });

      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
        existingBedNo?: string;
        existingTagCode?: string;
      };

      if (!response.ok) {
        // HN นี้คาสายอยู่ที่เตียงอื่น — เสนอทางย้ายเตียงแทนการเปิดรายการใหม่
        if (data.existingTagCode && data.existingBedNo) {
          setExisting({ tagCode: data.existingTagCode, bedNo: data.existingBedNo });
        }
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
      {/* ── เตียงที่สแกน ────────────────────────────────────────── */}
      <div
        className="flex items-center gap-4 rounded-2xl px-5 py-4"
        style={{ background: 'var(--primary)' }}
      >
        <div
          className="flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-xl"
          style={{ background: 'rgba(255,255,255,.18)' }}
        >
          <span className="text-[10px] font-bold tracking-wider text-white/75">เตียง</span>
          <span className="text-2xl font-extrabold leading-none text-white tabular-nums">
            {bedNo}
          </span>
        </div>
        <div className="min-w-0">
          <div className="font-extrabold text-white">เตียงนี้ยังว่าง</div>
          <div className="text-[13px] text-white/75">
            ลงทะเบียนผู้ป่วยที่คาสายสวนเพื่อเริ่มการประเมิน
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="surface mt-4 space-y-4 p-4">
        <div>
          <label htmlFor="hn" className="text-sm font-bold">
            HN ผู้ป่วย
          </label>
          <input
            id="hn"
            value={hn}
            onChange={(e) => setHn(e.target.value.toUpperCase().slice(0, 15))}
            required
            inputMode="numeric"
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            placeholder="เช่น 1234567"
            className="mt-1.5 w-full rounded-lg border px-3.5 text-[20px] font-semibold tracking-wide tabular-nums"
            style={inputStyle}
          />
          <p className="mt-1.5 text-[12.5px]" style={{ color: 'var(--muted)' }}>
            ระบบจะสร้างรหัสงานวิจัยให้อัตโนมัติ HN ใช้เฉพาะในหน้าจอนี้และไม่ปรากฏในไฟล์ข้อมูลวิจัย
          </p>
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
          <p className="mt-1.5 text-[12.5px]" style={{ color: 'var(--muted)' }}>
            หากใส่สายมาจากหน่วยงานอื่น ให้กรอกวันที่ใส่จริง ไม่ใช่วันที่รับเข้าหอ
          </p>
        </div>

        <div
          className="rounded-lg px-3 py-2.5 text-[12.5px] leading-relaxed"
          style={{ background: 'var(--surface-2)', color: 'var(--muted)' }}
        >
          ป้าย <strong>{tagCode}</strong> · หอผู้ป่วย {wardCode} · เตียง {bedNo}
        </div>

        {error && (
          <div
            role="alert"
            className="rounded-lg px-3 py-2.5 text-[13px] font-semibold"
            style={{ background: 'var(--review-bg)', color: 'var(--review)' }}
          >
            {error}
            {existing && (
              <button
                type="button"
                onClick={() => router.push(`/assess/${existing.tagCode}`)}
                className="mt-2 block w-full rounded-lg px-3 py-2.5 text-[13px] font-bold text-white"
                style={{ background: 'var(--review)' }}
              >
                ไปที่เตียง {existing.bedNo} เพื่อย้ายผู้ป่วยมาเตียง {bedNo}
              </button>
            )}
          </div>
        )}

        <button
          type="submit"
          disabled={busy || hn.trim().length < 4}
          className="btn-primary w-full text-[16px]"
        >
          {busy ? 'กำลังบันทึก…' : 'ลงทะเบียนและเริ่มประเมิน'}
        </button>
      </form>
    </main>
  );
}
