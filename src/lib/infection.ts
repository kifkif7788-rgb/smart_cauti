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
  NO_GROWTH: 'ผล U/C ไม่พบเชื้อแบคทีเรีย',
  SIGNIFICANT: 'ผล U/C พบเชื้อแบคทีเรียไม่เกิน 2 ชนิด และมีจำนวน colony ≥ 10⁵ CFU/ml',
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

/** ข้อ 10.2.3 กำหนดว่าพบเชื้อได้ไม่เกิน 2 ชนิด */
export const MAX_ORGANISMS = 2;

export type InfectionOrigin = 'HAI' | 'CI';

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

/**
 * สรุปว่าติดเชื้อในโรงพยาบาลหรือในชุมชน
 *
 * HAI เมื่อ DOE ห่างจากวัน Admit ตั้งแต่ 3 วันขึ้นไป มิฉะนั้นเป็น CI
 * คืน null เมื่อวันที่ยังกรอกไม่ครบหรือ DOE มาก่อนวัน Admit
 */
export function classifyOrigin(
  admitDate: string,
  doeDate: string,
): InfectionOrigin | null {
  if (!isDateString(admitDate) || !isDateString(doeDate)) return null;
  const days = daysBetween(admitDate, doeDate);
  if (days < 0) return null;
  return days >= 3 ? 'HAI' : 'CI';
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
  | 'CVA_TENDERNESS'
  | 'APNEA'
  | 'BRADYCARDIA'
  | 'LETHARGY'
  | 'VOMITING';

export interface SymptomDef {
  no: number;
  code: SymptomCode;
  label: string;
  /** เกณฑ์เฉพาะผู้ป่วยอายุต่ำกว่า 1 ปี */
  infantOnly?: boolean;
  /**
   * ข้อ 3, 5 และ 7 ใช้ได้เฉพาะผู้ป่วยที่ถอดสายสวนแล้ว
   * เพราะผู้ที่ยังคาสายอยู่อาจมีอาการเหล่านี้โดยไม่ได้ติดเชื้อ
   */
  afterRemovalOnly?: boolean;
}

export const SYMPTOMS: readonly SymptomDef[] = [
  { no: 1, code: 'FEVER', label: 'มีไข้ > 38 องศาเซลเซียส' },
  { no: 2, code: 'HYPOTHERMIA', label: 'ตัวเย็น อุณหภูมิ < 36 องศาเซลเซียส' },
  { no: 3, code: 'DYSURIA', label: 'ปัสสาวะแสบขัด', afterRemovalOnly: true },
  { no: 4, code: 'SEDIMENT', label: 'ปัสสาวะมีตะกอน' },
  { no: 5, code: 'FREQUENCY', label: 'ปัสสาวะบ่อย', afterRemovalOnly: true },
  { no: 6, code: 'URGENCY', label: 'ปัสสาวะเฉียบพลัน' },
  {
    no: 7,
    code: 'SUPRAPUBIC_TENDERNESS',
    label: 'กดเจ็บบริเวณหัวหน่าวโดยไม่มีสาเหตุอื่น',
    afterRemovalOnly: true,
  },
  {
    no: 8,
    code: 'CVA_TENDERNESS',
    label: 'ปวดหลังหรือกดเจ็บบริเวณ Costovertebral angle โดยไม่มีสาเหตุอื่น',
  },
  { no: 9, code: 'APNEA', label: 'มีภาวะหยุดหายใจชั่วขณะ', infantOnly: true },
  { no: 10, code: 'BRADYCARDIA', label: 'หัวใจเต้นช้าผิดปกติ', infantOnly: true },
  { no: 11, code: 'LETHARGY', label: 'ซึมไม่มีสาเหตุอื่น', infantOnly: true },
  { no: 12, code: 'VOMITING', label: 'อาเจียนไม่มีสาเหตุอื่น', infantOnly: true },
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
    if (seen.has(entry.code)) return `เลือกข้อ ${def.no} ซ้ำ`;
    seen.add(entry.code);

    if (def.afterRemovalOnly && !catheterRemoved) {
      return `ข้อ ${def.no} ใช้ได้เฉพาะผู้ป่วยที่ถอดสายสวนปัสสาวะแล้ว`;
    }
    if (!isDateString(entry.onsetDate)) {
      return `กรุณากรอกวันที่เริ่มมีอาการของข้อ ${def.no}`;
    }
    if (entry.endDate !== null) {
      if (!isDateString(entry.endDate)) {
        return `วันที่สิ้นสุดของข้อ ${def.no} ไม่ถูกต้อง`;
      }
      if (daysBetween(entry.onsetDate, entry.endDate) < 0) {
        return `วันที่สิ้นสุดของข้อ ${def.no} ต้องไม่มาก่อนวันที่เริ่มมีอาการ`;
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
    return 'กรุณาเลือกสถานะการคาสายสวนปัสสาวะ (ข้อ 10.2.1)';
  }
  if (!(input.ucResult in UC_RESULT)) return 'กรุณาเลือกผล U/C';

  if (input.symptoms.length > 0) {
    const symptomProblem = validateSymptoms(input.symptoms, catheterRemoved);
    if (symptomProblem) return symptomProblem;
  }

  if (input.ucResult === 'NO_GROWTH') {
    return input.organisms.length > 0
      ? 'ผล U/C ไม่พบเชื้อ จึงเลือกชื่อเชื้อไม่ได้'
      : null;
  }

  if (input.organisms.length === 0) return 'กรุณาเลือกเชื้อที่พบอย่างน้อย 1 ชนิด';
  if (input.organisms.length > MAX_ORGANISMS) {
    return `เลือกเชื้อได้ไม่เกิน ${MAX_ORGANISMS} ชนิดตามเกณฑ์ข้อ 10.2.3`;
  }
  if (new Set(input.organisms).size !== input.organisms.length) {
    return 'เลือกเชื้อซ้ำกัน';
  }
  if (!input.organisms.every(isKnownOrganism)) return 'มีชื่อเชื้อที่ไม่อยู่ในรายการ';

  return null;
}
