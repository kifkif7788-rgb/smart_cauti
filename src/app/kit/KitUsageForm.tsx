'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { UiIcon } from '@/components/UiIcon';

interface Bed {
  bedNo: string;
  tagCode: string;
  occupied: boolean;
}

interface Saved {
  bedNo: string;
  occupied: boolean;
  duplicate: boolean;
  tagCode: string | null;
}

/**
 * บันทึกว่าชุดอุปกรณ์ถูกใช้ที่เตียงใด
 *
 * กรอกเลขเตียงได้โดยตรงเพราะพยาบาลรู้เลขเตียงอยู่แล้วและพิมพ์เร็วกว่าหา
 * ส่วนแถวปุ่มเตียงไว้ให้กดเมื่อสวมถุงมือแล้วพิมพ์ลำบาก
 */
export function KitUsageForm({ kitCode, beds }: { kitCode: string; beds: Bed[] }) {
  const router = useRouter();
  const [bedNo, setBedNo] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState<Saved | null>(null);

  const known = beds.find((b) => b.bedNo === bedNo.trim());

  async function submit(value: string) {
    const bed = value.trim();
    if (busy || bed.length === 0) {
      setError('กรุณากรอกเลขเตียง');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const response = await fetch('/api/kit-usage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kitCode, bedNo: bed, clientUuid: crypto.randomUUID() }),
      });
      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
        bedNo?: string;
        occupied?: boolean;
        duplicate?: boolean;
      };
      if (!response.ok || !data.bedNo) {
        setError(data.error ?? 'บันทึกไม่สำเร็จ กรุณาลองใหม่');
        setBusy(false);
        return;
      }
      setSaved({
        bedNo: data.bedNo,
        occupied: Boolean(data.occupied),
        duplicate: Boolean(data.duplicate),
        tagCode: beds.find((b) => b.bedNo === data.bedNo)?.tagCode ?? null,
      });
      router.refresh();
    } catch {
      setError('เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ กรุณาตรวจสอบสัญญาณ');
    }
    setBusy(false);
  }

  if (saved) {
    return (
      <div className="surface p-5 text-center">
        <p className="text-base font-extrabold" style={{ color: 'var(--pass)' }}>
          บันทึกการใช้ชุดอุปกรณ์ เตียง {saved.bedNo} แล้ว
        </p>

        {saved.occupied ? (
          <p className="mt-2 text-[13px] leading-relaxed" style={{ color: 'var(--muted)' }}>
            เตียงนี้มีผู้ป่วยคาสายอยู่ในระบบแล้ว หากเป็นการเปลี่ยนสายเส้นใหม่
            ให้สแกน QR ที่เตียงนั้น บันทึกถอดสายเดิม แล้วลงทะเบียนสายใหม่
          </p>
        ) : (
          <>
            <p className="mt-2 text-[13px] leading-relaxed" style={{ color: 'var(--muted)' }}>
              เตียงนี้ยังไม่มีผู้ป่วยในระบบ ลงทะเบียนต่อได้เลยเพื่อให้ระบบเริ่มนับวันคาสาย
            </p>
            {saved.tagCode && (
              <Link href={`/bind/${saved.tagCode}`} className="btn-primary mt-4 flex w-full items-center justify-center gap-2 text-[16px]">
                <UiIcon name="arrow" width={20} height={20} />
                ลงทะเบียนผู้ป่วยเตียง {saved.bedNo}
              </Link>
            )}
          </>
        )}

        <div className="mt-3 space-y-2">
          <button
            type="button"
            onClick={() => {
              setSaved(null);
              setBedNo('');
            }}
            className="surface w-full px-4 py-3 text-sm font-bold"
          >
            บันทึกอีกเตียง
          </button>
          <Link href="/" className="home-return">
            <UiIcon name="home" /> กลับหน้าหลัก
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void submit(bedNo);
      }}
      className="surface space-y-4 p-5"
    >
      <div>
        <label htmlFor="kit-bed" className="text-sm font-bold">
          เลขเตียงที่นำชุดอุปกรณ์ไปใช้
        </label>
        <input
          id="kit-bed"
          name="bedNo"
          type="text"
          inputMode="numeric"
          autoComplete="off"
          maxLength={10}
          required
          value={bedNo}
          onChange={(e) => {
            setBedNo(e.target.value);
            setError(null);
          }}
          className="mt-1.5 w-full rounded-lg border px-3.5 text-center text-[26px] font-extrabold tabular-nums"
          style={{
            background: 'var(--surface-2)',
            borderColor: 'var(--border)',
            color: 'var(--text)',
            minHeight: '62px',
          }}
        />
        {bedNo.trim() && !known && (
          <p className="mt-1.5 text-[12.5px] font-semibold" style={{ color: 'var(--correct)' }}>
            ไม่พบเตียง {bedNo.trim()} ในหอผู้ป่วยนี้
          </p>
        )}
        {known?.occupied && (
          <p className="mt-1.5 text-[12.5px]" style={{ color: 'var(--muted)' }}>
            เตียง {known.bedNo} มีผู้ป่วยคาสายอยู่ — บันทึกได้ถ้าเป็นการเปลี่ยนสาย
          </p>
        )}
      </div>

      <div>
        <div className="mb-2 text-[12.5px]" style={{ color: 'var(--muted)' }}>
          หรือแตะเลือกจากเตียงทั้งหมด
        </div>
        <ul className="grid grid-cols-5 gap-2">
          {beds.map((bed) => (
            <li key={bed.tagCode}>
              <button
                type="button"
                onClick={() => {
                  setBedNo(bed.bedNo);
                  setError(null);
                }}
                aria-pressed={bedNo.trim() === bed.bedNo}
                className="w-full rounded-lg border py-2.5 text-[15px] font-bold tabular-nums"
                style={{
                  borderColor: bedNo.trim() === bed.bedNo ? 'var(--primary)' : 'var(--border)',
                  background:
                    bedNo.trim() === bed.bedNo ? 'var(--surface-2)' : 'var(--surface)',
                  color: bed.occupied ? 'var(--muted)' : 'var(--primary)',
                }}
              >
                {bed.bedNo}
              </button>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-[12px]" style={{ color: 'var(--muted)' }}>
          เลขสีจางคือเตียงที่มีผู้ป่วยคาสายอยู่ในระบบแล้ว เลือกได้ถ้าเป็นการเปลี่ยนสาย
        </p>
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
        disabled={busy || bedNo.trim().length === 0}
        className="btn-primary w-full text-[16px]"
      >
        {busy ? 'กำลังบันทึก…' : 'บันทึกการใช้ชุดอุปกรณ์'}
      </button>
    </form>
  );
}
