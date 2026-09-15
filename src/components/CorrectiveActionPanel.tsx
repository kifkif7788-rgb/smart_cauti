'use client';

import { UiIcon } from '@/components/UiIcon';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { FailedItem, Check5Key } from '@/lib/check5';

interface Props {
  assessmentId: string;
  failedItems: FailedItem[];
  requiresEscalation: boolean;
  alreadyRecorded: string | null;
}

const UNABLE_REASONS = [
  'ผู้ป่วยไม่พร้อม / อยู่ระหว่างหัตถการ',
  'ต้องรอคำสั่งแพทย์',
  'ขาดอุปกรณ์ที่จำเป็น',
  'ต้องใช้ผู้ช่วยเพิ่ม',
];

/**
 * บันทึกการแก้ไขความเสี่ยง
 *
 * มีตัวเลือก "ยังแก้ไขไม่ได้" โดยตั้งใจ — ถ้าให้กดได้แค่ "แก้ไขแล้ว"
 * พยาบาลที่ยังแก้ไม่เสร็จจะถูกบีบให้กดปุ่มนั้นอยู่ดี ทำให้
 * corrective action rate สูงเกินจริงและตีความผลการวิจัยผิด
 */
export function CorrectiveActionPanel({
  assessmentId,
  failedItems,
  requiresEscalation,
  alreadyRecorded,
}: Props) {
  const router = useRouter();
  const correctable = failedItems.filter((f) => f.actionKind === 'CORRECT_NOW');

  const [selected, setSelected] = useState<Set<Check5Key>>(
    new Set(correctable.map((f) => f.key)),
  );
  const [mode, setMode] = useState<'idle' | 'unable'>('idle');
  const [unableReason, setUnableReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(alreadyRecorded);

  async function submit(status: 'CORRECTED' | 'ESCALATED' | 'UNABLE') {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/assessments/${assessmentId}/corrective-action`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            status,
            itemsCorrected: status === 'CORRECTED' ? [...selected] : [],
            unableReason: status === 'UNABLE' ? unableReason : undefined,
          }),
        },
      );

      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? 'บันทึกไม่สำเร็จ');
      }

      setDone(status);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'บันทึกไม่สำเร็จ');
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    const label =
      done === 'CORRECTED'
        ? 'บันทึกการแก้ไขแล้ว'
        : done === 'ESCALATED'
          ? 'แจ้งทีม/แพทย์แล้ว'
          : 'บันทึกว่ายังแก้ไขไม่ได้';
    return (
      <p
        className="mt-4 rounded-xl px-4 py-4 text-center text-sm font-bold"
        style={{ background: 'var(--pass-bg)', color: 'var(--pass)' }}
        role="status"
      >
        ✅ {label}
      </p>
    );
  }

  return (
    <section className="surface mt-4 p-4">
      <h3 className="text-sm font-extrabold">บันทึกการดำเนินการ</h3>

      {correctable.length > 0 && (
        <>
          <p className="mt-1 text-[13px]" style={{ color: 'var(--muted)' }}>
            เลือกข้อที่แก้ไขเรียบร้อยแล้ว
          </p>
          <div className="mt-2.5 space-y-2">
            {correctable.map((item) => {
              const checked = selected.has(item.key);
              return (
                <label
                  key={item.key}
                  className="flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-3"
                  style={{
                    borderColor: checked ? 'var(--pass)' : 'var(--border)',
                    background: checked ? 'var(--pass-bg)' : 'var(--surface-2)',
                    minHeight: '48px',
                  }}
                >
                  <input
                    type="checkbox"
                    id={`fix-${item.key}`}
                    checked={checked}
                    onChange={(e) => {
                      const next = new Set(selected);
                      if (e.target.checked) next.add(item.key);
                      else next.delete(item.key);
                      setSelected(next);
                    }}
                    className="h-5 w-5 shrink-0"
                  />
                  <span className="text-[14px] font-semibold">
                    {item.order}. {item.label}
                  </span>
                </label>
              );
            })}
          </div>
        </>
      )}

      {mode === 'unable' && (
        <div className="mt-3">
          <label htmlFor="unable-reason" className="text-[13px] font-bold">
            เหตุผลที่ยังแก้ไขไม่ได้
          </label>
          <div className="mt-2 flex flex-wrap gap-2">
            {UNABLE_REASONS.map((reason) => (
              <button
                key={reason}
                type="button"
                onClick={() => setUnableReason(reason)}
                className="rounded-full border px-3 py-2 text-[12.5px] font-semibold"
                style={{
                  borderColor: unableReason === reason ? 'var(--primary)' : 'var(--border)',
                  background:
                    unableReason === reason ? 'var(--surface-2)' : 'transparent',
                  color: unableReason === reason ? 'var(--primary)' : 'var(--muted)',
                }}
              >
                {reason}
              </button>
            ))}
          </div>
          <textarea
            id="unable-reason"
            value={unableReason}
            onChange={(e) => setUnableReason(e.target.value.slice(0, 200))}
            rows={2}
            placeholder="หรือพิมพ์เหตุผลอื่น…"
            className="mt-2 w-full resize-none rounded-lg border px-3 py-2.5 text-[15px]"
            style={{
              background: 'var(--surface-2)',
              borderColor: 'var(--border)',
              color: 'var(--text)',
            }}
          />
        </div>
      )}

      {error && (
        <p
          role="alert"
          className="mt-3 rounded-lg px-3 py-2.5 text-[13px] font-semibold"
          style={{ background: 'var(--review-bg)', color: 'var(--review)' }}
        >
          {error}
        </p>
      )}

      <div className="mt-4 space-y-2.5">
        {mode === 'idle' ? (
          <>
            {correctable.length > 0 && (
              <button
                type="button"
                disabled={busy || selected.size === 0}
                onClick={() => submit('CORRECTED')}
                className="btn-primary w-full text-[15px]"
              >
                <span className="action-button-label"><UiIcon name="check"/>{busy ? 'กำลังบันทึก…' : 'บันทึกการแก้ไขแล้ว'}</span>
              </button>
            )}

            {requiresEscalation && (
              <button
                type="button"
                disabled={busy}
                onClick={() => submit('ESCALATED')}
                className="w-full rounded-[10px] border-2 text-[15px] font-bold"
                style={{
                  minHeight: '52px',
                  borderColor: 'var(--review)',
                  color: 'var(--review)',
                  background: 'var(--review-bg)',
                }}
              >
                <span className="action-button-label"><UiIcon name="message"/>แจ้งทีม / แพทย์</span>
              </button>
            )}

            <button
              type="button"
              disabled={busy}
              onClick={() => setMode('unable')}
              className="w-full rounded-[10px] border text-[14px] font-semibold"
              style={{
                minHeight: '48px',
                borderColor: 'var(--border)',
                color: 'var(--muted)',
              }}
            >
              ยังแก้ไขไม่ได้ในขณะนี้
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              disabled={busy || unableReason.trim().length === 0}
              onClick={() => submit('UNABLE')}
              className="btn-primary w-full text-[15px]"
            >
              {busy ? 'กำลังบันทึก…' : 'บันทึกเหตุผล'}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => { setMode('idle'); setUnableReason(''); }}
              className="w-full rounded-[10px] border text-[14px] font-semibold"
              style={{ minHeight: '48px', borderColor: 'var(--border)', color: 'var(--muted)' }}
            >
              ย้อนกลับ
            </button>
          </>
        )}
      </div>
    </section>
  );
}
