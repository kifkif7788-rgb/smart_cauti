/**
 * CAUTI Bundle CHECK 5 — นิยามและตรรกะการให้ feedback
 *
 * อ้างอิง: Web Application Specification v1.0 ส่วนที่ 5.2 และ 5.3
 * และภาคผนวกแบบประเมิน CHECK 5 ของโครงการวิจัย
 *
 * โมดูลนี้เป็น pure function ทั้งหมด ไม่พึ่ง network หรือ DB
 * จึงทดสอบได้ตรง ๆ และใช้ซ้ำได้ทั้งฝั่ง server และ client
 */

export const CHECK5_KEYS = ['need', 'fix', 'flow', 'below', 'closed'] as const;
export type Check5Key = (typeof CHECK5_KEYS)[number];

/**
 * คุณวุฒิของผู้ลงมือประเมิน — คนละเรื่องกับ role ในระบบซึ่งบอกสิทธิ์การใช้งาน
 * งานวิจัยใช้เปรียบเทียบความสอดคล้องของการปฏิบัติระหว่างสองกลุ่ม
 */
export const NURSE_LEVEL = {
  RN: 'RN · พยาบาลวิชาชีพ',
  PN: 'PN · ผู้ช่วยพยาบาล',
} as const;

export type NurseLevel = keyof typeof NURSE_LEVEL;

/** เลือกครั้งเดียวที่หน้าแรกแล้วใช้ได้ทั้งเวร — หนึ่งเวรเท่ากับ 8 ชั่วโมง */
export const NURSE_LEVEL_COOKIE = 'scg_nurse_level';
export const NURSE_LEVEL_MAX_AGE = 8 * 60 * 60;

export function isNurseLevel(value: unknown): value is NurseLevel {
  return value === 'RN' || value === 'PN';
}

/** คำตอบ 5 ข้อ — true = ผ่าน, false = ไม่ผ่าน */
export type Check5Answers = Record<Check5Key, boolean>;

/**
 * ประเภทการตอบสนองเมื่อข้อนั้นไม่ผ่าน
 *  CORRECT_NOW    — พยาบาลแก้ไขได้เองทันที ณ จุดดูแล
 *  REVIEW_REMOVAL — ต้องทบทวนความจำเป็นกับทีม/แพทย์ ไม่ใช่สิ่งที่แก้ที่เตียงได้
 *  PROTOCOL       — ต้องดำเนินการตาม protocol ของหน่วยงาน (ระบบปิดเสีย)
 */
export type ActionKind = 'CORRECT_NOW' | 'REVIEW_REMOVAL' | 'PROTOCOL';

export type FeedbackType = 'PASS' | 'CORRECT_NOW' | 'REVIEW_REMOVAL' | 'CLOSED_BREACH';

export interface Check5Item {
  key: Check5Key;
  order: number;
  /** ชื่อย่อภาษาอังกฤษที่ใช้ในโปสเตอร์และ dashboard */
  label: string;
  /** ชื่อภาษาไทยสั้น ๆ สำหรับ dashboard */
  labelTh: string;
  /** คำถาม ณ จุดดูแล — ข้อความตามภาคผนวกของโครงการ */
  question: string;
  /** คำอธิบายช่วยตัดสิน แสดงใต้คำถาม */
  hint: string;
  /** ประเภทการตอบสนองเมื่อไม่ผ่าน */
  actionKind: ActionKind;
  /** พาดหัวคำแนะนำเมื่อไม่ผ่าน */
  actionTitle: string;
  /** คำแนะนำเต็มเมื่อไม่ผ่าน */
  actionMessage: string;
}

