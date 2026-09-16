'use client';

import { useMemo, useState } from 'react';
import {
  CATHETER_AT_DOE,
  MAX_ORGANISMS,
  ORGANISM_NAME_MAX,
  UC_RESULT,
  filterOrganisms,
  type CatheterAtDoe,
  type UcResult,
} from '@/lib/infection';

export interface DiagnosisDetails {
  admitDate: string;
  doeDate: string;
  admitDx: string;
  catheterAtDoe: CatheterAtDoe | '';
  ucResult: UcResult | '';
  ucResultDate: string;
  organisms: string[];
  /** null = ไม่ได้เลือก "อื่นๆ" */
  organismOther: string | null;
  nonBacterial: string;
}

export const EMPTY_DETAILS: DiagnosisDetails = {
  admitDate: '',
  doeDate: '',
  admitDx: '',
  catheterAtDoe: '',
  ucResult: '',
  ucResultDate: '',
  organisms: [],
  organismOther: null,
  nonBacterial: '',
};

interface Props {
  value: DiagnosisDetails;
  onChange: (next: DiagnosisDetails) => void;
  today: string;
  /** วันที่ใส่สายของผู้ป่วยรายนี้ แสดงเป็นตัวช่วยตอนกรอก DOE */
  insertDate?: string;
  onError?: (message: string) => void;
}

/**
 * ช่องกรอกการวินิจฉัยการติดเชื้อ — ใช้ร่วมกันระหว่างหน้าประเมินรายวัน
 * กับแบบวินิจฉัยของ IC เพื่อให้ทั้งสองทางเก็บข้อมูลชุดเดียวกัน
 */
