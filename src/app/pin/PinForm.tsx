'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { isWeakPin, PIN_LENGTH } from '@/lib/pin';

const FIELD_STYLE = {
  background: 'var(--surface-2)',
  borderColor: 'var(--border)',
  color: 'var(--text)',
  minHeight: '50px',
} as const;

function PinField({
  id,
  label,
  autoComplete,
  value,
  onChange,
  disabled,
}: {
  id: string;
  label: string;
  autoComplete: 'current-password' | 'new-password';
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
}) {
  return (
    <div>
      <label htmlFor={id} className="text-sm font-bold">
        {label}
      </label>
      <input
        id={id}
        name={id}
        type="password"
        inputMode="numeric"
        pattern="[0-9]{6}"
        maxLength={PIN_LENGTH}
        autoComplete={autoComplete}
        required
        disabled={disabled}
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, PIN_LENGTH))}
        className="mt-1.5 w-full rounded-lg border px-3.5 text-[20px] tracking-[0.4em] tabular-nums"
        style={FIELD_STYLE}
      />
    </div>
  );
}

/**
 * ตั้ง PIN ใหม่ด้วยตัวเอง
 *
 * ตรวจกฎเดียวกับฝั่ง server ตั้งแต่ในเบราว์เซอร์เพื่อบอกปัญหาได้ทันที
 * แต่ฝั่ง server ยังตรวจซ้ำเสมอ ตรงนี้เป็นแค่การช่วยผู้ใช้ ไม่ใช่ด่านกัน
 */
export function PinForm({ forced }: { forced: boolean }) {
  const router = useRouter();
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  const complete = [currentPin, newPin, confirmPin].every((p) => p.length === PIN_LENGTH);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (busy || !complete) return;

    if (newPin !== confirmPin) {
      setError('PIN ใหม่ทั้งสองช่องไม่ตรงกัน');
      return;
    }
    if (newPin === currentPin) {
      setError('PIN ใหม่ต้องไม่ซ้ำกับ PIN เดิม');
      return;
    }
    if (isWeakPin(newPin)) {
      setError('PIN นี้เดาง่ายเกินไป หลีกเลี่ยงเลขซ้ำ เลขเรียง และชุดที่ใช้กันทั่วไป');
      return;
    }

    setBusy(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPin, newPin }),
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as { error?: string };
        setError(data.error ?? 'เปลี่ยน PIN ไม่สำเร็จ กรุณาลองใหม่');
        setBusy(false);
        return;
      }

      setDone(true);
      setCurrentPin('');
      setNewPin('');
      setConfirmPin('');
      router.refresh();
    } catch {
      setError('เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ กรุณาตรวจสอบสัญญาณ');
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="surface p-5 text-center">
        <p className="text-base font-extrabold" style={{ color: 'var(--pass)' }}>
          ตั้ง PIN ใหม่เรียบร้อย
        </p>
        <p className="mt-1.5 text-[13px]" style={{ color: 'var(--muted)' }}>
          ครั้งต่อไปให้เข้าสู่ระบบด้วย PIN ใหม่นี้
        </p>
        <button
          type="button"
          onClick={() => router.push('/')}
          className="btn-primary mt-4 w-full text-[16px]"
        >
          ไปหน้าแรก
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="surface space-y-4 p-5">
      {forced && (
        <p
          className="rounded-lg px-3 py-2.5 text-[13px] leading-relaxed font-semibold"
          style={{ background: 'var(--correct-bg)', color: 'var(--correct)' }}
        >
          บัญชีนี้ยังใช้ PIN ตั้งต้นที่ให้มาพร้อมกันหลายคน
          ตั้ง PIN ของตัวเองก่อนจึงจะใช้งานส่วนอื่นได้
        </p>
      )}

      <PinField
        id="current-pin"
        label="PIN ปัจจุบัน"
        autoComplete="current-password"
        value={currentPin}
        onChange={(v) => {
          setCurrentPin(v);
          setError(null);
        }}
        disabled={busy}
      />
      <PinField
        id="new-pin"
        label="PIN ใหม่ 6 หลัก"
        autoComplete="new-password"
        value={newPin}
        onChange={(v) => {
          setNewPin(v);
          setError(null);
        }}
        disabled={busy}
      />
      <PinField
        id="confirm-pin"
        label="ยืนยัน PIN ใหม่"
        autoComplete="new-password"
        value={confirmPin}
        onChange={(v) => {
          setConfirmPin(v);
          setError(null);
        }}
        disabled={busy}
      />

      <p className="text-[12.5px] leading-relaxed" style={{ color: 'var(--muted)' }}>
        อย่าใช้เลขซ้ำ เลขเรียง หรือชุดที่คนอื่นเดาได้ เช่น วันเกิด
        และอย่าบอก PIN ให้ผู้อื่น เพราะระบบบันทึกทุกการประเมินในชื่อเจ้าของบัญชี
      </p>

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
        disabled={busy || !complete}
        className="btn-primary w-full text-[16px]"
      >
        {busy ? 'กำลังบันทึก…' : 'บันทึก PIN ใหม่'}
      </button>
    </form>
  );
}
