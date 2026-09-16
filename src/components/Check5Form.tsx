'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { BundleIcon, UiIcon } from '@/components/UiIcon';
import {
  CHECK5_ITEMS,
  NURSE_LEVEL,
  isNurseLevel,
  type Check5Key,
  type NurseLevel,
} from '@/lib/check5';
import { queueAssessment, type QueuedAssessment } from '@/lib/offline';

export interface EpisodeSummary {
  episodeId: string;
  hn: string;
  studyCode: string;
  bedNo: string;
  wardCode: string;
  insertDate: string;
  insertDateTh: string;
  foleyDay: number;
}

interface Props {
  episode: EpisodeSummary;
  /** โหมดบันทึกข้อมูลโครงการ; ทุกโหมดเปิดหน้าผลหลังบันทึกสำเร็จ */
  studyMode: 'BASELINE' | 'INTERVENTION';
  assessedThisShift: boolean;
  /** ปุ่มจัดการผู้ป่วย (ย้ายเตียง / ปิดรายการ) แสดงท้ายหน้า */
  children?: React.ReactNode;
  /** Only used by the development design preview; never writes an assessment. */
  preview?: boolean;
}

type AnswerState = Partial<Record<Check5Key, boolean>>;

export function Check5Form({
  episode,
  assessedThisShift,
  children,
  preview = false,
}: Props) {
  const router = useRouter();
  const [answers, setAnswers] = useState<AnswerState>({});
  const [nurseLevel, setNurseLevel] = useState<NurseLevel | null>(null);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [previewSaved, setPreviewSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showMissing, setShowMissing] = useState(false);

  const draftKey = `scg_draft_${episode.episodeId}`;

  // กู้ร่างที่ค้างไว้เมื่อ browser refresh กลางคัน
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(draftKey);
      if (!raw) return;
      const draft = JSON.parse(raw) as {
        answers?: AnswerState;
        notes?: string;
        nurseLevel?: unknown;
      };
      if (draft.answers) setAnswers(draft.answers);
      if (typeof draft.notes === 'string') setNotes(draft.notes);
      if (isNurseLevel(draft.nurseLevel)) setNurseLevel(draft.nurseLevel);
    } catch {
      // sessionStorage อาจถูกปิดในโหมดส่วนตัว — ไม่ใช่เรื่องร้ายแรง
    }
  }, [draftKey]);

  useEffect(() => {
    try {
      sessionStorage.setItem(draftKey, JSON.stringify({ answers, notes, nurseLevel }));
    } catch {
      /* ไม่ทำอะไร */
    }
  }, [answers, notes, nurseLevel, draftKey]);

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

    if (!nurseLevel) {
      setShowMissing(true);
      setError('กรุณาเลือกว่าผู้ประเมินเป็น RN หรือ PN');
      document
        .getElementById('nurse-level')
        ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    if (preview) { setPreviewSaved(true); return; }

    setSubmitting(true);
    setError(null);

    const payload: QueuedAssessment = {
      clientUuid: crypto.randomUUID(),
      episodeId: episode.episodeId,
      answers: answers as Record<Check5Key, boolean>,
      nurseLevel,
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

      router.push(`/result/${data.assessmentId}`);
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
    <div className="assessment-page pb-28">
      {/* ── ความคืบหน้า ──────────────────────────────────────────── */}
      <div className="assessment-progress mx-4 mt-5 flex items-center gap-3">
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

      <section className="patient-card" aria-label="ยืนยันข้อมูลผู้ป่วย">
        <div className="patient-avatar"><UiIcon name="user"/><span>เตียง {episode.bedNo}</span></div>
        <dl className="patient-details">
          <div><dt>HN :</dt><dd className="font-bold">{episode.hn}</dd></div>
          <div><dt>หอผู้ป่วย :</dt><dd>{episode.wardCode}</dd></div>
          <div><dt>วันที่ใส่สาย :</dt><dd>{episode.insertDateTh}</dd></div>
          <div><dt>รหัสวิจัย :</dt><dd>{episode.studyCode}</dd></div>
          <div><dt>Foley Day :</dt><dd><span className="foley-pill" data-review={episode.foleyDay >= 3}>{episode.foleyDay}</span></dd></div>
        </dl>
      </section>
      {episode.foleyDay >= 3 && <p className="foley-reminder"><UiIcon name="bell"/>คาสายมา {episode.foleyDay} วัน — ควรทบทวนข้อบ่งชี้ในข้อ NEED</p>}

      {assessedThisShift && (
        <div
          className="mx-4 mt-3 rounded-xl px-4 py-3 text-[13px]"
          style={{ background: 'var(--surface-2)', color: 'var(--muted)' }}
        >
          ผู้ป่วยรายนี้ได้รับการประเมินในเวรนี้แล้ว หากประเมินซ้ำระบบจะบันทึกเป็นอีกรายการ
        </div>
      )}

      <div className="check-heading"><h2>CAUTI BUNDLE CHECK 5</h2><p>กรุณาประเมินสภาพผู้ป่วยในวันนี้</p></div>

      {/* ── คำถาม 5 ข้อ ─────────────────────────────────────────── */}
      <div className="mt-4 space-y-3 px-4">
        {CHECK5_ITEMS.map((item) => {
          const value = answers[item.key];
          const missing = showMissing && value === undefined;
          return (
            <fieldset
              key={item.key}
              id={`check5-${item.key}`}
              className="check-card"
              data-item={item.key}
              aria-invalid={missing || undefined}
              style={missing ? { borderColor: 'var(--correct)', borderWidth: 2 } : undefined}
            >
              <legend className="sr-only">
                ข้อ {item.order} {item.label}
              </legend>

              <div className="check-question">
                <BundleIcon name={item.key}/>
                <div className="check-copy">
                  <h3>{item.order}. {item.label}</h3>
                  <p>{item.question}</p>
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

              <details className="check-hint"><summary>แนวทางตรวจสอบ</summary><p>{item.hint}</p></details>

              {missing && (
                <p className="mt-2 text-[13px] font-semibold" style={{ color: 'var(--correct)' }}>
                  ยังไม่ได้ตอบข้อนี้
                </p>
              )}
            </fieldset>
          );
        })}

        {/* ── ผู้ประเมิน ────────────────────────────────────────── */}
        <fieldset id="nurse-level" className="assessment-notes">
          <legend className="text-sm font-bold">ผู้ประเมิน</legend>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {(Object.keys(NURSE_LEVEL) as NurseLevel[]).map((level) => {
              const active = nurseLevel === level;
              return (
                <label
                  key={level}
                  className="flex items-center justify-center gap-2 rounded-lg border px-3 py-3 text-[15px] font-bold"
                  style={{
                    background: active ? 'var(--primary)' : 'var(--surface-2)',
                    borderColor: active ? 'var(--primary)' : 'var(--border)',
                    color: active ? '#fff' : 'var(--text)',
                  }}
                >
                  <input
                    type="radio"
                    name="nurse-level"
                    className="sr-only"
                    checked={active}
                    onChange={() => {
                      setNurseLevel(level);
                      setError(null);
                    }}
                  />
                  {NURSE_LEVEL[level]}
                </label>
              );
            })}
          </div>
          {showMissing && !nurseLevel && (
            <p className="mt-1.5 text-[12.5px] font-semibold" style={{ color: 'var(--review)' }}>
              ยังไม่ได้เลือกผู้ประเมิน
            </p>
          )}
        </fieldset>

        {/* ── หมายเหตุ ──────────────────────────────────────────── */}
        <div className="assessment-notes">
          <label htmlFor="assessment-notes" className="text-sm font-bold">
            หมายเหตุ <span style={{ color: 'var(--muted)' }}>(ถ้ามี)</span>
          </label>
          <textarea
            id="assessment-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value.slice(0, 500))}
            rows={2}
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

        {previewSaved && <p role="status" className="surface p-4 text-sm">ตัวอย่าง: ตอบครบ 5 ข้อแล้ว ข้อมูลนี้ไม่ได้ส่งเข้าระบบ</p>}

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

        {children}
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
            className="btn-primary submit-assessment w-full text-[16px]"
          >
            <UiIcon name="send"/>
            {submitting ? 'กำลังบันทึก…' : complete ? 'ส่งข้อมูล' : `ตอบให้ครบ 5 ข้อ (${answeredCount}/5)`}
          </button>
        </div>
      </div>
    </div>
  );
}
