'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  SUPPORT_CATEGORY,
  looksLikeHn,
  validateSupportMessage,
  MESSAGE_MAX,
  type SupportCategory,
} from '@/lib/support';

/**
 * แจ้งปัญหาถึงผู้ดูแลระบบ
 *
 * กรอกสั้น ๆ ได้จบในหน้าเดียว เพราะคนที่ติดปัญหากลางเวรไม่มีเวลากรอกฟอร์มยาว
 * ประเภทของปัญหาเลือกไว้ล่วงหน้า แอดมินจึงจัดลำดับได้โดยไม่ต้องอ่านทุกเรื่องก่อน
 */
export function SupportForm({ pagePath }: { pagePath: string }) {
  const router = useRouter();
  const [category, setCategory] = useState<SupportCategory | null>(null);
  const [message, setMessage] = useState('');
  const [bedNo, setBedNo] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  const hnWarning = message.length > 0 && looksLikeHn(message);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;

    if (!category) {
      setError('กรุณาเลือกประเภทของปัญหา');
      return;
    }
    const problem = validateSupportMessage(message);
    if (problem) {
      setError(problem);
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const response = await fetch('/api/support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category, message, bedNo: bedNo || null, pagePath }),
      });
      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as { error?: string };
        setError(data.error ?? 'ส่งเรื่องไม่สำเร็จ กรุณาลองใหม่');
        setBusy(false);
        return;
      }
      setSent(true);
      router.refresh();
    } catch {
      setError('เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ กรุณาตรวจสอบสัญญาณ');
      setBusy(false);
    }
  }

  if (sent) {
    return (
      <div className="surface p-5 text-center">
        <p className="text-base font-extrabold" style={{ color: 'var(--pass)' }}>
          ส่งเรื่องถึงผู้ดูแลระบบแล้ว
        </p>
        <p className="mt-1.5 text-[13px] leading-relaxed" style={{ color: 'var(--muted)' }}>
          ผู้ดูแลระบบจะเห็นเรื่องนี้ในรายการที่รอดำเนินการ
          หากเป็นเรื่องด่วนที่กระทบผู้ป่วย ให้แจ้งหัวหน้าเวรควบคู่ไปด้วย
        </p>
        <div className="mt-4 space-y-2">
          <button
            type="button"
            onClick={() => {
              setSent(false);
              setCategory(null);
              setMessage('');
              setBedNo('');
              setBusy(false);
            }}
            className="surface w-full px-4 py-3 text-sm font-bold"
          >
            แจ้งอีกเรื่อง
          </button>
          <button type="button" onClick={() => router.push('/')} className="btn-primary w-full text-[16px]">
            กลับหน้าหลัก
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="surface space-y-4 p-5">
      <fieldset>
        <legend className="text-sm font-bold">เรื่องที่ต้องการแจ้ง</legend>
        <div className="mt-2 space-y-2">
          {(Object.keys(SUPPORT_CATEGORY) as SupportCategory[]).map((key) => (
            <label
              key={key}
              className="flex cursor-pointer items-center gap-3 rounded-lg border px-3.5 py-3 text-[14px]"
              style={{
                borderColor: category === key ? 'var(--primary)' : 'var(--border)',
                background: category === key ? 'var(--surface-2)' : 'transparent',
                fontWeight: category === key ? 700 : 400,
              }}
            >
              <input
                type="radio"
                name="category"
                value={key}
                checked={category === key}
                onChange={() => {
                  setCategory(key);
                  setError(null);
                }}
                className="h-5 w-5 shrink-0"
              />
              {SUPPORT_CATEGORY[key]}
            </label>
          ))}
        </div>
      </fieldset>

      <div>
        <label htmlFor="support-message" className="text-sm font-bold">
          รายละเอียด
        </label>
        <textarea
          id="support-message"
          name="message"
          required
          rows={5}
          maxLength={MESSAGE_MAX}
          value={message}
          onChange={(e) => {
            setMessage(e.target.value);
            setError(null);
          }}
          placeholder="เกิดอะไรขึ้น ทำอะไรอยู่ตอนนั้น และคาดหวังให้เป็นอย่างไร"
          className="mt-1.5 w-full rounded-lg border px-3.5 py-3 text-[15px]"
          style={{
            background: 'var(--surface-2)',
            borderColor: 'var(--border)',
            color: 'var(--text)',
          }}
        />
        <div className="mt-1 text-right text-[12px] tabular-nums" style={{ color: 'var(--muted)' }}>
          {message.length}/{MESSAGE_MAX}
        </div>
      </div>

      {hnWarning && (
        <p
          className="rounded-lg px-3 py-2.5 text-[12.5px] leading-relaxed"
          style={{ background: 'var(--correct-bg)', color: 'var(--correct)' }}
        >
          ดูเหมือนมี HN หรือเลขประจำตัวผู้ป่วยอยู่ในข้อความ ช่องนี้ไม่ใช่เวชระเบียน
          และผู้ดูแลระบบที่อ่านอาจไม่ได้ดูแลผู้ป่วยรายนั้น ถ้าอ้างถึงได้ด้วยเลขเตียง
          หรือรหัสวิจัยจะปลอดภัยกว่า
        </p>
      )}

      <div>
        <label htmlFor="support-bed" className="text-sm font-bold">
          เลขเตียง <span style={{ color: 'var(--muted)' }}>(ถ้าเกี่ยวข้อง)</span>
        </label>
        <input
          id="support-bed"
          name="bedNo"
          type="text"
          inputMode="numeric"
          maxLength={10}
          value={bedNo}
          onChange={(e) => setBedNo(e.target.value)}
          className="mt-1.5 w-full rounded-lg border px-3.5 text-[16px]"
          style={{
            background: 'var(--surface-2)',
            borderColor: 'var(--border)',
            color: 'var(--text)',
            minHeight: '50px',
          }}
        />
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

      <button type="submit" disabled={busy} className="btn-primary w-full text-[16px]">
        {busy ? 'กำลังส่ง…' : 'ส่งเรื่องถึงผู้ดูแลระบบ'}
      </button>
    </form>
  );
}
