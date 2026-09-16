import { describe, it, expect } from 'vitest';
import {
  classifyOrigin,
  daysBetween,
  filterOrganisms,
  validateDiagnosis,
  validateSymptoms,
  ORGANISMS,
  SYMPTOMS,
  type DiagnosisInput,
  type SymptomEntry,
} from './infection';

describe('daysBetween', () => {
  it('นับข้ามเดือนได้ถูกต้อง', () => {
    expect(daysBetween('2026-01-30', '2026-02-02')).toBe(3);
  });

  it('นับข้ามปีอธิกสุรทินได้ถูกต้อง', () => {
    expect(daysBetween('2028-02-28', '2028-03-01')).toBe(2);
  });
});

describe('classifyOrigin', () => {
  // เกณฑ์: DOE ลบ Admit ≥ 3 วัน = HAI, < 3 วัน = CI
  it.each([
    ['2026-09-01', '2026-09-04', 'HAI'],
    ['2026-09-01', '2026-09-10', 'HAI'],
    ['2026-09-01', '2026-09-03', 'CI'],
    ['2026-09-01', '2026-09-01', 'CI'],
  ])('admit %s + doe %s → %s', (admit, doe, expected) => {
    expect(classifyOrigin(admit, doe)).toBe(expected);
  });

  it('คืน null เมื่อ DOE มาก่อนวัน admit', () => {
    expect(classifyOrigin('2026-09-10', '2026-09-01')).toBeNull();
  });

  it('คืน null เมื่อวันที่ยังกรอกไม่ครบ', () => {
    expect(classifyOrigin('', '2026-09-04')).toBeNull();
    expect(classifyOrigin('2026-09-01', '')).toBeNull();
  });
});

describe('filterOrganisms', () => {
  it('ไม่ใส่คำค้นได้รายการทั้งหมด', () => {
    expect(filterOrganisms('')).toHaveLength(ORGANISMS.length);
  });

  it('อักษรตัวเดียวกรองจากตัวขึ้นต้น', () => {
    const result = filterOrganisms('P');
    expect(result.length).toBeGreaterThan(0);
    expect(result.every((name) => name.toLowerCase().startsWith('p'))).toBe(true);
  });

  it('พิมพ์ยาวกว่าหนึ่งตัวค้นจากส่วนใดของชื่อก็ได้', () => {
    expect(filterOrganisms('crab')).toContain('Carbapenem resistant A. baumanii (CRAB)');
  });

  it('ไม่พบคำค้นคืนรายการว่าง', () => {
    expect(filterOrganisms('ไม่มีเชื้อนี้')).toHaveLength(0);
  });
});

describe('validateSymptoms', () => {
  const fever: SymptomEntry = {
    code: 'FEVER',
    onsetDate: '2026-09-05',
    endDate: '2026-09-07',
  };

  it('ผ่านเมื่อเลือกอาการพร้อมวันที่ถูกต้อง', () => {
    expect(validateSymptoms([fever], false)).toBeNull();
  });

  it('ไม่ระบุวันสิ้นสุดได้ เพราะอาการอาจยังไม่หาย', () => {
    expect(validateSymptoms([{ ...fever, endDate: null }], false)).toBeNull();
  });

  it('ไม่เลือกอาการเลยไม่ผ่าน', () => {
    expect(validateSymptoms([], false)).toMatch(/อย่างน้อย 1 ข้อ/);
  });

  it('วันสิ้นสุดมาก่อนวันเริ่มไม่ผ่าน', () => {
    expect(validateSymptoms([{ ...fever, endDate: '2026-09-01' }], false)).toMatch(
      /ต้องไม่มาก่อน/,
    );
  });

  it('เลือกอาการซ้ำไม่ผ่าน', () => {
    expect(validateSymptoms([fever, fever], false)).toMatch(/ซ้ำ/);
  });

  // ข้อ 3, 5, 7 ใช้ได้เฉพาะผู้ป่วยที่ถอดสายสวนแล้ว
  it.each(['DYSURIA', 'FREQUENCY', 'SUPRAPUBIC_TENDERNESS'] as const)(
    '%s ใช้ไม่ได้เมื่อยังคาสายอยู่',
    (code) => {
      expect(validateSymptoms([{ ...fever, code }], false)).toMatch(/ถอดสายสวน/);
    },
  );

  it.each(['DYSURIA', 'FREQUENCY', 'SUPRAPUBIC_TENDERNESS'] as const)(
    '%s ใช้ได้เมื่อถอดสายแล้ว',
    (code) => {
      expect(validateSymptoms([{ ...fever, code }], true)).toBeNull();
    },
  );

  it('อาการที่ไม่ต้องรอถอดสายใช้ได้ระหว่างคาสาย', () => {
    const free = SYMPTOMS.filter((s) => !s.afterRemovalOnly);
    expect(free.length).toBeGreaterThan(0);
    for (const def of free) {
      expect(validateSymptoms([{ ...fever, code: def.code }], false)).toBeNull();
    }
  });
});