export function InfectionDetailsFields({
  value,
  onChange,
  today,
  insertDate,
  onError,
}: Props) {
  const [organismQuery, setOrganismQuery] = useState('');
  const visibleOrganisms = useMemo(() => filterOrganisms(organismQuery), [organismQuery]);

  const chosenCount = value.organisms.length + (value.organismOther !== null ? 1 : 0);
  const set = (patch: Partial<DiagnosisDetails>) => onChange({ ...value, ...patch });

  function toggleOrganism(name: string) {
    if (value.organisms.includes(name)) {
      set({ organisms: value.organisms.filter((o) => o !== name) });
      return;
    }
    if (chosenCount >= MAX_ORGANISMS) {
      onError?.(`เลือกเชื้อได้ไม่เกิน ${MAX_ORGANISMS} ชนิด`);
      return;
    }
    set({ organisms: [...value.organisms, name] });
  }

  function toggleOrganismOther() {
    if (value.organismOther !== null) {
      set({ organismOther: null });
      return;
    }
    if (chosenCount >= MAX_ORGANISMS) {
      onError?.(`เลือกเชื้อได้ไม่เกิน ${MAX_ORGANISMS} ชนิด`);
      return;
    }
    set({ organismOther: '' });
  }

  function pickUcResult(next: UcResult) {
    // ล้างข้อมูลของผลแบบเดิม เพื่อไม่ให้ชื่อเชื้อค้างข้ามประเภทผล
    set({
      ucResult: next,
      organisms: next === 'SIGNIFICANT' ? value.organisms : [],
      organismOther: next === 'SIGNIFICANT' ? value.organismOther : null,
      nonBacterial: next === 'NON_BACTERIAL' ? value.nonBacterial : '',
    });
  }

  const inputStyle = {
    background: 'var(--surface-2)',
    borderColor: 'var(--border)',
    color: 'var(--text)',
    minHeight: '50px',
  };

  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="admit-date" className="text-sm font-bold">
          วันแรกของการนอนโรงพยาบาลในครั้งนี้ (Admit)
        </label>
        <input
          id="admit-date"
          type="date"
          value={value.admitDate}
          max={today}
          onChange={(e) => set({ admitDate: e.target.value })}
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
          value={value.doeDate}
          min={value.admitDate || undefined}
          max={today}
          onChange={(e) => set({ doeDate: e.target.value })}
          className="mt-1.5 w-full rounded-lg border px-3.5 text-[16px]"
          style={inputStyle}
        />
        {insertDate && (
          <p className="mt-1.5 text-[12.5px]" style={{ color: 'var(--muted)' }}>
            วันที่ใส่สายสวนของรายนี้คือ {insertDate}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="admit-dx" className="text-sm font-bold">
          DX. แรกรับ
        </label>
        <input
          id="admit-dx"
          value={value.admitDx}
          onChange={(e) => set({ admitDx: e.target.value.slice(0, 500) })}
          placeholder="เช่น Acute appendicitis"
          className="mt-1.5 w-full rounded-lg border px-3.5 text-[16px]"
          style={inputStyle}
        />
      </div>

      <fieldset>
        <legend className="text-sm font-bold">ผู้ป่วยใส่สายสวนปัสสาวะ &gt; 2 วันปฏิทิน</legend>
        <p className="mt-1 text-[12.5px] leading-relaxed" style={{ color: 'var(--muted)' }}>
          นับวันที่ใส่วันแรกเป็นวันที่ 1 ณ วันแรกที่เกิดการติดเชื้อ (DOE) หรือ 1 วันก่อน DOE
          จะต้องมีการคาสายสวนปัสสาวะอยู่
        </p>
        <div className="mt-2.5 space-y-2">
          {(Object.keys(CATHETER_AT_DOE) as CatheterAtDoe[]).map((key) => (
            <label
              key={key}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5"
              style={{
                background: value.catheterAtDoe === key ? 'var(--surface-2)' : 'transparent',
              }}
            >
              <input
                type="radio"
                name="catheter-at-doe"
                checked={value.catheterAtDoe === key}
                onChange={() => set({ catheterAtDoe: key })}
                className="h-5 w-5 shrink-0"
              />
              <span className="text-[14px]">{CATHETER_AT_DOE[key]}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="text-sm font-bold">ผลเพาะเชื้อปัสสาวะ (U/C)</legend>
        <div className="mt-2.5 space-y-2">
          {(Object.keys(UC_RESULT) as UcResult[]).map((key) => (
            <label
              key={key}
              className="flex items-start gap-3 rounded-lg px-3 py-2.5"
              style={{ background: value.ucResult === key ? 'var(--surface-2)' : 'transparent' }}
            >
              <input
                type="radio"
                name="uc-result"
                checked={value.ucResult === key}
                onChange={() => pickUcResult(key)}
                className="mt-0.5 h-5 w-5 shrink-0"
              />
              <span className="text-[14px]">{UC_RESULT[key]}</span>
            </label>
          ))}
        </div>

        <div className="mt-3">
          <label htmlFor="uc-result-date" className="text-sm font-bold">
            วันที่ส่งผล U/C
          </label>
          <input
            id="uc-result-date"
            type="date"
            value={value.ucResultDate}
            max={today}
            onChange={(e) => set({ ucResultDate: e.target.value })}
            className="mt-1.5 w-full rounded-lg border px-3.5 text-[16px]"
            style={inputStyle}
          />
        </div>
      </fieldset>

      {value.ucResult === 'NON_BACTERIAL' && (
        <div>
          <label htmlFor="non-bacterial" className="text-sm font-bold">
            ระบุเชื้อที่พบ
          </label>
          <input
            id="non-bacterial"
            value={value.nonBacterial}
            onChange={(e) => set({ nonBacterial: e.target.value.slice(0, ORGANISM_NAME_MAX) })}
            placeholder="เช่น Candida albicans"
            autoCorrect="off"
            spellCheck={false}
            className="mt-1.5 w-full rounded-lg border px-3.5 text-[16px]"
            style={inputStyle}
          />
        </div>
      )}

      {value.ucResult === 'SIGNIFICANT' && (
        <div>
          <div className="flex items-baseline justify-between">
            <label htmlFor="organism-search" className="text-sm font-bold">
              เชื้อที่พบ
            </label>
            <span
              className="text-[12.5px] font-bold tabular-nums"
              style={{ color: 'var(--muted)' }}
            >
              เลือกแล้ว {chosenCount}/{MAX_ORGANISMS}
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
                const checked = value.organisms.includes(name);
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

            {/* อยู่นอกผลการกรอง เพื่อให้เลือกได้เสมอแม้กำลังค้นหาอยู่ */}
            <label
              className="flex items-center gap-3 rounded-lg px-3 py-2.5"
              style={{
                background: value.organismOther !== null ? 'var(--surface-2)' : 'transparent',
              }}
            >
              <input
                type="checkbox"
                checked={value.organismOther !== null}
                onChange={toggleOrganismOther}
                className="h-5 w-5 shrink-0"
              />
              <span className="text-[14px]">อื่นๆ (ระบุเอง)</span>
            </label>
          </div>

          {value.organismOther !== null && (
            <input
              aria-label="ระบุชื่อเชื้ออื่นๆ"
              value={value.organismOther}
              onChange={(e) => set({ organismOther: e.target.value.slice(0, ORGANISM_NAME_MAX) })}
              placeholder="พิมพ์ชื่อเชื้อที่พบ"
              autoCorrect="off"
              spellCheck={false}
              className="mt-2 w-full rounded-lg border px-3.5 text-[16px]"
              style={inputStyle}
            />
          )}
        </div>
      )}
    </div>
  );
}

/** แปลงค่าจากฟอร์มเป็นรูปแบบที่ API รับ */
export function detailsToPayload(details: DiagnosisDetails) {
  return {
    admitDate: details.admitDate,
    doeDate: details.doeDate,
    admitDx: details.admitDx.trim(),
    catheterAtDoe: details.catheterAtDoe as CatheterAtDoe,
    ucResult: details.ucResult as UcResult,
    ucResultDate: details.ucResultDate || null,
    organisms: details.organisms,
    organismOther: details.organismOther === null ? null : details.organismOther.trim(),
    nonBacterialOrganism:
      details.ucResult === 'NON_BACTERIAL' ? details.nonBacterial.trim() : null,
  };
}
