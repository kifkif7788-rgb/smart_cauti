'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  CATHETER_AT_DOE,
  MAX_ORGANISMS,
  ORIGIN_LABEL,
  SYMPTOMS,
  UC_RESULT,
  classifyOrigin,
  filterOrganisms,
  validateDiagnosis,
  validateSymptoms,
  type CatheterAtDoe,
  type SymptomCode,
  type SymptomEntry,
  type UcResult,
} from '@/lib/infection';

export interface ExistingDiagnosis {
  admitDate: string;
  doeDate: string;
  admitDx: string | null;
  catheterAtDoe: CatheterAtDoe;
  ucResult: UcResult;
  organisms: string[];
  symptoms: SymptomEntry[];
}

interface Props {
  episodeId: string;
  insertDate: string;
  today: string;
  /** ถอดสายสวนแล้วหรือยัง — ข้อ 3, 5, 7 ของ 10.2.4 ใช้ได้เฉพาะเมื่อถอดแล้ว */
  catheterRemoved: boolean;
  existing: ExistingDiagnosis | null;
}

export function InfectionDiagnosisForm({
  episodeId,
  insertDate,
  today,
  catheterRemoved,
  existing,
}: Props) {
  const router = useRouter();

  const [admitDate, setAdmitDate] = useState(existing?.admitDate ?? '');
  const [doeDate, setDoeDate] = useState(existing?.doeDate ?? '');
  const [admitDx, setAdmitDx] = useState(existing?.admitDx ?? '');

  // ข้อย่อยของ 10.2 จะยังไม่แสดงจนกว่าจะระบุว่าเป็นการติดเชื้อทางเดินปัสสาวะ
  const [isUti, setIsUti] = useState(existing !== null);
  const [catheterAtDoe, setCatheterAtDoe] = useState<CatheterAtDoe | ''>(
    existing?.catheterAtDoe ?? '',
  );
  const [ucResult, setUcResult] = useState<UcResult | ''>(existing?.ucResult ?? '');
  const [organisms, setOrganisms] = useState<string[]>(existing?.organisms ?? []);
  const [organismQuery, setOrganismQuery] = useState('');

  // 10.2.4 — เก็บเป็น map เพื่อให้ติ๊ก/ถอดอาการแล้วยังจำวันที่ที่กรอกไว้
  const [hasSymptoms, setHasSymptoms] = useState((existing?.symptoms.length ?? 0) > 0);
  const [symptoms, setSymptoms] = useState<Map<SymptomCode, SymptomEntry>>(
    () => new Map((existing?.symptoms ?? []).map((s) => [s.code, s])),
  );

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const origin = classifyOrigin(admitDate, doeDate);
  const visibleOrganisms = useMemo(
    () => filterOrganisms(organismQuery),
    [organismQuery],
  );

  function toggleOrganism(name: string) {
    setError(null);
    setOrganisms((current) => {
      if (current.includes(name)) return current.filter((o) => o !== name);
      if (current.length >= MAX_ORGANISMS) {
        setError(`เลือกเชื้อได้ไม่เกิน ${MAX_ORGANISMS} ชนิด`);
        return current;
      }
      return [...current, name];
    });
  }

  function toggleSymptom(code: SymptomCode) {
    setError(null);
    setSymptoms((current) => {
      const next = new Map(current);
      if (next.has(code)) next.delete(code);
      else next.set(code, { code, onsetDate: doeDate || '', endDate: null });
      return next;
    });
  }

  function setSymptomDate(code: SymptomCode, field: 'onsetDate' | 'endDate', value: string) {
    setError(null);
    setSymptoms((current) => {
      const entry = current.get(code);
      if (!entry) return current;
      const next = new Map(current);
      next.set(code, {
        ...entry,
        [field]: field === 'endDate' && value === '' ? null : value,
      });
      return next;
    });
  }

  function pickUcResult(value: UcResult) {
    setError(null);
    setUcResult(value);
    // ไม่พบเชื้อแล้วต้องไม่มีชื่อเชื้อค้างไว้จากการเลือกครั้งก่อน
    if (value === 'NO_GROWTH') setOrganisms([]);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    if (!isUti) {
      setError('กรุณาระบุว่าเป็นการติดเชื้อระบบทางเดินปัสสาวะเพื่อกรอกรายละเอียด');
      return;
    }

    const chosen = [...symptoms.values()];
    if (hasSymptoms) {
      const symptomProblem = validateSymptoms(chosen, catheterRemoved);
      if (symptomProblem) {
        setError(symptomProblem);
        return;
      }
    }

    const input = {
      admitDate,
      doeDate,
      admitDx: admitDx.trim(),
      catheterAtDoe: catheterAtDoe as CatheterAtDoe,
      ucResult: ucResult as UcResult,
      organisms,
      symptoms: hasSymptoms ? chosen : [],
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
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? 'บันทึกไม่สำเร็จ');

      setSaved(true);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'บันทึกไม่สำเร็จ');
    } finally {
      setBusy(false);
    }
  }

  const inputStyle = {
    background: 'var(--surface-2)',
    borderColor: 'var(--border)',
    color: 'var(--text)',
    minHeight: '50px',
  };

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-2xl px-4 pb-16 pt-4">
      {/* ── ข้อ 7–9 ────────────────────────────────────────────────── */}
      <section className="surface space-y-4 p-4">
        <div>
          <label htmlFor="admit-date" className="text-sm font-bold">
            วันแรกของการนอนโรงพยาบาลในครั้งนี้ (Admit)
          </label>
          <input
            id="admit-date"
            type="date"
            value={admitDate}
            max={today}
            onChange={(e) => setAdmitDate(e.target.value)}
            required
            className="mt-1.5 w-full rounded-lg border px-3.5 text-[16px]"
            style={inputStyle}
          />
        </div>

        <div>
          <label htmlFor="doe-date" className="text-sm font-bold">
            วันแรกที่มีอาการแสดงการติดเชื้อ (DOE)
          </label>
          <input
            id="doe-date"
            type="date"
            value={doeDate}
            min={admitDate || undefined}
            max={today}
            onChange={(e) => setDoeDate(e.target.value)}
            required
            className="mt-1.5 w-full rounded-lg border px-3.5 text-[16px]"
            style={inputStyle}
          />
          <p className="mt-1.5 text-[12.5px]" style={{ color: 'var(--muted)' }}>
            วันที่ใส่สายสวนของรายนี้คือ {insertDate}
          </p>
        </div>

        <div>
          <label htmlFor="admit-dx" className="text-sm font-bold">
            DX. แรกรับ
          </label>
          <input
            id="admit-dx"
            value={admitDx}
            onChange={(e) => setAdmitDx(e.target.value.slice(0, 500))}
            placeholder="เช่น Acute appendicitis"
            className="mt-1.5 w-full rounded-lg border px-3.5 text-[16px]"
            style={inputStyle}
          />
        </div>

        {/* สรุปอัตโนมัติจากข้อ 8 ลบ ข้อ 7 */}
        {origin && (
          <div
            role="status"
            className="rounded-xl border-l-4 px-4 py-3"
            style={{
              background: origin === 'HAI' ? 'var(--review-bg)' : 'var(--pass-bg)',
              borderColor: origin === 'HAI' ? 'var(--review)' : 'var(--pass)',
            }}
          >
            <div
              className="text-[11px] font-bold tracking-wider"
              style={{ color: 'var(--muted)' }}
            >
              สรุปอัตโนมัติ
            </div>
            <div
              className="mt-0.5 font-extrabold"
              style={{ color: origin === 'HAI' ? 'var(--review)' : 'var(--pass)' }}
            >
              {ORIGIN_LABEL[origin]}
            </div>
          </div>
        )}
      </section>

      {/* ── ข้อ 10.2 ───────────────────────────────────────────────── */}
      <section className="surface mt-4 p-4">
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
          <div className="mt-4 space-y-5 border-t pt-4" style={{ borderColor: 'var(--border)' }}>
            {/* 10.2.1 */}
            <fieldset>
              <legend className="text-sm font-bold">
                ผู้ป่วยใส่สายสวนปัสสาวะ &gt; 2 วันปฏิทิน
              </legend>
              <p className="mt-1 text-[12.5px] leading-relaxed" style={{ color: 'var(--muted)' }}>
                นับวันที่ใส่วันแรกเป็นวันที่ 1 ณ วันแรกที่เกิดการติดเชื้อ (DOE)
                หรือ 1 วันก่อน DOE จะต้องมีการคาสายสวนปัสสาวะอยู่
              </p>
              <div className="mt-2.5 space-y-2">
                {(Object.keys(CATHETER_AT_DOE) as CatheterAtDoe[]).map((key) => (
                  <label
                    key={key}
                    className="flex items-center gap-3 rounded-lg px-3 py-2.5"
                    style={{
                      background:
                        catheterAtDoe === key ? 'var(--surface-2)' : 'transparent',
                    }}
                  >
                    <input
                      type="radio"
                      name="catheter-at-doe"
                      value={key}
                      checked={catheterAtDoe === key}
                      onChange={() => {
                        setCatheterAtDoe(key);
                        setError(null);
                      }}
                      className="h-5 w-5 shrink-0"
                    />
                    <span className="text-[14px]">{CATHETER_AT_DOE[key]}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            {/* 10.2.2 และ 10.2.3 เป็นผลที่เกิดพร้อมกันไม่ได้ */}
            <fieldset>
              <legend className="text-sm font-bold">ผลเพาะเชื้อปัสสาวะ (U/C)</legend>
              <div className="mt-2.5 space-y-2">
                <label
                  className="flex items-start gap-3 rounded-lg px-3 py-2.5"
                  style={{
                    background:
                      ucResult === 'NO_GROWTH' ? 'var(--surface-2)' : 'transparent',
                  }}
                >
                  <input
                    type="radio"
                    name="uc-result"
                    checked={ucResult === 'NO_GROWTH'}
                    onChange={() => pickUcResult('NO_GROWTH')}
                    className="mt-0.5 h-5 w-5 shrink-0"
                  />
                  <span className="text-[14px]">{UC_RESULT.NO_GROWTH}</span>
                </label>

                <label
                  className="flex items-start gap-3 rounded-lg px-3 py-2.5"
                  style={{
                    background:
                      ucResult === 'SIGNIFICANT' ? 'var(--surface-2)' : 'transparent',
                  }}
                >
                  <input
                    type="radio"
                    name="uc-result"
                    checked={ucResult === 'SIGNIFICANT'}
                    onChange={() => pickUcResult('SIGNIFICANT')}
                    className="mt-0.5 h-5 w-5 shrink-0"
                  />
                  <span className="text-[14px]">{UC_RESULT.SIGNIFICANT}</span>
                </label>
              </div>
            </fieldset>

            {ucResult === 'NO_GROWTH' && (
              <p
                className="rounded-lg px-3 py-2.5 text-[13px]"
                style={{ background: 'var(--surface-2)', color: 'var(--muted)' }}
              >
                ไม่พบเชื้อ — ตามแบบฟอร์มให้ข้ามไปหัวข้อถัดไป ซึ่งยังไม่ได้สร้างในระบบ
              </p>
            )}

            {/* รายการเชื้อของข้อ 10.2.3 */}
            {ucResult === 'SIGNIFICANT' && (
              <div>
                <div className="flex items-baseline justify-between">
                  <label htmlFor="organism-search" className="text-sm font-bold">
                    เชื้อที่พบ
                  </label>
                  <span
                    className="text-[12.5px] font-bold tabular-nums"
                    style={{ color: 'var(--muted)' }}
                  >
                    เลือกแล้ว {organisms.length}/{MAX_ORGANISMS}
                  </span>
                </div>
                <input
                  id="organism-search"
                  value={organismQuery}
                  onChange={(e) => setOrganismQuery(e.target.value)}
                  placeholder="พิมพ์อักษรตัวแรก เช่น E หรือพิมพ์ชื่อบางส่วน เช่น CRAB"
                  autoCapitalize="characters"
                  autoCorrect="off"
                  spellCheck={false}
                  className="mt-1.5 w-full rounded-lg border px-3.5 text-[15px]"
                  style={inputStyle}
                />

                <div className="mt-2.5 space-y-1.5">
                  {visibleOrganisms.length === 0 ? (
                    <p className="px-1 py-2 text-[13px]" style={{ color: 'var(--muted)' }}>
                      ไม่พบเชื้อที่ตรงกับคำค้น
                    </p>
                  ) : (
                    visibleOrganisms.map((name) => {
                      const checked = organisms.includes(name);
                      return (
                        <label
                          key={name}
                          className="flex items-center gap-3 rounded-lg px-3 py-2.5"
                          style={{ background: checked ? 'var(--surface-2)' : 'transparent' }}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleOrganism(name)}
                            className="h-5 w-5 shrink-0"
                          />
                          <span className="text-[14px] italic">{name}</span>
                        </label>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {/* 10.2.4 */}
            <div className="border-t pt-4" style={{ borderColor: 'var(--border)' }}>
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
                    เลือกได้มากกว่า 1 ข้อ
                  </span>
                </span>
              </label>

              {hasSymptoms && (
                <>
                  {!catheterRemoved && (
                    <p
                      className="mt-3 rounded-lg px-3 py-2.5 text-[12.5px] leading-relaxed"
                      style={{ background: 'var(--surface-2)', color: 'var(--muted)' }}
                    >
                      ผู้ป่วยรายนี้ยังคาสายสวนอยู่ — ปัสสาวะแสบขัด ปัสสาวะบ่อย
                      และกดเจ็บบริเวณหัวหน่าว จึงเลือกไม่ได้
                      เพราะผู้ที่คาสายอาจมีอาการเหล่านี้โดยไม่ได้ติดเชื้อ
                      ใช้เกณฑ์เหล่านี้ได้เมื่อถอดสายสวนแล้วเท่านั้น
                    </p>
                  )}

                  <ul className="mt-3 space-y-1.5">
                    {SYMPTOMS.map((def) => {
                      const entry = symptoms.get(def.code);
                      const blocked = def.afterRemovalOnly && !catheterRemoved;
                      return (
                        <li
                          key={def.code}
                          className="rounded-lg px-3 py-2.5"
                          style={{
                            background: entry ? 'var(--surface-2)' : 'transparent',
                            opacity: blocked ? 0.45 : 1,
                          }}
                        >
                          <label className="flex items-start gap-3">
                            <input
                              type="checkbox"
                              checked={entry !== undefined}
                              disabled={blocked}
                              onChange={() => toggleSymptom(def.code)}
                              className="mt-0.5 h-5 w-5 shrink-0"
                            />
                            <span className="text-[14px]">
                              {def.label}
                              {def.infantOnly && (
                                <span style={{ color: 'var(--muted)' }}>
                                  {' '}
                                  (ผู้ป่วยอายุ &lt; 1 ปี)
                                </span>
                              )}
                            </span>
                          </label>

                          {entry && (
                            <div className="mt-2 flex flex-wrap items-center gap-2 pl-8">
                              <input
                                type="date"
                                aria-label={`วันที่เริ่มมีอาการ ${def.label}`}
                                value={entry.onsetDate}
                                max={today}
                                onChange={(e) =>
                                  setSymptomDate(def.code, 'onsetDate', e.target.value)
                                }
                                className="min-w-0 flex-1 rounded-lg border px-3 py-2 text-[14px]"
                                style={{
                                  background: 'var(--surface)',
                                  borderColor: 'var(--border)',
                                  color: 'var(--text)',
                                }}
                              />
                              <span className="text-[13px]" style={{ color: 'var(--muted)' }}>
                                ถึง
                              </span>
                              <input
                                type="date"
                                aria-label={`วันที่สิ้นสุดอาการ ${def.label}`}
                                value={entry.endDate ?? ''}
                                min={entry.onsetDate || undefined}
                                max={today}
                                onChange={(e) =>
                                  setSymptomDate(def.code, 'endDate', e.target.value)
                                }
                                className="min-w-0 flex-1 rounded-lg border px-3 py-2 text-[14px]"
                                style={{
                                  background: 'var(--surface)',
                                  borderColor: 'var(--border)',
                                  color: 'var(--text)',
                                }}
                              />
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </>
              )}
            </div>

            <p className="text-[12.5px]" style={{ color: 'var(--muted)' }}>
              หัวข้อถัดไปของแบบฟอร์มยังไม่ได้สร้างในระบบ
            </p>
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

      {saved && !error && (
        <div
          role="status"
          className="mt-4 rounded-lg px-3 py-2.5 text-[13px] font-semibold"
          style={{ background: 'var(--pass-bg)', color: 'var(--pass)' }}
        >
          บันทึกแบบวินิจฉัยเรียบร้อยแล้ว
        </div>
      )}

      <button type="submit" disabled={busy} className="btn-primary mt-4 w-full text-[16px]">
        {busy ? 'กำลังบันทึก…' : existing ? 'บันทึกการแก้ไข' : 'บันทึกแบบวินิจฉัย'}
      </button>
    </form>
  );
}
