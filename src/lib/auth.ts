/**
 * Authentication — รหัสบุคลากร + PIN 6 หลัก
 *
 * เลือก PIN แทนรหัสผ่านเพราะพยาบาลต้องเข้าระบบหน้าเตียงหลายครั้งต่อเวร
 * และมักสวมถุงมือ การพิมพ์รหัสผ่านยาวทำให้เวลาต่อการประเมินเกิน 30 วินาที
 *
 * PIN เก็บเป็น scrypt hash เท่านั้น ไม่เก็บ PIN ดิบที่ใดเลย
 * Session เป็น JWT ใน httpOnly cookie อายุ 8 ชั่วโมง เท่ากับหนึ่งเวรพอดี
 * เพื่อไม่ให้พยาบาลเวรถัดไปใช้ session ของเวรก่อนต่อบนเครื่องที่ใช้ร่วมกัน
 */

import { scrypt, randomBytes, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';

const scryptAsync = promisify(scrypt) as (
  password: string,
  salt: string,
  keylen: number,
) => Promise<Buffer>;

export const SESSION_COOKIE = 'scg_session';
const SESSION_HOURS = 8;
const KEY_LENGTH = 32;

export type { UserRole } from './auth-roles';
export { canAlwaysSeeDashboard, canDiagnoseInfection, sourceForRole } from './auth-roles';

import type { UserRole } from './auth-roles';
import { isNurseLevel, type NurseLevel } from './check5';

export interface SessionUser {
  userId: string;
  employeeId: string;
  fullName: string;
  role: UserRole;
  wardCodes: string[];
  /** คุณวุฒิที่ผูกกับบัญชี — null สำหรับบัญชีที่ไม่ได้ระบุไว้ เช่น แอดมิน */
  nurseLevel: NurseLevel | null;
}

// ── PIN hashing ──────────────────────────────────────────────────────

/** สร้าง hash รูปแบบ  scrypt$<saltHex>$<keyHex> */
export async function hashPin(pin: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const key = await scryptAsync(pin, salt, KEY_LENGTH);
  return `scrypt$${salt}$${key.toString('hex')}`;
}

/** ตรวจ PIN แบบ constant-time เพื่อไม่ให้เวลาตอบสนองบอกใบ้ */
export async function verifyPin(pin: string, stored: string): Promise<boolean> {
  const parts = stored.split('$');
  if (parts.length !== 3 || parts[0] !== 'scrypt') return false;
  const [, salt, keyHex] = parts;
  let expected: Buffer;
  try {
    expected = Buffer.from(keyHex, 'hex');
  } catch {
    return false;
  }
  if (expected.length !== KEY_LENGTH) return false;
  const actual = await scryptAsync(pin, salt, KEY_LENGTH);
  return timingSafeEqual(actual, expected);
}

/** PIN ต้องเป็นตัวเลข 6 หลักพอดี */
export function isValidPinFormat(pin: unknown): pin is string {
  return typeof pin === 'string' && /^\d{6}$/.test(pin);
}

// ── JWT session ──────────────────────────────────────────────────────

export function sessionSecret(): Uint8Array {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      'SESSION_SECRET ไม่ได้ตั้งค่า หรือสั้นกว่า 32 อักขระ — ดู .env.example',
    );
  }
  return new TextEncoder().encode(secret);
}

export async function createSessionToken(user: SessionUser): Promise<string> {
  return new SignJWT({
    employeeId: user.employeeId,
    fullName: user.fullName,
    role: user.role,
    wardCodes: user.wardCodes,
    nurseLevel: user.nurseLevel,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(user.userId)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_HOURS}h`)
    .sign(sessionSecret());
}

export async function readSessionToken(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, sessionSecret(), {
      algorithms: ['HS256'],
    });
    if (!payload.sub) return null;
    return {
      userId: payload.sub,
      employeeId: String(payload.employeeId ?? ''),
      fullName: String(payload.fullName ?? ''),
      role: payload.role as UserRole,
      wardCodes: Array.isArray(payload.wardCodes) ? (payload.wardCodes as string[]) : [],
      nurseLevel: isNurseLevel(payload.nurseLevel) ? payload.nurseLevel : null,
    };
  } catch {
    return null;
  }
}

/** อ่าน session ปัจจุบัน — คืน null เมื่อยังไม่ login หรือ token หมดอายุ */
export async function getSession(): Promise<SessionUser | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return readSessionToken(token);
}

export async function setSessionCookie(token: string): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_HOURS * 60 * 60,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

// Role helper ทั้งหมดอยู่ใน auth-roles.ts และ re-export ไว้ด้านบน
// เพื่อให้ทดสอบได้โดยไม่ต้องมี request context
