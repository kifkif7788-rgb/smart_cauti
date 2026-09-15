'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function LoginForm() {
  const router = useRouter();
  const [employeeId, setEmployeeId] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [showPinPad, setShowPinPad] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (busy || !employeeId.trim() || pin.length !== 6) return;
    setBusy(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeId: employeeId.trim(), pin }),
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as { error?: string };
        setError(data.error ?? 'เข้าสู่ระบบไม่สำเร็จ');
        setPin('');
        setBusy(false);
        return;
      }

      router.push('/');
      router.refresh();
    } catch {
      setError('เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ กรุณาตรวจสอบสัญญาณ');
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="surface space-y-4 p-5">
      <div>
        <label htmlFor="employee-id" className="text-sm font-bold">
          รหัสบุคลากร
        </label>
        <input
          id="employee-id"
          name="employeeId"
          type="text"
          inputMode="text"
          autoComplete="username"
          required
          value={employeeId}
          onFocus={() => setShowPinPad(false)}
          onChange={(e) => setEmployeeId(e.target.value)}
          className="mt-1.5 w-full rounded-lg border px-3.5 text-[16px]"
          style={{
            background: 'var(--surface-2)',
            borderColor: 'var(--border)',
            color: 'var(--text)',
            minHeight: '50px',
          }}
        />
      </div>

      <div>
        <label htmlFor="pin" className="text-sm font-bold">
          PIN 6 หลัก
        </label>
        <input
          id="pin"
          name="pin"
          type="password"
          inputMode="none"
          pattern="[0-9]{6}"
          maxLength={6}
          autoComplete="current-password"
          required
          value={pin}
          onFocus={() => setShowPinPad(true)}
          aria-controls="pin-keypad"
          aria-describedby={showPinPad ? 'pin-keypad-help' : undefined}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
          className="mt-1.5 w-full rounded-lg border px-3.5 text-[20px] tracking-[0.4em] tabular-nums"
          style={{
            background: 'var(--surface-2)',
            borderColor: 'var(--border)',
            color: 'var(--text)',
            minHeight: '50px',
          }}
        />
        {showPinPad && (
          <div id="pin-keypad" className="pin-keypad-panel">
            <p id="pin-keypad-help">กดตัวเลขเพื่อกรอก PIN 6 หลัก</p>
            <div className="pin-keypad" role="group" aria-label="แป้นตัวเลข PIN">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'clear', '0', 'delete'].map((key) => (
                <button
                  key={key}
                  type="button"
                  disabled={busy || (key === 'clear' || key === 'delete' ? pin.length === 0 : pin.length === 6)}
                  aria-label={key === 'clear' ? 'ล้าง PIN ทั้งหมด' : key === 'delete' ? 'ลบตัวเลขล่าสุด' : key}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => {
                    setError(null);
                    setPin((value) => key === 'clear' ? '' : key === 'delete' ? value.slice(0, -1) : (value + key).slice(0, 6));
                  }}
                  className={key === 'clear' || key === 'delete' ? 'pin-keypad-action' : undefined}
                >
                  {key === 'clear' ? 'ล้าง' : key === 'delete' ? '⌫' : key}
                </button>
              ))}
            </div>
          </div>
        )}
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
        disabled={busy || employeeId.trim().length === 0 || pin.length !== 6}
        className="btn-primary w-full text-[16px]"
      >
        {busy ? 'กำลังเข้าสู่ระบบ…' : 'เข้าสู่ระบบ'}
      </button>
    </form>
  );
}
