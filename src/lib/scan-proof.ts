/**
 * ตั๋วยืนยันว่าสแกน QR มาจริง
 *
 * การกรอกรหัสเตียงเองพิสูจน์ไม่ได้ว่าพยาบาลอยู่ข้างเตียง การประเมินจึงรับเฉพาะ
 * ผู้ที่สแกนป้ายซึ่งมีลายเซ็น HMAC มาแล้วเท่านั้น
 *
 * ตั๋วมีอายุสั้นเพราะถ้าไม่หมดอายุ การ bookmark URL หลังสแกนครั้งเดียว
 * จะกลับเข้ามาประเมินได้ตลอดไปโดยไม่ต้องเดินไปที่เตียงอีก
 *
 * หนึ่งตั๋วเก็บได้หลายรหัส เพราะการใส่สายหนึ่งรอบต้องผ่านหลายป้าย —
 * สแกนป้ายบนชุดอุปกรณ์ แล้วเข้าเตียงที่ระบุ แล้วกลับมาบันทึกเตียงถัดไป
 * ถ้าเก็บได้รหัสเดียว รหัสก่อนหน้าจะถูกแทนที่และต้องเดินไปสแกนซ้ำทุกครั้ง
 */

import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import type { NextResponse } from 'next/server';
import { sessionSecret } from './auth';

export const SCAN_COOKIE = 'scg_scan';
export const SCAN_MINUTES = 30;

/**
 * จำนวนรหัสที่ตั๋วใบเดียวถือได้
 *
 * มากพอสำหรับการใส่สายหลายเตียงติดกันในรอบเดียว แต่ไม่มากจนกลายเป็น
 * การสะสมสิทธิ์เข้าถึงทั้งหอไว้ในตั๋วใบเดียว
 */
const MAX_CODES = 8;

/** รหัสทั้งหมดในตั๋วปัจจุบัน — คืนอาร์เรย์ว่างเมื่อไม่มีตั๋วหรือตั๋วใช้ไม่ได้ */
async function readCodes(token: string | undefined): Promise<string[]> {
  if (!token) return [];
  try {
    const { payload } = await jwtVerify(token, sessionSecret(), { algorithms: ['HS256'] });
    // ตั๋วรูปแบบเดิมเก็บรหัสเดียวในช่อง tag — ยังต้องใช้ได้ระหว่างที่ยังไม่หมดอายุ
    if (Array.isArray(payload.tags)) {
      return payload.tags.filter((t): t is string => typeof t === 'string');
    }
    return typeof payload.tag === 'string' ? [payload.tag] : [];
  } catch {
    return [];
  }
}

/**
 * แนบตั๋วไปกับ response หลังตรวจลายเซ็นป้ายผ่านแล้ว
 *
 * รหัสเดิมในตั๋วยังอยู่ และอายุตั๋วเริ่มนับใหม่ทุกครั้งที่สแกน
 */
export async function attachScanProof<T extends NextResponse>(
  response: T,
  tagCode: string,
): Promise<T> {
  const store = await cookies();
  const existing = await readCodes(store.get(SCAN_COOKIE)?.value);
  // รหัสล่าสุดอยู่ท้ายสุด รหัสที่เก่าที่สุดจึงหลุดออกก่อนเมื่อเต็ม
  const codes = [...existing.filter((c) => c !== tagCode), tagCode].slice(-MAX_CODES);

  const token = await new SignJWT({ tags: codes })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${SCAN_MINUTES}m`)
    .sign(sessionSecret());

  response.cookies.set(SCAN_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SCAN_MINUTES * 60,
  });

  return response;
}

/** ตั๋วต้องยังไม่หมดอายุ และต้องมีรหัสที่กำลังจะเข้าถึงอยู่ในตั๋ว */
export async function hasScanProof(tagCode: string): Promise<boolean> {
  const store = await cookies();
  const codes = await readCodes(store.get(SCAN_COOKIE)?.value);
  return codes.includes(tagCode);
}