describe('validateDiagnosis', () => {
  const valid: DiagnosisInput = {
    admitDate: '2026-09-01',
    doeDate: '2026-09-05',
    admitDx: 'Sepsis',
    catheterAtDoe: 'GT_2_DAYS',
    ucResult: 'SIGNIFICANT',
    organisms: ['E. coli'],
    symptoms: [],
  };

  it('ผ่านเมื่อกรอกครบถูกต้อง', () => {
    expect(validateDiagnosis(valid, false)).toBeNull();
  });

  it('ผ่านเมื่อไม่พบเชื้อและไม่ได้เลือกชื่อเชื้อ', () => {
    expect(
      validateDiagnosis({ ...valid, ucResult: 'NO_GROWTH', organisms: [] }, false),
    ).toBeNull();
  });

  it('ไม่ให้เลือกชื่อเชื้อเมื่อผล U/C ไม่พบเชื้อ', () => {
    expect(validateDiagnosis({ ...valid, ucResult: 'NO_GROWTH' }, false)).toMatch(
      /ไม่พบเชื้อ/,
    );
  });

  it('พบเชื้อแต่ไม่เลือกชนิดไม่ผ่าน', () => {
    expect(validateDiagnosis({ ...valid, organisms: [] }, false)).toMatch(
      /อย่างน้อย 1 ชนิด/,
    );
  });

  it('เลือกเชื้อเกิน 2 ชนิดไม่ผ่าน', () => {
    const three = ['E. coli', 'MRSA', 'CRAB CoRo'];
    expect(validateDiagnosis({ ...valid, organisms: three }, false)).toMatch(/ไม่เกิน 2/);
  });

  it('เลือกเชื้อซ้ำไม่ผ่าน', () => {
    expect(validateDiagnosis({ ...valid, organisms: ['MRSA', 'MRSA'] }, false)).toMatch(
      /ซ้ำ/,
    );
  });

  it('ชื่อเชื้อนอกรายการไม่ผ่าน', () => {
    expect(validateDiagnosis({ ...valid, organisms: ['เชื้อสมมติ'] }, false)).toMatch(
      /ไม่อยู่ในรายการ/,
    );
  });

  it('DOE ก่อนวัน admit ไม่ผ่าน', () => {
    expect(validateDiagnosis({ ...valid, doeDate: '2026-08-30' }, false)).toMatch(
      /ต้องไม่มาก่อน/,
    );
  });

  it('วันที่ว่างไม่ผ่าน', () => {
    expect(validateDiagnosis({ ...valid, admitDate: '' }, false)).toMatch(
      /วันแรกของการนอน/,
    );
  });

  it('ตรวจชุดอาการที่แนบมาด้วย', () => {
    const symptoms: SymptomEntry[] = [
      { code: 'DYSURIA', onsetDate: '2026-09-05', endDate: null },
    ];
    expect(validateDiagnosis({ ...valid, symptoms }, false)).toMatch(/ถอดสายสวน/);
    expect(validateDiagnosis({ ...valid, symptoms }, true)).toBeNull();
  });
});
