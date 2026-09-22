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

/**
 * รหัสป้ายบนชุดอุปกรณ์ใส่สาย — รูปแบบ XX-KIT
 *
 * ต่างจากป้ายประจำเตียงตรงที่ไม่ผูกกับเตียงใดเลย เพราะชุดอุปกรณ์ถูกหยิบไปใช้
 * กับเตียงไหนก็ได้ พยาบาลจึงต้องเลือกเตียงเองหลังสแกน
 *
 * ใช้ลายเซ็นชุดเดียวกับป้ายประจำเตียง จึงปลอมรหัสขึ้นมาเองไม่ได้เช่นกัน
 */
const KIT_CODE_RE = /^([A-Z]{2})-KIT$/;

export function isValidKitCode(value: unknown): value is string {
  return typeof value === 'string' && KIT_CODE_RE.test(value);
}

/** รหัสป้ายชุดอุปกรณ์ของหอผู้ป่วย — คำนำหน้าเดียวกับป้ายประจำเตียง */
export function kitCodeForWard(wardPrefix: string): string {
  return `${wardPrefix.toUpperCase().slice(0, 2).padEnd(2, 'X')}-KIT`;
}

/** คำนำหน้าหอผู้ป่วยจากรหัสป้าย ใช้ได้ทั้งป้ายเตียงและป้ายชุดอุปกรณ์ */
export function wardPrefixFromCode(code: string): string | null {
  return KIT_CODE_RE.exec(code)?.[1] ?? TAG_CODE_RE.exec(code)?.[0].slice(0, 2) ?? null;
}

/** URL เต็มสำหรับพิมพ์ลงป้าย QR */
export function tagUrl(tagCode: string, baseUrl: string): string {
  const base = baseUrl.replace(/\/+$/, '');
  return `${base}/s/${encodeURIComponent(tagCode)}?k=${signTagCode(tagCode)}`;
}

/**
 * URL เต็มสำหรับพิมพ์ลงป้ายชุดอุปกรณ์
 *
 * ใช้ path /k แยกจาก /s เพื่อให้ URL บนป้ายสั้น และเพื่อให้เส้นทางที่พา
 * ไปหน้าเลือกเตียงแยกขาดจากเส้นทางที่พาเข้าแบบประเมินของเตียงใดเตียงหนึ่ง
 */
export function kitUrl(kitCode: string, baseUrl: string): string {
  const base = baseUrl.replace(/\/+$/, '');
  return `${base}/k/${encodeURIComponent(kitCode)}?k=${signTagCode(kitCode)}`;
}

/**
 * รหัสป้ายประจำเตียง — รูปแบบ XX-Bnn
 *   XX  รหัสหอผู้ป่วยสองตัว เช่น SM
 *   nn  หมายเลขเตียงสองหลัก 01–99
 *
 * เช่น SM-B01 = เตียง 1 ของหอศัลยกรรมชาย
 *
 * รหัสอ่านออกโดยตั้งใจ เพราะพยาบาลต้องพิมพ์เองเมื่อกล้องใช้ไม่ได้
 * และต้องตรวจสอบได้ทันทีว่าสแกนถูกเตียงหรือไม่
 * ความปลอดภัยมาจาก HMAC ไม่ใช่จากการเดารหัสไม่ได้
 */
const TAG_CODE_RE = /^[A-Z]{2}-B(\d{2})$/;

export function isValidTagCode(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const match = TAG_CODE_RE.exec(value);
  if (!match) return false;
  const bed = Number(match[1]);
  return bed >= 1 && bed <= 99;
}

/** รหัสป้ายของเตียงที่กำหนด — เตียง 1 → "SM-B01" */
export function tagCodeForBed(wardPrefix: string, bedNo: number): string {
  if (!Number.isInteger(bedNo) || bedNo < 1 || bedNo > 99) {
    throw new Error(`หมายเลขเตียงต้องอยู่ระหว่าง 1–99 (ได้รับ ${bedNo})`);
  }
  const prefix = wardPrefix.toUpperCase().slice(0, 2).padEnd(2, 'X');
  return `${prefix}-B${String(bedNo).padStart(2, '0')}`;
}

/** อ่านหมายเลขเตียงจากรหัสป้าย — คืน null เมื่อรูปแบบไม่ถูกต้อง */
export function bedNoFromTagCode(tagCode: string): number | null {
  const match = TAG_CODE_RE.exec(tagCode);
  if (!match) return null;
  const bed = Number(match[1]);
  return bed >= 1 && bed <= 99 ? bed : null;
}
