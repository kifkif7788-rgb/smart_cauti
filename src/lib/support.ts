/**
 * เรื่องที่แจ้งถึงผู้ดูแลระบบ — pure function ทดสอบได้โดยไม่ต้องมี DB
 */

export const SUPPORT_CATEGORY = {
  APP: 'แอปใช้งานไม่ได้ / ผิดพลาด',
  TAG: 'ป้าย QR ชำรุด สแกนไม่ได้',
  DATA: 'ข้อมูลผู้ป่วยไม่ถูกต้อง',
  ACCOUNT: 'บัญชีผู้ใช้ / PIN',
  OTHER: 'อื่น ๆ',
} as const;

export type SupportCategory = keyof typeof SUPPORT_CATEGORY;

export const SUPPORT_STATUS = {
  OPEN: 'รอดำเนินการ',
  RESOLVED: 'แก้ไขแล้ว',
} as const;

export type SupportStatus = keyof typeof SUPPORT_STATUS;

export const MESSAGE_MIN = 5;
export const MESSAGE_MAX = 1000;

export function isSupportCategory(value: unknown): value is SupportCategory {
  return typeof value === 'string' && value in SUPPORT_CATEGORY;
}

/**
 * ตรวจข้อความที่แจ้ง — คืนคำอธิบายปัญหา หรือ null เมื่อผ่าน
 *
 * ขั้นต่ำ 5 อักขระเพราะ "งง" หรือ "." ทำให้แอดมินต้องถามกลับทุกครั้ง
 * ซึ่งเสียเวลากว่าการให้พิมพ์เพิ่มอีกนิดตั้งแต่แรก
 */
export function validateSupportMessage(message: unknown): string | null {
  if (typeof message !== 'string' || message.trim().length === 0) {
    return 'กรุณาพิมพ์รายละเอียดปัญหา';
  }
  const trimmed = message.trim();
  if (trimmed.length < MESSAGE_MIN) {
    return `อธิบายปัญหาอย่างน้อย ${MESSAGE_MIN} ตัวอักษร เพื่อให้แอดมินเข้าใจโดยไม่ต้องถามกลับ`;
  }
  if (trimmed.length > MESSAGE_MAX) {
    return `ข้อความต้องไม่เกิน ${MESSAGE_MAX} ตัวอักษร`;
  }
  return null;
}

/**
 * เตือนเมื่อข้อความมีเลขยาวที่อาจเป็น HN
 *
 * ตารางนี้ไม่ใช่เวชระเบียน และแอดมินที่อ่านอาจไม่ใช่ผู้ดูแลผู้ป่วยรายนั้น
 * จึงเตือนก่อนส่ง แต่ไม่ห้าม เพราะบางเรื่องต้องอ้างถึงรายการจริงจึงจะแก้ได้
 */
export function looksLikeHn(message: string): boolean {
  return /\b(hn|เอชเอ็น)\b/i.test(message) || /\d{6,}/.test(message);
}
