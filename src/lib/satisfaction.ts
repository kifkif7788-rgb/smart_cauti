/**
 * แบบสอบถามความพึงพอใจสำหรับงานนำเสนอผลงาน
 *
 * pure function ล้วน ทดสอบได้โดยไม่ต้องมี DB
 * ลำดับใน SATISFACTION_ITEMS คือลำดับของค่าใน คอลัมน์ scores จึงห้ามสลับ
 * ถ้าจะเปลี่ยนข้อคำถาม ให้แก้ข้อความได้ แต่การเพิ่มหรือลดข้อต้องแก้ constraint ด้วย
 */

export const SATISFACTION_ITEMS = [
  'แอป Smart CAUTI Care ใช้งานง่าย เข้าใจไม่ยาก',
  'ชุดอุปกรณ์ (Set Kit) ครบถ้วน หยิบใช้สะดวก',
  'โปสเตอร์นำเสนอ อ่านเข้าใจง่าย ได้เนื้อหาที่เป็นประโยชน์',
  'การเยี่ยมชมบูธ ผู้นำเสนอให้ข้อมูลชัดเจน ตอบข้อสงสัยได้ดี',
  'ความพึงพอใจโดยรวมต่อผลงานนี้',
] as const;

/** ป้ายกำกับระดับคะแนน เรียงจาก 1 ถึง 5 */
export const SATISFACTION_SCALE = [
  'น้อยที่สุด',
  'น้อย',
  'ปานกลาง',
  'มาก',
  'มากที่สุด',
] as const;

export const COMMENT_MAX = 1000;

/**
 * ตรวจคะแนนที่ส่งเข้ามา — คืนคำอธิบายปัญหา หรือ null เมื่อผ่าน
 *
 * ต้องตอบครบทุกข้อ เพราะข้อที่เว้นว่างทำให้ค่าเฉลี่ยรายข้อเทียบกันไม่ได้
 * และผู้ตอบที่ข้ามข้อมักเป็นคนที่ไม่ได้ดูส่วนนั้นจริง ๆ ซึ่งควรเลือกตอบมากกว่าเว้น
 */
export function validateScores(value: unknown): string | null {
  if (!Array.isArray(value) || value.length !== SATISFACTION_ITEMS.length) {
    return `กรุณาให้คะแนนครบทั้ง ${SATISFACTION_ITEMS.length} ข้อ`;
  }
  if (value.some((n) => !Number.isInteger(n) || (n as number) < 1 || (n as number) > 5)) {
    return 'คะแนนต้องอยู่ระหว่าง 1 ถึง 5';
  }
  return null;
}

/** ตรวจความเห็นปลายเปิด ซึ่งไม่บังคับกรอก */
export function validateComment(value: unknown): string | null {
  if (value == null || value === '') return null;
  if (typeof value !== 'string') return 'รูปแบบความเห็นไม่ถูกต้อง';
  if (value.trim().length > COMMENT_MAX) {
    return `ความเห็นต้องไม่เกิน ${COMMENT_MAX} ตัวอักษร`;
  }
  return null;
}

/** ค่าเฉลี่ยรายข้อ เรียงตามลำดับเดียวกับ SATISFACTION_ITEMS */
export function itemAverages(responses: { scores: number[] }[]): (number | null)[] {
  return SATISFACTION_ITEMS.map((_, i) => {
    const values = responses.map((r) => r.scores[i]).filter((n) => typeof n === 'number');
    if (values.length === 0) return null;
    return values.reduce((a, b) => a + b, 0) / values.length;
  });
}

/** ค่าเฉลี่ยรวมทุกข้อทุกคน — null เมื่อยังไม่มีใครตอบ */
export function overallAverage(responses: { scores: number[] }[]): number | null {
  const all = responses.flatMap((r) => r.scores).filter((n) => typeof n === 'number');
  if (all.length === 0) return null;
  return all.reduce((a, b) => a + b, 0) / all.length;
}
