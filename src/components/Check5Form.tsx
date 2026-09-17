'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { BundleIcon, UiIcon } from '@/components/UiIcon';
import {
  CHECK5_ITEMS,
  NURSE_LEVEL,
  type Check5Key,
  type NurseLevel,
} from '@/lib/check5';
import { validateDiagnosis, validateSymptoms, type SymptomEntry } from '@/lib/infection';
import { SymptomPicker } from '@/components/SymptomPicker';
import {
  InfectionDetailsFields,
  detailsToPayload,
  EMPTY_DETAILS,
  type DiagnosisDetails,
} from '@/components/InfectionDetailsFields';
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
  /** วันที่ตามเวลาไทย ใช้เป็นเพดานของช่องวันที่ในส่วนวินิจฉัย */
  today: string;
  /** คุณวุฒิผู้ประเมิน — หน้าประเมินถามก่อนเปิดฟอร์มแล้ว จึงมีค่าเสมอ */
  nurseLevel: NurseLevel;
  /** มาจากบัญชีผู้ใช้หรือจากที่เลือกเองที่หน้าแรก — เปลี่ยนคำอธิบายให้ตรง */
  levelFromAccount?: boolean;
  /** DOE ที่เคยบันทึกไว้ของผู้ป่วยรายนี้ — ล็อกไม่ให้แก้ */
  lockedDoeDate?: string | null;
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
  today,
  nurseLevel,
  levelFromAccount = false,
  lockedDoeDate = null,
  assessedThisShift,
  children,
  preview = false,
}: Props) {
  const router = useRouter();
  const [answers, setAnswers] = useState<AnswerState>({});
  // มีอาการแสดงเมื่อไร จึงเปิดส่วนวินิจฉัยให้กรอกต่อในหน้าเดียวกัน
  const [symptoms, setSymptoms] = useState<SymptomEntry[]>([]);
  // null = ยังไม่ได้ตอบ — บังคับตอบเพื่อให้ "ไม่มีอาการ" เป็นคำตอบจริง ไม่ใช่การข้าม
  const [hasSymptoms, setHasSymptoms] = useState<boolean | null>(null);
  const [details, setDetails] = useState<DiagnosisDetails>(
    lockedDoeDate ? { ...EMPTY_DETAILS, doeDate: lockedDoeDate } : EMPTY_DETAILS,
  );
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
        symptoms?: SymptomEntry[];
        hasSymptoms?: boolean | null;
        details?: DiagnosisDetails;
      };
      if (draft.answers) setAnswers(draft.answers);
      if (typeof draft.notes === 'string') setNotes(draft.notes);
      if (Array.isArray(draft.symptoms)) setSymptoms(draft.symptoms);
      if (typeof draft.hasSymptoms === 'boolean') setHasSymptoms(draft.hasSymptoms);
      if (draft.details) setDetails(draft.details);
    } catch {
      // sessionStorage อาจถูกปิดในโหมดส่วนตัว — ไม่ใช่เรื่องร้ายแรง
    }
  }, [draftKey]);

  useEffect(() => {
    try {
      sessionStorage.setItem(
        draftKey,
        JSON.stringify({ answers, notes, symptoms, hasSymptoms, details }),
      );
    } catch {
      /* ไม่ทำอะไร */
    }
  }, [answers, notes, symptoms, hasSymptoms, details, draftKey]);

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


    if (hasSymptoms === null) {
      setShowMissing(true);
      setError('กรุณาระบุว่ามีอาการแสดงการติดเชื้อหรือไม่');
      document
        .getElementById('symptom-answer')
        ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    if (hasSymptoms && symptoms.length === 0) {
      setError('เลือกว่ามีอาการแสดง กรุณาระบุอย่างน้อย 1 ข้อ');
      return;
    }

    // ผู้ป่วยที่ยังคาสายอยู่เสมอในหน้านี้ เกณฑ์ที่ต้องถอดสายก่อนจึงไม่ถูกแสดงให้เลือก
    if (symptoms.length > 0) {
      const symptomProblem = validateSymptoms(symptoms, false);
      if (symptomProblem) {
        setError(symptomProblem);
        return;
      }
    }

    // การวินิจฉัยเป็นงานของพยาบาลวิชาชีพ ผู้ช่วยเหลือคนไข้บันทึกได้เฉพาะอาการที่สังเกตเห็น
    const diagnosis =
      nurseLevel === 'RN' && symptoms.length > 0 ? detailsToPayload(details) : null;
    if (diagnosis) {
      const diagnosisProblem = validateDiagnosis({ ...diagnosis, symptoms }, false);
      if (diagnosisProblem) {
        setError(diagnosisProblem);
        document
          .getElementById('infection-details')
          ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }
    }

    if (preview) { setPreviewSaved(true); return; }

    setSubmitting(true);
    setError(null);

    const payload: QueuedAssessment = {
      clientUuid: crypto.randomUUID(),
      episodeId: episode.episodeId,
      answers: answers as Record<Check5Key, boolean>,
      nurseLevel,
      symptoms,
      diagnosis,
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

      <div className="check-heading"><h2>CAUTI BUNDLE CHECK 8</h2><p>กรุณาประเมินสภาพผู้ป่วยในวันนี้</p></div>

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

        {/* ── ผู้ประเมิน — เลือกไว้ก่อนเข้าฟอร์มแล้ว ตรงนี้แสดงยืนยัน ── */}
        <div id="nurse-level" className="assessment-notes">
          <div className="text-sm font-bold">ผู้ประเมิน</div>
          <div className="mt-1.5 text-[15px] font-bold" style={{ color: 'var(--primary)' }}>
            {NURSE_LEVEL[nurseLevel]}
          </div>
          <p className="mt-0.5 text-[12.5px]" style={{ color: 'var(--muted)' }}>
            {levelFromAccount ? 'กำหนดตามบัญชีผู้ใช้' : 'เปลี่ยนได้ที่หน้าแรก'}
          </p>
        </div>

        {/* ── อาการแสดงการติดเชื้อ ─────────────────────────────── */}
        <fieldset id="symptom-answer" className="assessment-notes">
          <legend className="text-sm font-bold">อาการแสดงการติดเชื้อ</legend>
          <p className="mt-0.5 text-[12.5px]" style={{ color: 'var(--muted)' }}>
            ต้องตอบทุกครั้ง เพื่อแยกว่าตรวจแล้วไม่พบ กับยังไม่ได้ตรวจ
          </p>

          <div className="mt-2.5 space-y-2">
            {[
              { value: false, label: 'ไม่มีอาการผิดปกติ' },
              { value: true, label: 'มีอาการแสดง' },
            ].map((option) => (
              <label
                key={String(option.value)}
                className="flex items-center gap-3 rounded-lg px-3 py-2.5"
                style={{
                  background:
                    hasSymptoms === option.value ? 'var(--surface-2)' : 'transparent',
                }}
              >
                <input
                  type="radio"
                  name="has-symptoms"
                  checked={hasSymptoms === option.value}
                  onChange={() => {
                    setHasSymptoms(option.value);
                    // ตอบว่าไม่มีอาการแล้วต้องไม่มีอาการค้างจากการเลือกครั้งก่อน
                    if (!option.value) setSymptoms([]);
                    setError(null);
                  }}
                  className="h-5 w-5 shrink-0"
                />
                <span className="text-[14px]">{option.label}</span>
              </label>
            ))}
          </div>

          {showMissing && hasSymptoms === null && (
            <p
              className="mt-1.5 text-[12.5px] font-semibold"
              style={{ color: 'var(--review)' }}
            >
              ยังไม่ได้ตอบข้อนี้
            </p>
          )}

          {hasSymptoms === true && (
            <SymptomPicker
              value={symptoms}
              onChange={(next) => {
                setSymptoms(next);
                setError(null);
              }}
              defaultOnset={today}
              today={today}
              showAfterRemovalOnly={false}
              catheterRemoved={false}
            />
          )}
        </fieldset>

        {/* ── วินิจฉัยเพิ่มเติม — เฉพาะพยาบาลวิชาชีพ ───────────── */}
        {symptoms.length > 0 && nurseLevel === 'RN' && (
          <div id="infection-details" className="assessment-notes">
            <div className="text-sm font-bold">การวินิจฉัยการติดเชื้อ</div>
            <p className="mt-0.5 mb-3 text-[12.5px]" style={{ color: 'var(--muted)' }}>
              มีอาการแสดงแล้ว กรุณากรอกรายละเอียดเพื่อสรุปการวินิจฉัย
            </p>
            <InfectionDetailsFields
              value={details}
              onChange={setDetails}
              today={today}
              insertDate={episode.insertDate}
              lockedDoeDate={lockedDoeDate}
              onError={setError}
            />
          </div>
        )}

        {symptoms.length > 0 && nurseLevel === 'NA' && (
          <div
            className="rounded-xl border-l-4 px-4 py-3 text-[13px] leading-relaxed"
            style={{ background: 'var(--correct-bg)', borderColor: 'var(--correct)' }}
          >
            <strong style={{ color: 'var(--correct)' }}>รอวินิจฉัย</strong>
            {' — '}
            บันทึกอาการไว้ให้แล้ว การวินิจฉัยต้องใช้ผลเพาะเชื้อและเวชระเบียน
            ผู้ป่วยรายนี้จะขึ้นสถานะรอวินิจฉัยให้พยาบาลวิชาชีพหรือ IC กรอกต่อ
          </div>
        )}

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
            {submitting ? 'กำลังบันทึก…' : complete ? 'ส่งข้อมูล' : `ตอบให้ครบ ${CHECK5_ITEMS.length} ข้อ (${answeredCount}/${CHECK5_ITEMS.length})`}
          </button>
        </div>
      </div>
    </div>
  );
}
