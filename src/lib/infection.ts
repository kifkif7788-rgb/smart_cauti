/**
 * แบบวินิจฉัยการติดเชื้อ — ข้อ 7–9 และ 10.2
 *
 * ตรรกะล้วน ไม่แตะฐานข้อมูลหรือ request context เพื่อให้ทดสอบได้ตรง ๆ
 * และให้ฝั่ง client กับ API ตัดสินด้วยกฎชุดเดียวกัน
 */

// ── 10.2.1 สถานะการคาสายสวน ณ วัน DOE ────────────────────────────────
export const CATHETER_AT_DOE = {
  GT_2_DAYS: 'ใส่สายสวนปัสสาวะ > 2 วันปฏิทิน',
  NONE: 'ไม่ได้ใส่สายสวนปัสสาวะ',
  LE_2_DAYS: 'ใส่สายสวนปัสสาวะ ≤ 2 วันปฏิทิน',
} as const;

export type CatheterAtDoe = keyof typeof CATHETER_AT_DOE;

// ── 10.2.2 / 10.2.3 ผลเพาะเชื้อปัสสาวะ ───────────────────────────────
export const UC_RESULT = {
  NO_GROWTH: 'ผล U/C ไม่พบเชื้อ',
  SIGNIFICANT: 'ผล U/C พบเชื้อแบคทีเรียไม่เกิน 2 ชนิด และมีจำนวน colony ≥ 10⁵ CFU/ml',
  NON_BACTERIAL: 'ผล U/C พบเชื้อที่ไม่ใช่แบคทีเรีย',
} as const;

export type UcResult = keyof typeof UC_RESULT;

/**
 * รายชื่อเชื้อที่เลือกได้ตามแบบฟอร์มของหน่วยงาน
 *
 * สะกดตามต้นฉบับทุกตัว เพราะเป็นรหัสที่ใช้อ้างอิงกับรายงานเดิมของ IC
 * เรียงตามตัวอักษรเพื่อให้พิมพ์อักษรตัวแรกแล้วกรองเจอทั้งกลุ่ม
 */
export const ORGANISMS = [
  'A. baumanii',
  'Carbapenem resistant A. baumanii (CRAB)',
  'Carbapenem-resistant P. aeruginosa (CRPA)',
  'CRAB CoRo',
  'E. coli',
  'E. coli CRE MDR',
  'E. Coli MDR',
  'Enterobacter Clocae',
  'Enterococcus faecalis',
  'Enterococcus faecium',
  'Enterococcus faecium VRE',
  'MRSA',
  'Myroides species',
  'Proteus mirabilis',
  'Proteus mirabilis CRE MDR',
  'Proteus mirabilis MDR',
  'Providencia rettgeri',
  'Providencia rettgeri CRE MDR',
  'Pseudomonas Aeruginosa',
  'Pseudomonas Aeruginosa MDR',
  'Staphylococcus haemolyticus',
] as const;

/** ข้อ 10.2.3 กำหนดว่าพบเชื้อได้ไม่เกิน 2 ชนิด — เชื้อที่ระบุเองนับรวมในจำนวนนี้ด้วย */
export const MAX_ORGANISMS = 2;

/** ความยาวสูงสุดของชื่อเชื้อที่ผู้ใช้พิมพ์เอง */
export const ORGANISM_NAME_MAX = 120;

/**
 * HAI เมื่อ DOE ห่างจากวัน Admit ตั้งแต่ 3 วันขึ้นไป มิฉะนั้นเป็น CI
 *
 * กฎนี้คำนวณที่คอลัมน์ generated ของ infection_diagnosis ฝั่งฐานข้อมูลเท่านั้น
 * ไม่ทำซ้ำในฝั่ง JS เพื่อไม่ให้สองที่คำนวณไม่ตรงกัน
 */
export type InfectionOrigin = 'HAI' | 'CI';

/** ผลสรุปที่แสดงให้ผู้กรอกเห็นทันทีหลังบันทึก */
export type DiagnosisOutcome = InfectionOrigin | 'NO_INFECTION';

