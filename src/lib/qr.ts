/**
 * QR Tag — การเข้ารหัสและตรวจสอบ
 *
 * ข้อกำหนดสำคัญ (spec ส่วนที่ 4):
 *   ป้าย QR ติดอยู่บน drainage tubing ซึ่งผู้อื่นในหอผู้ป่วยมองเห็นได้
 *   จึงต้องไม่มี HN ชื่อผู้ป่วย หรือข้อมูลระบุตัวตนใด ๆ อยู่ใน QR
 *   ใช้เพียง tagCode ที่ไม่สื่อความหมาย + HMAC กันการเดารหัสป้ายอื่น
 *
 * รูปแบบ URL:  {BASE_URL}/s/{tagCode}?k={hmac}
 */

import { createHmac, timingSafeEqual } from 'node:crypto';

const HMAC_LENGTH = 12;

function qrSecret(): string {
  const secret = process.env.QR_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error('QR_SECRET ไม่ได้ตั้งค่า หรือสั้นกว่า 32 อักขระ — ดู .env.example');
  }
  return secret;
}

/** ลายเซ็นของรหัสป้าย — base64url ตัดเหลือ 12 อักขระ */
export function signTagCode(tagCode: string): string {
  return createHmac('sha256', qrSecret())
    .update(tagCode)
    .digest('base64url')
    .slice(0, HMAC_LENGTH);
}

/** ตรวจลายเซ็นแบบ constant-time */
export function verifyTagSignature(tagCode: string, signature: string | null): boolean {
  if (!signature || signature.length !== HMAC_LENGTH) return false;
  const expected = Buffer.from(signTagCode(tagCode));
  const actual = Buffer.from(signature);
  if (expected.length !== actual.length) return false;
  return timingSafeEqual(expected, actual);
}

/** URL เต็มสำหรับพิมพ์ลงป้าย QR */
export function tagUrl(tagCode: string, baseUrl: string): string {
  const base = baseUrl.replace(/\/+$/, '');
  return `${base}/s/${encodeURIComponent(tagCode)}?k=${signTagCode(tagCode)}`;
}

/**
 * รหัสป้ายต้องเป็นรูปแบบ XX-XXXXXX (ตัวพิมพ์ใหญ่และตัวเลข)
 * เช่น SM-A17K3Q — สองตัวแรกคือรหัสหอผู้ป่วย
 */
const TAG_CODE_RE = /^[A-Z]{2}-[A-Z0-9]{6}$/;

export function isValidTagCode(value: unknown): value is string {
  return typeof value === 'string' && TAG_CODE_RE.test(value);
}

/** สร้างรหัสป้ายใหม่ — ตัดอักขระที่สับสนง่าย (0/O, 1/I) ออก */
const SAFE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function generateTagCode(wardPrefix: string, random: () => number = Math.random): string {
  const prefix = wardPrefix.toUpperCase().slice(0, 2).padEnd(2, 'X');
  let suffix = '';
  for (let i = 0; i < 6; i += 1) {
    suffix += SAFE_CHARS[Math.floor(random() * SAFE_CHARS.length)];
  }
  return `${prefix}-${suffix}`;
}