export const CHECK5_ITEMS: readonly Check5Item[] = [
  {
    key: 'need',
    order: 1,
    label: 'NEED',
    labelTh: 'ข้อบ่งชี้',
    question: 'วันนี้ยังมีข้อบ่งชี้ที่ได้รับการยอมรับในการคาสายหรือไม่',
    hint: 'ทบทวนข้อบ่งชี้ตามแนวทางหน่วยงานก่อนตอบ',
    actionKind: 'REVIEW_REMOVAL',
    actionTitle: 'Review for Removal',
    actionMessage:
      'ทบทวนความจำเป็นของการคาสายตามแนวทางหน่วยงาน / nurse-driven protocol และแจ้งทีมผู้ดูแล',
  },
  {
    key: 'fix',
    order: 2,
    label: 'FIX',
    labelTh: 'การยึดตรึง',
    question: 'สายได้รับการยึดเหมาะสม ไม่มี movement หรือ urethral traction',
    hint: 'ตรวจ catheter securement device และแรงดึงที่ท่อปัสสาวะ',
    actionKind: 'CORRECT_NOW',
    actionTitle: 'Correct Securement',
    actionMessage: 'ปรับการยึดสายให้เหมาะสม ลดแรงดึงที่ท่อปัสสาวะ',
  },
  {
    key: 'flow',
    order: 3,
    label: 'FLOW',
    labelTh: 'การไหล',
    question: 'catheter/tubing ไม่พับงอ และ urine flow ไม่ถูกกีดขวาง',
    hint: 'ตรวจ patency ตลอดแนวสายและปริมาณปัสสาวะ',
    actionKind: 'CORRECT_NOW',
    actionTitle: 'Correct Now',
    actionMessage: 'จัดสายใหม่ไม่ให้พับงอ และประเมินการไหลของปัสสาวะซ้ำ',
  },
  {
    key: 'below',
    order: 4,
    label: 'BELOW',
    labelTh: 'ตำแหน่งถุง',
    question: 'ถุงอยู่ต่ำกว่ากระเพาะปัสสาวะ และไม่วางบนพื้น',
    hint: 'ถุงต้องต่ำกว่าระดับกระเพาะปัสสาวะเสมอ และไม่สัมผัสพื้น',
    actionKind: 'CORRECT_NOW',
    actionTitle: 'Reposition Now',
    actionMessage: 'จัดถุงให้ต่ำกว่ากระเพาะปัสสาวะ แขวนโดยไม่สัมผัสพื้น',
  },
  {
    key: 'closed',
    order: 5,
    label: 'CLOSED',
    labelTh: 'ระบบปิด',
    question: 'ระบบ drainage ปิดสมบูรณ์ ไม่มี disconnection หรือ leakage',
    hint: 'ตรวจทุก junction ตลอดระบบ',
    actionKind: 'PROTOCOL',
    actionTitle: 'ดำเนินการตามแนวทางเมื่อระบบปิดเสีย',
    actionMessage:
      'ดำเนินการตาม protocol ของหน่วยงานเมื่อระบบปิดเสีย และรายงานทีมผู้ดูแล',
  },
] as const;

export const CHECK5_BY_KEY: Record<Check5Key, Check5Item> = Object.fromEntries(
  CHECK5_ITEMS.map((i) => [i.key, i]),
) as Record<Check5Key, Check5Item>;

export interface FailedItem {
  key: Check5Key;
  label: string;
  order: number;
  actionKind: ActionKind;
  actionTitle: string;
  actionMessage: string;
}

export interface Check5Result {
  allPass: boolean;
  feedback: FeedbackType;
  failedItems: FailedItem[];
  /** ต้องแจ้งทีม/แพทย์ — NEED หรือ CLOSED ไม่ผ่าน */
  requiresEscalation: boolean;
  /** ข้อที่พยาบาลแก้ไขเองได้ ใช้เป็นตัวส่วนของ corrective action rate */
  correctableKeys: Check5Key[];
}

/**
 * ประเมินผล CHECK 5
 *
 * ลำดับความรุนแรง (ข้อที่รุนแรงกว่าเป็นตัวกำหนด feedback รวม):
 *   1. NEED ไม่ผ่าน                      → REVIEW_REMOVAL  (รุนแรงสุด)
 *   2. CLOSED ไม่ผ่าน                    → CLOSED_BREACH
 *   3. FIX/FLOW/BELOW ไม่ผ่าน อย่างน้อย 1 → CORRECT_NOW
 *   4. ผ่านครบ                            → PASS
 *
 * NEED มาก่อน CLOSED เพราะถ้าไม่มีข้อบ่งชี้แล้ว การถอดสายแก้ปัญหาทั้งหมดในคราวเดียว
 */
export function evaluateCheck5(answers: Check5Answers): Check5Result {
  const failedItems: FailedItem[] = CHECK5_ITEMS.filter((item) => !answers[item.key]).map(
    (item) => ({
      key: item.key,
      label: item.label,
      order: item.order,
      actionKind: item.actionKind,
      actionTitle: item.actionTitle,
      actionMessage: item.actionMessage,
    }),
  );

  const allPass = failedItems.length === 0;

  let feedback: FeedbackType;
  if (allPass) {
    feedback = 'PASS';
  } else if (!answers.need) {
    feedback = 'REVIEW_REMOVAL';
  } else if (!answers.closed) {
    feedback = 'CLOSED_BREACH';
  } else {
    feedback = 'CORRECT_NOW';
  }

  return {
    allPass,
    feedback,
    failedItems,
    requiresEscalation: !answers.need || !answers.closed,
    correctableKeys: failedItems
      .filter((f) => f.actionKind === 'CORRECT_NOW')
      .map((f) => f.key),
  };
}

/** ตรวจว่า payload มีคำตอบครบทั้ง 5 ข้อและเป็น boolean จริง */
export function parseAnswers(input: unknown): Check5Answers | null {
  if (typeof input !== 'object' || input === null) return null;
  const record = input as Record<string, unknown>;
  const answers = {} as Check5Answers;
  for (const key of CHECK5_KEYS) {
    if (typeof record[key] !== 'boolean') return null;
    answers[key] = record[key] as boolean;
  }
  return answers;
}