export const OUTCOME_LABEL: Record<DiagnosisOutcome, string> = {
  HAI: 'ผู้ป่วยมีการติดเชื้อในโรงพยาบาล (HAI)',
  CI: 'ผู้ป่วยมีการติดเชื้อในชุมชน (CI)',
  NO_INFECTION: 'ไม่ติดเชื้อ',
};

/**
 * เหตุผลที่ยังไม่เข้าเกณฑ์ติดเชื้อ — คืน null เมื่อเข้าเกณฑ์แล้ว
 *
 * เกณฑ์ต้องครบทั้งสองอย่าง คือพบเชื้อแบคทีเรียตามปริมาณที่กำหนด
 * และมีอาการแสดงอย่างน้อยหนึ่งข้อ ผลเพาะเชื้ออย่างเดียวอาจเป็นเพียง
 * การตั้งรกรากของเชื้อโดยผู้ป่วยไม่ได้ติดเชื้อจริง
 */
export function notInfectedReason(
  ucResult: UcResult,
  hasSymptoms: boolean,
): string | null {
  if (ucResult === 'NO_GROWTH') return 'ผล U/C ไม่พบเชื้อ';
  if (ucResult === 'NON_BACTERIAL') return 'เชื้อที่พบไม่ใช่แบคทีเรีย จึงไม่เข้าเกณฑ์';
  if (!hasSymptoms) return 'พบเชื้อแต่ยังไม่มีอาการแสดง';
  return null;
}

export const ORIGIN_LABEL: Record<InfectionOrigin, string> = {
  HAI: 'ผู้ป่วยมีการติดเชื้อในโรงพยาบาล (HAI)',
  CI: 'ผู้ป่วยมีการติดเชื้อในชุมชน (CI)',
};

/** จำนวนวันระหว่างสองวันที่ในรูปแบบ YYYY-MM-DD */
export function daysBetween(fromDate: string, toDate: string): number {
  const from = Date.parse(`${fromDate}T00:00:00Z`);
  const to = Date.parse(`${toDate}T00:00:00Z`);
  return Math.round((to - from) / 86_400_000);
}

