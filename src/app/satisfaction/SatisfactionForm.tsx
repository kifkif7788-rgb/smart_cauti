'use client';

import { useState } from 'react';
import {
  COMMENT_MAX,
  SATISFACTION_ITEMS,
  SATISFACTION_SCALE,
  validateScores,
} from '@/lib/satisfaction';

/**
 * แบบสอบถามความพึงพอใจ — ผู้เยี่ยมชมงานตอบจากมือถือตัวเอง
 *
 * ปุ่มคะแนนเป็นวงกลมใหญ่กดง่ายขณะยืน ไม่ใช้ dropdown ซึ่งต้องกดสองครั้งต่อข้อ
 * ทุกข้ออยู่ในหน้าเดียวไม่มีแบ่งหน้า คนที่ยืนกรอกจึงเห็นว่าเหลืออีกกี่ข้อ
 */
export function SatisfactionForm() {
  const [scores, setScores] = useState<(number | null)[]>(
    SATISFACTION_ITEMS.map(() => null),
  );
  const [comment, setComment] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  const answered = scores.filter((s) => s !== null).length;

  function pick(itemIndex: number, score: number) {
    setScores((prev) => prev.map((s, i) => (i === itemIndex ? score : s)));
    setError(null);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;

    const problem = validateScores(scores);
    if (problem) {
      setError(problem);
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const response = await fetch('/api/satisfaction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scores, comment, clientUuid: crypto.randomUUID() }),
      });
      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as { error?: string };
        setError(data.error ?? 'ส่งแบบสอบถามไม่สำเร็จ กรุณาลองใหม่');
        setBusy(false);
        return;
      }
      setSent(true);
    } catch {
      setError('เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ กรุณาตรวจสอบสัญญาณ');
      setBusy(false);
    }
  }

  if (sent) {
    return (
      <div className="surface p-6 text-center">
        <p className="text-lg font-extrabold" style={{ color: 'var(--pass)' }}>
          ขอบคุณสำหรับความคิดเห็น
        </p>
        <p className="mt-2 text-[13px] leading-relaxed" style={{ color: 'var(--muted)' }}>
          ทีมงานจะนำไปปรับปรุงผลงานต่อไป
        </p>
        <button
          type="button"
          onClick={() => {
            setScores(SATISFACTION_ITEMS.map(() => null));
            setComment('');
            setSent(false);
            setBusy(false);
          }}
          className="surface mt-5 w-full px-4 py-3 text-sm font-bold"
        >
          ตอบอีกครั้งสำหรับคนถัดไป
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <ol className="space-y-3">
        {SATISFACTION_ITEMS.map((item, i) => (
          <li key={item} className="surface px-4 py-3.5">
            <p className="text-[14px] font-bold leading-relaxed">
              <span style={{ color: 'var(--muted)' }}>{i + 1}. </span>
              {item}
            </p>
            <div className="mt-3 flex items-start justify-between gap-1.5">
              {SATISFACTION_SCALE.map((label, s) => {
                const score = s + 1;
                const picked = scores[i] === score;
                return (
                  <button
                    key={label}
                    type="button"
                    onClick={() => pick(i, score)}
                    aria-pressed={picked}
                    aria-label={`${item} — ${score} ${label}`}
                    className="flex min-w-0 flex-1 flex-col items-center gap-1"
                  >
                    <span
                      className="flex h-11 w-11 items-center justify-center rounded-full text-[16px] font-extrabold transition-colors"
                      style={{
                        background: picked ? 'var(--primary)' : 'var(--surface-2)',
                        color: picked ? '#fff' : 'var(--muted)',
                        outline: picked ? '2px solid var(--primary)' : 'none',
                        outlineOffset: '2px',
                      }}
                    >
                      {score}
                    </span>
                    <span
                      className="text-center text-[10.5px] leading-tight"
                      style={{ color: picked ? 'var(--primary)' : 'var(--muted)' }}
                    >
                      {label}
                    </span>
                  </button>
                );
              })}
            </div>
          </li>
        ))}
      </ol>

      <div className="surface mt-3 px-4 py-3.5">
        <label htmlFor="comment" className="text-[14px] font-bold">
          ข้อเสนอแนะเพิ่มเติม{' '}
          <span className="font-normal" style={{ color: 'var(--muted)' }}>
            (ไม่บังคับ)
          </span>
        </label>
        <textarea
          id="comment"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={3}
          maxLength={COMMENT_MAX}
          placeholder="สิ่งที่อยากให้ปรับปรุง หรือสิ่งที่ประทับใจ"
          className="mt-2 w-full rounded-lg px-3 py-2.5 text-[14px]"
          style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}
        />
      </div>

      {error && (
        <p
          role="alert"
          className="mt-3 rounded-lg px-3 py-2.5 text-[13px] font-semibold"
          style={{ background: 'var(--review-bg)', color: 'var(--review)' }}
        >
          {error}
        </p>
      )}

      <button type="submit" disabled={busy} className="btn-primary mt-4 w-full text-[16px]">
        {busy
          ? 'กำลังส่ง…'
          : answered < SATISFACTION_ITEMS.length
            ? `ตอบแล้ว ${answered}/${SATISFACTION_ITEMS.length} ข้อ`
            : 'ส่งแบบสอบถาม'}
      </button>
    </form>
  );
}
