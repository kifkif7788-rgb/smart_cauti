'use client';

import { SYMPTOMS, type SymptomCode, type SymptomEntry } from '@/lib/infection';

interface Props {
  value: SymptomEntry[];
  onChange: (next: SymptomEntry[]) => void;
  /** วันที่ตั้งต้นของอาการที่เพิ่งติ๊ก */
  defaultOnset: string;
  today: string;
  /**
   * แสดงอาการที่เกณฑ์ให้ใช้ได้เฉพาะหลังถอดสายด้วยหรือไม่
   * หน้าประเมินรายวันใช้กับผู้ป่วยที่ยังคาสายเสมอ จึงไม่แสดงเพื่อไม่ให้มีตัวเลือกที่กดไม่ได้
   */
  showAfterRemovalOnly: boolean;
  catheterRemoved: boolean;
}

export function SymptomPicker({
  value,
  onChange,
  defaultOnset,
  today,
  showAfterRemovalOnly,
  catheterRemoved,
}: Props) {
  const byCode = new Map(value.map((entry) => [entry.code, entry]));
  const visible = SYMPTOMS.filter((def) => showAfterRemovalOnly || !def.afterRemovalOnly);

  function toggle(code: SymptomCode) {
    if (byCode.has(code)) onChange(value.filter((entry) => entry.code !== code));
    else onChange([...value, { code, onsetDate: defaultOnset, endDate: null }]);
  }

  function setDate(code: SymptomCode, field: 'onsetDate' | 'endDate', next: string) {
    onChange(
      value.map((entry) =>
        entry.code === code
          ? { ...entry, [field]: field === 'endDate' && next === '' ? null : next }
          : entry,
      ),
    );
  }

  return (
    <>
      {showAfterRemovalOnly && !catheterRemoved && (
        <p
          className="mt-3 rounded-lg px-3 py-2.5 text-[12.5px] leading-relaxed"
          style={{ background: 'var(--surface-2)', color: 'var(--muted)' }}
        >
          ผู้ป่วยรายนี้ยังคาสายสวนอยู่ — ปัสสาวะแสบขัด ปัสสาวะบ่อย และกดเจ็บบริเวณหัวหน่าว
          จึงเลือกไม่ได้ เพราะผู้ที่คาสายอาจมีอาการเหล่านี้โดยไม่ได้ติดเชื้อ
          ใช้เกณฑ์เหล่านี้ได้เมื่อถอดสายสวนแล้วเท่านั้น
        </p>
      )}

      <ul className="mt-3 space-y-1.5">
        {visible.map((def) => {
          const entry = byCode.get(def.code);
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
                  onChange={() => toggle(def.code)}
                  className="mt-0.5 h-5 w-5 shrink-0"
                />
                <span className="text-[14px]">{def.label}</span>
              </label>

              {entry && (
                <div className="mt-2 flex flex-wrap items-center gap-2 pl-8">
                  <input
                    type="date"
                    aria-label={`วันที่เริ่มมีอาการ ${def.label}`}
                    value={entry.onsetDate}
                    max={today}
                    onChange={(e) => setDate(def.code, 'onsetDate', e.target.value)}
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
                    onChange={(e) => setDate(def.code, 'endDate', e.target.value)}
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
  );
}
