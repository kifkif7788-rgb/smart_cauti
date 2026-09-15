'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CHECK5_ITEMS, type Check5Key } from '@/lib/check5';
import { queueAssessment, type QueuedAssessment } from '@/lib/offline';

export interface EpisodeSummary {
  episodeId: string;
  studyCode: string;
  bedNo: string;
  wardCode: string;
  insertDate: string;
  insertDateTh: string;
  foleyDay: number;
}

interface Props {
  episode: EpisodeSummary;
  /** โหมด BASELINE จะไม่พาไปหน้าผลลัพธ์ แต่กลับหน้าแรกพร้อมข้อความยืนยัน */
  studyMode: 'BASELINE' | 'INTERVENTION';
  assessedThisShift: boolean;
}

type AnswerState = Partial<Record<Check5Key, boolean>>;

const ITEM_ACCENT: Record<Check5Key, string> = {
  need: '#1558A0',
  fix: '#6D28D9',
  flow: '#C2670A',
  below: '#BE185D',
  closed: '#0A7E6E',
};

export function Check5Form({ episode, studyMode, assessedThisShift }: Props) {
  const router = useRouter();
  const [answers, setAnswers] = useState<AnswerState>({});
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showMissing, setShowMissing] = useState(false);

  const draftKey = `scg_draft_${episode.episodeId}`;

  // กู้ร่างที่ค้างไว้เมื่อ browser refresh กลางคัน
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(draftKey);
      if (!raw) return;
      const draft = JSON.parse(raw) as { answers?: AnswerState; notes?: string };
      if (draft.answers) setAnswers(draft.answers);
      if (typeof draft.notes === 'string') setNotes(draft.notes);
    } catch {
      // sessionStorage อาจถูกปิดในโหมดส่วนตัว — ไม่ใช่เรื่องร้ายแรง
    }
  }, [draftKey]);

  useEffect(() => {
    try {
      sessionStorage.setItem(draftKey, JSON.stringify({ answers, notes }));
    } catch {
      /* ไม่ทำอะไร */
    }
  }, [answers, notes, draftKey]);

  const answeredCount = useMemo(
    () => CHECK5_ITEMS.filter((i) => answers[i.key] !== undefined).length,
    [answers],
  );
  const complete = answeredCount === CHECK5_ITEMS.length;

  const setAnswer = useCallback((key: Check5Key, value: boolean) => {
    setAnswers((prev) => ({ ...prev, [key]: value }));
    setError(null);
  }, []);

  async function handleSubmit() {
    if (!complete) {
      setShowMissing(true);
      const firstMissing = CHECK5_ITEMS.find((i) => answers[i.key] === undefined);
      if (firstMissing) {
        document
          .getElementById(`check5-${firstMissing.key}`)
          ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    setSubmitting(true);
    setError(null);

    const payload: QueuedAssessment = {
      clientUuid: crypto.randomUUID(),
      episodeId: episode.episodeId,
      answers: answers as Record<Check5Key, boolean>,
      notes: notes.trim() || undefined,
      queuedAt: new Date().toISOString(),
    };

    try {
      const response = await fetch('/api/assessments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? 'บันทึกไม่สำเร็จ');
      }

      const data = (await response.json()) as { assessmentId: string };
      sessionStorage.removeItem(draftKey);

      if (studyMode === 'BASELINE') {
        router.push('/?saved=1');
      } else {
        router.push(`/result/${data.assessmentId}`);
      }
      return;
    } catch (submitError) {
      // ออฟไลน์หรือเซิร์ฟเวอร์ไม่ตอบ — เก็บเข้าคิวแทนการทิ้งข้อมูล
      const offline = !navigator.onLine;
      if (offline) {
        try {
          await queueAssessment(payload);
          sessionStorage.removeItem(draftKey);
          router.push('/?queued=1');
          return;
        } catch {
          setError('ไม่สามารถบันทึกลงเครื่องได้ กรุณาลองใหม่');
        }
      } else {
        setError(
          submitError instanceof Error ? submitError.message : 'บันทึกไม่สำเร็จ',
        );
      }
      setSubmitting(false);
    }
  }

  return (
    <div className="pb-28">
      {/* ── แถบข้อมูลผู้ป่วย ─────────────────────────────────────── */}
      <section className="surface mx-4 mt-4 overflow-hidden">
        <div
          className="flex items-center justify-between gap-3 px-4 py-3"
          style={{ background: 'var(--surface-2)' }}
        >
          <div className="min-w-0">
            <div className="text-[11px] font-bold tracking-wider" style={{ color: 'var(--muted)' }}>
              STUDY ID
            </div>
            <div className="truncate text-lg font-extrabold">{episode.studyCode}</div>
          </div>
          <div
            className="shrink-0 rounded-xl px-3 py-2 text-center"
            style={{
              background: episode.foleyDay >= 3 ? 'var(--correct-bg)' : 'var(--surface)',
              border: `1.5px solid ${episode.foleyDay >= 3 ? 'var(--correct)' : 'var(--border)'}`,
            }}
          >
            <div
              className="text-[10px] font-bold tracking-wider"
              style={{ color: episode.foleyDay >= 3 ? 'var(--correct)' : 'var(--muted)' }}
            >
              FOLEY DAY
            </div>
            <div
              className="text-xl font-extrabold tabular-nums"
              style={{ color: episode.foleyDay >= 3 ? 'var(--correct)' : 'var(--text)' }}
            >
              {episode.foleyDay}
            </div>
          </div>
        </div>

        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 px-4 py-3 text-sm">
          <div>
            <dt className="text-xs" style={{ color: 'var(--muted)' }}>หอผู้ป่วย / เตียง</dt>
            <dd className="font-semibold">{episode.wardCode} / {episode.bedNo}</dd>
          </div>
          <div>
            <dt className="text-xs" style={{ color: 'var(--muted)' }}>วันที่ใส่สาย</dt>
            <dd className="font-semibold">{episode.insertDateTh}</dd>
          </div>
        </dl>

        {episode.foleyDay >= 3 && (
          <div
            className="border-t px-4 py-2.5 text-[13px] font-semibold"
            style={{
              borderColor: 'var(--rule)',
              background: 'var(--correct-bg)',
              color: 'var(--correct)',
            }}
          >
            คาสายมา {episode.foleyDay} วัน — ควรทบทวนข้อบ่งชี้ในข้อ NEED
          </div>
        )}
      </section>

      {assessedThisShift && (
        <div
          className="mx-4 mt-3 rounded-xl px-4 py-3 text-[13px]"
          style={{ background: 'var(--surface-2)', color: 'var(--muted)' }}
        >
          ผู้ป่วยรายนี้ได้รับการประเมินในเวรนี้แล้ว หากประเมินซ้ำระบบจะบันทึกเป็นอีกรายการ
        </div>
      )}

      {/* ── ความคืบหน้า ──────────────────────────────────────────── */}
      <div className="mx-4 mt-5 flex items-center gap-3">
        <div
          className="h-2 flex-1 overflow-hidden rounded-full"
          style={{ background: 'var(--surface-2)' }}
        >
          <div
            className="h-full rounded-full transition-all duration-200"
            style={{
              width: `${(answeredCount / CHECK5_ITEMS.length) * 100}%`,
              background: complete ? 'var(--pass)' : 'var(--primary)',
            }}
          />
        </div>
        <span className="text-sm font-bold tabular-nums" style={{ color: 'var(--muted)' }}>
          {answeredCount}/{CHECK5_ITEMS.length}
        </span>
      </div>

      {/* ── คำถาม 5 ข้อ ─────────────────────────────────────────── */}
      <div className="mt-4 space-y-3 px-4">
        {CHECK5_ITEMS.map((item) => {
          const value = answers[item.key];
          const missing = showMissing && value === undefined;
          return (
            <fieldset
              key={item.key}
              id={`check5-${item.key}`}
              className="surface p-4"
              style={missing ? { borderColor: 'var(--correct)', borderWidth: 2 } : undefined}
            >
              <legend className="sr-only">
                ข้อ {item.order} {item.label}
              </legend>

              <div className="flex items-start gap-3">
                <div
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm font-extrabold text-white"
                  style={{ background: ITEM_ACCENT[item.key] }}
                  aria-hidden="true"
                >
                  {item.order}
                </div>
                <div className="min-w-0 flex-1">
                  <div
                    className="text-[11px] font-bold tracking-wider"
                    style={{ color: 'var(--muted)' }}
                  >
                    {item.label} · {item.labelTh}
                  </div>
                  <p className="mt-0.5 text-[17px] font-bold leading-snug">
                    {item.question}
                  </p>
                  <p className="mt-1 text-[13px]" style={{ color: 'var(--muted)' }}>
                    {item.hint}
                  </p>
                </div>
              </div>

              <div className="mt-3 flex gap-2.5" role="radiogroup" aria-label={item.question}>
                <button
                  type="button"
                  role="radio"
                  aria-checked={value === true}
                  onClick={() => setAnswer(item.key, true)}
                  className="answer-btn flex-1"
                  data-selected={value === true ? 'yes' : undefined}
                >
                  ใช่
                </button>
                <button
                  type="button"
                  role="radio"
                  aria-checked={value === false}
                  onClick={() => setAnswer(item.key, false)}
                  className="answer-btn flex-1"
                  data-selected={value === false ? 'no' : undefined}
                >
                  ไม่ใช่
                </button>
              </div>

              {missing && (
                <p className="mt-2 text-[13px] font-semibold" style={{ color: 'var(--correct)' }}>
                  ยังไม่ได้ตอบข้อนี้
                </p>
              )}
            </fieldset>
          );
        })}

        {/* ── หมายเหตุ ──────────────────────────────────────────── */}
        <div className="surface p-4">
          <label htmlFor="assessment-notes" className="text-sm font-bold">
            หมายเหตุ <span style={{ color: 'var(--muted)' }}>(ถ้ามี)</span>
          </label>
          <textarea
            id="assessment-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value.slice(0, 500))}
            rows={3}
            placeholder="พิมพ์ข้อสังเกตเพิ่มเติม…"
            className="mt-2 w-full resize-none rounded-lg border px-3 py-2.5 text-[15px]"
            style={{
              background: 'var(--surface-2)',
              borderColor: 'var(--border)',
              color: 'var(--text)',
            }}
          />
          <div className="mt-1 text-right text-xs tabular-nums" style={{ color: 'var(--muted)' }}>
            {notes.length}/500
          </div>
        </div>

        {error && (
          <div
            className="rounded-xl border-l-4 px-4 py-3 text-[13px] font-semibold"
            style={{
              background: 'var(--review-bg)',
              borderColor: 'var(--review)',
              color: 'var(--review)',
            }}
            role="alert"
          >
            {error}
          </div>
        )}
      </div>

      {/* ── ปุ่มส่ง — ติดล่างจอเพื่อให้กดด้วยมือเดียวได้ ─────────── */}
      <div
        className="fixed inset-x-0 bottom-0 z-30 border-t px-4 pt-3"
        style={{
          background: 'var(--surface)',
          borderColor: 'var(--border)',
          paddingBottom: 'calc(12px + env(safe-area-inset-bottom, 0px))',
        }}
      >
        <div className="mx-auto max-w-2xl">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="btn-primary w-full text-[16px]"
          >
            {submitting ? 'กำลังบันทึก…' : complete ? 'ส่งข้อมูล' : `ตอบให้ครบ 5 ข้อ (${answeredCount}/5)`}
          </button>
        </div>
      </div>
    </div>
  );
}
