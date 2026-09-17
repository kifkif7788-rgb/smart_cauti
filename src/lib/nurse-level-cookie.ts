import 'server-only';
import { cookies } from 'next/headers';
import { NURSE_LEVEL_COOKIE, isNurseLevel, type NurseLevel } from './check5';

/**
 * คุณวุฒิผู้ประเมินที่เลือกไว้ที่หน้าแรก
 *
 * อ่านฝั่ง server เพื่อให้หน้าประเมินมีค่าตั้งแต่ render แรก ไม่ต้องรอ client
 * คืน null เมื่อยังไม่เคยเลือก เช่น สแกน QR เข้ามาโดยไม่ผ่านหน้าแรก
 */
export async function readNurseLevelCookie(): Promise<NurseLevel | null> {
  const store = await cookies();
  const value = store.get(NURSE_LEVEL_COOKIE)?.value;
  return isNurseLevel(value) ? value : null;
}

/**
 * คุณวุฒิผู้ประเมินที่จะใช้จริง
 *
 * บัญชีที่ระบุคุณวุฒิไว้แล้ว เช่น พยาบาลและผู้ช่วยเหลือคนไข้ ใช้ค่าจากบัญชีเลย
 * ไม่ต้องเลือกซ้ำทุกเวรและเลือกผิดไม่ได้ ส่วนบัญชีที่ไม่ได้ระบุ เช่น แอดมินหรือ IC
 * ยังใช้ค่าที่เลือกไว้เองได้ มิฉะนั้นจะประเมินไม่ได้เลย
 */
export async function resolveNurseLevel(
  session: { nurseLevel: NurseLevel | null } | null,
): Promise<NurseLevel | null> {
  return session?.nurseLevel ?? (await readNurseLevelCookie());
}