export function isDateString(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export function isKnownOrganism(name: unknown): name is string {
  return typeof name === 'string' && (ORGANISMS as readonly string[]).includes(name);
}

/**
 * กรองรายชื่อเชื้อ — พิมพ์อักษรตัวเดียวจะได้เชื้อทุกตัวที่ขึ้นต้นด้วยอักษรนั้น
 * พิมพ์ยาวกว่านั้นจะค้นจากส่วนใดของชื่อก็ได้ เพราะ IC มักจำชื่อท่อนหลัง เช่น CRAB
 */
export function filterOrganisms(query: string): readonly string[] {
  const q = query.trim().toLowerCase();
  if (!q) return ORGANISMS;
  if (q.length === 1) {
    return ORGANISMS.filter((name) => name.toLowerCase().startsWith(q));
  }
  return ORGANISMS.filter((name) => name.toLowerCase().includes(q));
}

// ── 10.2.4 อาการแสดงการติดเชื้อ ──────────────────────────────────────

export type SymptomCode =
  | 'FEVER'
  | 'HYPOTHERMIA'
  | 'DYSURIA'
  | 'SEDIMENT'
  | 'FREQUENCY'
  | 'URGENCY'
  | 'SUPRAPUBIC_TENDERNESS'
  | 'CVA_TENDERNESS';

export interface SymptomDef {
  code: SymptomCode;
  label: string;
  /**
   * ปัสสาวะแสบขัด ปัสสาวะบ่อย และกดเจ็บบริเวณหัวหน่าว ใช้ได้เฉพาะผู้ป่วยที่ถอดสายสวนแล้ว
   * เพราะผู้ที่ยังคาสายอยู่อาจมีอาการเหล่านี้โดยไม่ได้ติดเชื้อ
   */
  afterRemovalOnly?: boolean;
}

/** เรียงตามลำดับในแบบฟอร์มต้นฉบับ */
export const SYMPTOMS: readonly SymptomDef[] = [
  { code: 'FEVER', label: 'มีไข้ > 38 องศาเซลเซียส' },
  { code: 'HYPOTHERMIA', label: 'ตัวเย็น อุณหภูมิ < 36 องศาเซลเซียส' },
  { code: 'DYSURIA', label: 'ปัสสาวะแสบขัด', afterRemovalOnly: true },
  { code: 'SEDIMENT', label: 'ปัสสาวะมีตะกอน' },
  { code: 'FREQUENCY', label: 'ปัสสาวะบ่อย', afterRemovalOnly: true },
  { code: 'URGENCY', label: 'ปัสสาวะเฉียบพลัน' },
  {
    code: 'SUPRAPUBIC_TENDERNESS',
    label: 'กดเจ็บบริเวณหัวหน่าวโดยไม่มีสาเหตุอื่น',
    afterRemovalOnly: true,
  },
  {
    code: 'CVA_TENDERNESS',
    label: 'ปวดหลังหรือกดเจ็บบริเวณ Costovertebral angle โดยไม่มีสาเหตุอื่น',
  },
];

export const SYMPTOM_BY_CODE = new Map(SYMPTOMS.map((s) => [s.code, s]));

export interface SymptomEntry {
  code: SymptomCode;
  onsetDate: string;
  endDate: string | null;
}

/**
 * ตรวจชุดอาการของข้อ 10.2.4
 *
 * catheterRemoved มาจาก remove_date ของ episode — ใช้ตัดสินว่าข้อ 3, 5, 7 ใช้ได้หรือไม่
 */
export function validateSymptoms(
  entries: SymptomEntry[],
  catheterRemoved: boolean,
): string | null {
  if (entries.length === 0) return 'กรุณาเลือกอาการแสดงอย่างน้อย 1 ข้อ';

  const seen = new Set<SymptomCode>();
  for (const entry of entries) {
    const def = SYMPTOM_BY_CODE.get(entry.code);
    if (!def) return 'มีอาการที่ไม่อยู่ในรายการ';
    if (seen.has(entry.code)) return `เลือก "${def.label}" ซ้ำ`;
    seen.add(entry.code);

    if (def.afterRemovalOnly && !catheterRemoved) {
      return `"${def.label}" ใช้ได้เฉพาะผู้ป่วยที่ถอดสายสวนปัสสาวะแล้ว`;
    }
    if (!isDateString(entry.onsetDate)) {
      return `กรุณากรอกวันที่เริ่มมีอาการของ "${def.label}"`;
    }
    if (entry.endDate !== null) {
      if (!isDateString(entry.endDate)) {
        return `วันที่สิ้นสุดของ "${def.label}" ไม่ถูกต้อง`;
      }
      if (daysBetween(entry.onsetDate, entry.endDate) < 0) {
        return `วันที่สิ้นสุดของ "${def.label}" ต้องไม่มาก่อนวันที่เริ่มมีอาการ`;
      }
    }
  }

  return null;
}

export interface DiagnosisInput {
  admitDate: string;
  doeDate: string;
  admitDx?: string | null;
  catheterAtDoe: CatheterAtDoe;
  ucResult: UcResult;
  organisms: string[];
  /** ชื่อเชื้อที่ผู้ใช้พิมพ์เองเมื่อเลือก "อื่นๆ" — นับรวมใน MAX_ORGANISMS */
  organismOther: string | null;
  /** ชื่อเชื้อเมื่อผลเพาะเชื้อไม่ใช่แบคทีเรีย */
  nonBacterialOrganism: string | null;
  /** วันที่ส่งผล U/C — ไม่บังคับ เพราะบางครั้งยังไม่ทราบตอนกรอก */
  ucResultDate: string | null;
  symptoms: SymptomEntry[];
}

/**
 * ตรวจความถูกต้องก่อนบันทึก — คืนข้อความภาษาไทยเมื่อไม่ผ่าน
 *
 * ชุดอาการ (10.2.4) เป็นส่วนเสริม ตรวจต่อเมื่อมีการเลือกไว้
 */
export function validateDiagnosis(
  input: DiagnosisInput,
  catheterRemoved: boolean,
): string | null {
  if (!isDateString(input.admitDate)) return 'กรุณากรอกวันแรกของการนอนโรงพยาบาล';
  if (!isDateString(input.doeDate)) return 'กรุณากรอกวันแรกที่มีอาการแสดงการติดเชื้อ';
  if (daysBetween(input.admitDate, input.doeDate) < 0) {
    return 'วัน DOE ต้องไม่มาก่อนวันแรกของการนอนโรงพยาบาล';
  }
  if (!(input.catheterAtDoe in CATHETER_AT_DOE)) {
    return 'กรุณาเลือกสถานะการคาสายสวนปัสสาวะ';
  }
  if (!(input.ucResult in UC_RESULT)) return 'กรุณาเลือกผล U/C';

  if (input.symptoms.length > 0) {
    const symptomProblem = validateSymptoms(input.symptoms, catheterRemoved);
    if (symptomProblem) return symptomProblem;
  }

  if (input.ucResultDate !== null && !isDateString(input.ucResultDate)) {
    return 'วันที่ส่งผล U/C ไม่ถูกต้อง';
  }

  if (input.ucResult === 'NO_GROWTH') {
    if (input.organisms.length > 0 || input.organismOther !== null) {
      return 'ผล U/C ไม่พบเชื้อ จึงระบุชื่อเชื้อไม่ได้';
    }
    if (input.nonBacterialOrganism !== null) {
      return 'ผล U/C ไม่พบเชื้อ จึงระบุเชื้อที่ไม่ใช่แบคทีเรียไม่ได้';
    }
    return null;
  }

  if (input.ucResult === 'NON_BACTERIAL') {
    if (input.organisms.length > 0 || input.organismOther !== null) {
      return 'ผลที่ไม่ใช่แบคทีเรีย ให้ระบุชื่อเชื้อในช่องของตัวเองแทนการเลือกจากรายการ';
    }
    if (!input.nonBacterialOrganism) return 'กรุณาระบุชื่อเชื้อที่ไม่ใช่แบคทีเรีย';
    if (input.nonBacterialOrganism.length > ORGANISM_NAME_MAX) {
      return `ชื่อเชื้อยาวเกิน ${ORGANISM_NAME_MAX} อักขระ`;
    }
    return null;
  }

  // เหลือกรณี SIGNIFICANT — พบเชื้อแบคทีเรีย
  if (input.nonBacterialOrganism !== null) {
    return 'ผลที่พบเชื้อแบคทีเรีย ระบุเชื้อที่ไม่ใช่แบคทีเรียไม่ได้';
  }
  if (input.organismOther !== null) {
    if (input.organismOther.length === 0) return 'กรุณาระบุชื่อเชื้อในช่อง "อื่นๆ"';
    if (input.organismOther.length > ORGANISM_NAME_MAX) {
      return `ชื่อเชื้อยาวเกิน ${ORGANISM_NAME_MAX} อักขระ`;
    }
  }

  const total = input.organisms.length + (input.organismOther !== null ? 1 : 0);
  if (total === 0) return 'กรุณาเลือกเชื้อที่พบอย่างน้อย 1 ชนิด';
  if (total > MAX_ORGANISMS) return `เลือกเชื้อได้ไม่เกิน ${MAX_ORGANISMS} ชนิด`;
  if (new Set(input.organisms).size !== input.organisms.length) {
    return 'เลือกเชื้อซ้ำกัน';
  }
  if (!input.organisms.every(isKnownOrganism)) return 'มีชื่อเชื้อที่ไม่อยู่ในรายการ';

  return null;
}
