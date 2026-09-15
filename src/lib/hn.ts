/**
 * HN (Hospital Number) — การตรวจสอบและการแสดงผล
 *
 * ── หลักการจัดการข้อมูลส่วนบุคคล ────────────────────────────────────
 * HN เป็นข้อมูลระบุตัวบุคคล ระบบเก็บไว้เพื่อสองเรื่องเท่านั้น:
 *   1. ให้พยาบาลยืนยันว่ากำลังประเมินผู้ป่วยถูกคน
 *   2. เชื่อมข้อมูลกับ HIS ภายหลังเพื่อดึงผลการติดเชื้อ
 *
 * HN ไม่เคยปรากฏใน:
 *   - QR code (ป้ายอยู่ในตำแหน่งที่ผู้อื่นมองเห็นได้)
 *   - ไฟล์ export ของงานวิจัย (ใช้ study_code ที่ระบบสร้างแทน)
 *   - URL หรือ query string (ป้องกันการรั่วผ่าน log ของเซิร์ฟเวอร์)
 * ────────────────────────────────────────────────────────────────────
 */

/**
 * รูปแบบ HN ต่างกันในแต่ละโรงพยาบาล บางแห่งเป็นตัวเลขล้วน
 * บางแห่งมีตัวอักษรหรือขีดคั่น จึงรับได้กว้างแต่ยังกันค่าที่ผิดชัดเจน
 */
const HN_RE = /^[A-Za-z0-9-]{4,15}$/;

export function isValidHn(value: unknown): value is string {
  return typeof value === 'string' && HN_RE.test(value.trim());
}

/** ตัดช่องว่างและทำให้ตัวอักษรเป็นพิมพ์ใหญ่ เพื่อไม่ให้ HN เดียวกันซ้ำหลายรูปแบบ */
export function normalizeHn(value: string): string {
  return value.trim().toUpperCase();
}

/**
 * ปิดบัง HN บางส่วนสำหรับหน้าจอที่ไม่ต้องยืนยันตัวผู้ป่วย เช่น รายการรวม
 * แสดง 4 ตัวท้าย ซึ่งพอให้พยาบาลแยกผู้ป่วยออกจากกันได้
 * แต่ไม่พอให้ผู้ที่มองจอผ่าน ๆ จดไปใช้ต่อ
 */
export function maskHn(hn: string): string {
  if (hn.length <= 4) return hn;
  return `••••${hn.slice(-4)}`;
}

/**
 * เหตุผลการปิด episode ที่เลือกได้
 * บันทึกไว้เพื่อให้แยกได้ว่าการถอดสายเกิดจากการทบทวนข้อบ่งชี้
 * หรือเกิดจากการจำหน่ายผู้ป่วย ซึ่งตีความต่างกันในผลการวิจัย
 */
export const REMOVAL_REASONS = [
  'หมดข้อบ่งชี้ — ถอดสายตามแผนการรักษา',
  'จำหน่ายผู้ป่วย',
  'ย้ายหอผู้ป่วย',
  'เปลี่ยนสายใหม่',
  'ผู้ป่วยเสียชีวิต',
  'อื่น ๆ',
] as const;

export type RemovalReason = (typeof REMOVAL_REASONS)[number];

export function isValidRemovalReason(value: unknown): value is RemovalReason {
  return (
    typeof value === 'string' && REMOVAL_REASONS.includes(value as RemovalReason)
  );
}
