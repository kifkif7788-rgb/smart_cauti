/**
 * ตั๋วยืนยันว่าสแกน QR ประจำเตียงจริง
 *
 * การกรอกรหัสเตียงเองพิสูจน์ไม่ได้ว่าพยาบาลอยู่ข้างเตียง การประเมินจึงรับเฉพาะ
 * ผู้ที่สแกนป้ายซึ่งมีลายเซ็น HMAC มาแล้วเท่านั้น
 *
 * ตั๋วมีอายุสั้นเพราะถ้าไม่หมดอายุ การ bookmark URL หลังสแกนครั้งเดียว
 * จะกลับเข้ามาประเมินได้ตลอดไปโดยไม่ต้องเดินไปที่เตียงอีก
 */

import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import type { NextResponse } from 'next/server';
import { sessionSecret } from './auth';

export const SCAN_COOKIE = 'scg_scan';
export const SCAN_MINUTES = 30;

/** แนบตั๋วไปกับ response หลังตรวจลายเซ็นป้ายผ่านแล้ว */
export async function attachScanProof<T extends NextResponse>(
  response: T,
  tagCode: string,
): Promise<T> {
  const token = await new SignJWT({ tag: tagCode })
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

/** ตั๋วต้องยังไม่หมดอายุ และต้องเป็นของเตียงเดียวกับที่กำลังจะประเมิน */
export async function hasScanProof(tagCode: string): Promise<boolean> {
  const store = await cookies();
  const token = store.get(SCAN_COOKIE)?.value;
  if (!token) return false;

  try {
    const { payload } = await jwtVerify(token, sessionSecret(), {
      algorithms: ['HS256'],
    });
    return payload.tag === tagCode;
  } catch {
    return false;
  }
}
