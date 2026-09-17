'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  OUTCOME_LABEL,
  validateDiagnosis,
  validateSymptoms,
  type DiagnosisOutcome,
  type CatheterAtDoe,
  type SymptomEntry,
  type UcResult,
} from '@/lib/infection';
import {
  InfectionDetailsFields,
  detailsToPayload,
  EMPTY_DETAILS,
  type DiagnosisDetails,
} from '@/components/InfectionDetailsFields';
import { SymptomPicker } from '@/components/SymptomPicker';

export interface ExistingDiagnosis {
  admitDate: string;
  doeDate: string;
  admitDx: string | null;
  catheterAtDoe: CatheterAtDoe;
  ucResult: UcResult;
  ucResultDate: string | null;
  organisms: string[];
  organismOther: string | null;
  nonBacterialOrganism: string | null;
  symptoms: SymptomEntry[];
}

interface Props {
  episodeId: string;
  insertDate: string;
  today: string;
  /** ถอดสายสวนแล้วหรือยัง — อาการบางข้อใช้ได้เฉพาะเมื่อถอดแล้ว */
  catheterRemoved: boolean;
  existing: ExistingDiagnosis | null;
}

function toDetails(existing: ExistingDiagnosis | null): DiagnosisDetails {
  if (!existing) return EMPTY_DETAILS;
  return {
    admitDate: existing.admitDate,
    doeDate: existing.doeDate,
    admitDx: existing.admitDx ?? '',
    catheterAtDoe: existing.catheterAtDoe,
    ucResult: existing.ucResult,
    ucResultDate: existing.ucResultDate ?? '',
    organisms: existing.organisms,
    organismOther: existing.organismOther,
    nonBacterial: existing.nonBacterialOrganism ?? '',
  };
}

export function InfectionDiagnosisForm({
  episodeId,
  insertDate,
  today,
  catheterRemoved,
  existing,
}: Props) {
  const router = useRouter();

  const [details, setDetails] = useState<DiagnosisDetails>(() => toDetails(existing));
  const [isUti, setIsUti] = useState(existing !== null);
  const [hasSymptoms, setHasSymptoms] = useState((existing?.symptoms.length ?? 0) > 0);
  const [symptoms, setSymptoms] = useState<SymptomEntry[]>(existing?.symptoms ?? []);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    outcome: DiagnosisOutcome;
    reason: string | null;
    note: string | null;
  } | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    if (!isUti) {
      setError('กรุณาระบุว่าเป็นการติดเชื้อระบบทางเดินปัสสาวะเพื่อกรอกรายละเอียด');
      return;
    }

    if (hasSymptoms) {
      const symptomProblem = validateSymptoms(symptoms, catheterRemoved);
      if (symptomProblem) {
        setError(symptomProblem);
        return;
      }
    }

    const input = {
      ...detailsToPayload(details),
      symptoms: hasSymptoms ? symptoms : [],
    };

    const problem = validateDiagnosis(input, catheterRemoved);
    if (problem) {
      setError(problem);
      return;
    }

    setBusy(true);
    try {
      const response = await fetch('/api/infection-diagnosis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ episodeId, ...input }),
      });
      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
        outcome?: DiagnosisOutcome;
        reason?: string | null;
        note?: string | null;
      };
      if (!response.ok) throw new Error(data.error ?? 'บันทึกไม่สำเร็จ');

      if (data.outcome) {
        setResult({
          outcome: data.outcome,
          reason: data.reason ?? null,
          note: data.note ?? null,
        });
      }
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'บันทึกไม่สำเร็จ');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-2xl px-4 pb-16 pt-4">
      <section className="surface p-4">
        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            checked={isUti}
            onChange={(e) => {
              setIsUti(e.target.checked);
              setError(null);
            }}
            className="mt-0.5 h-5 w-5 shrink-0"
          />
          <span className="text-sm font-bold">
            การติดเชื้อระบบทางเดินปัสสาวะ
            <span className="block font-normal" style={{ color: 'var(--muted)' }}>
              เลือกข้อนี้เพื่อกรอกรายละเอียดการติดเชื้อ
            </span>
          </span>
        </label>

        {isUti && (
          <div className="mt-4 border-t pt-4" style={{ borderColor: 'var(--border)' }}>
            <InfectionDetailsFields
              value={details}
              onChange={setDetails}
              today={today}
              insertDate={insertDate}
              lockedDoeDate={existing?.doeDate ?? null}
              onError={setError}
            />

            <div className="mt-5 border-t pt-4" style={{ borderColor: 'var(--border)' }}>
              <label className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={hasSymptoms}
                  onChange={(e) => {
                    setHasSymptoms(e.target.checked);
                    setError(null);
                  }}
                  className="mt-0.5 h-5 w-5 shrink-0"
                />
                <span className="text-sm font-bold">
                  มีอาการแสดงการติดเชื้อ
                  <span className="block font-normal" style={{ color: 'var(--muted)' }}>
                    เลือกได้มากกว่า 1 ข้อ · อาการที่พยาบาลบันทึกตอนประเมินรายวันเก็บแยกจากส่วนนี้
                  </span>
                </span>
              </label>

              {hasSymptoms && (
                <SymptomPicker
                  value={symptoms}
                  onChange={(next) => {
                    setSymptoms(next);
                    setError(null);
                  }}
                  defaultOnset={details.doeDate || ''}
                  today={today}
                  showAfterRemovalOnly
                  catheterRemoved={catheterRemoved}
                />
              )}
            </div>
          </div>
        )}
      </section>

      {error && (
        <div
          role="alert"
          className="mt-4 rounded-lg px-3 py-2.5 text-[13px] font-semibold"
          style={{ background: 'var(--review-bg)', color: 'var(--review)' }}
        >
          {error}
        </div>
      )}


      <button type="submit" disabled={busy} className="btn-primary mt-4 w-full text-[16px]">
        {busy ? 'กำลังบันทึก…' : existing ? 'บันทึกการแก้ไข' : 'บันทึกแบบวินิจฉัย'}
      </button>

      {result && (
        <OutcomeDialog result={result} onClose={() => setResult(null)} />
      )}
    </form>
  );
}

/** สรุปผลที่เด้งขึ้นทันทีหลังบันทึก เพื่อให้ผู้กรอกเห็นข้อสรุปโดยไม่ต้องเลื่อนหา */
function OutcomeDialog({
  result,
  onClose,
}: {
  result: { outcome: DiagnosisOutcome; reason: string | null; note: string | null };
  onClose: () => void;
}) {
  const infected = result.outcome !== 'NO_INFECTION';
  const tone = !infected ? 'pass' : result.outcome === 'HAI' ? 'review' : 'correct';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="ผลการวินิจฉัย"
      className="outcome-backdrop"
      onClick={onClose}
    >
      <div className="outcome-card" onClick={(e) => e.stopPropagation()}>
        <div className="outcome-eyebrow">บันทึกแบบวินิจฉัยเรียบร้อยแล้ว</div>
        <div className="outcome-title" style={{ color: `var(--${tone})` }}>
          {OUTCOME_LABEL[result.outcome]}
        </div>
        {(result.reason ?? result.note) && (
          <p className="outcome-reason">{result.reason ?? result.note}</p>
        )}
        <button type="button" onClick={onClose} className="btn-primary mt-4 w-full">
          ปิด
        </button>
      </div>
    </div>
  );
}
