/**
 * ตรรกะการเปิดเผย feedback ตาม Study Mode — ส่วนที่เป็น pure function
 *
 * แยกออกจาก study.ts (ซึ่งแตะฐานข้อมูลและเป็น server-only) โดยตั้งใจ
 * เพราะนี่คือจุดที่ความถูกต้องของข้อมูลวิจัยทั้งชุดขึ้นอยู่กับ
 * จึงต้องทดสอบได้ตรง ๆ โดยไม่ต้อง mock Supabase
 */

import type { StudyMode } from '@/types/database';
import type { UserRole } from './auth-roles';
import { isBlindAssessor } from './auth-roles';

/**
 * ตัดสินว่า response นี้ควรมี feedback หรือไม่
 *
 * ไม่แสดง feedback เมื่อ:
 *   - โหมดเป็น BASELINE (ยังไม่ถึงช่วง intervention) หรือ
 *   - ผู้บันทึกเป็น AUDITOR (ต้องสังเกตอย่างอิสระในทุกโหมด)
 */
export function shouldRevealFeedback(mode: StudyMode, role: UserRole): boolean {
  if (isBlindAssessor(role)) return false;
  return mode === 'INTERVENTION';
}

/** dashboard เปิดให้พยาบาลเห็นเฉพาะช่วง intervention */
export function nurseCanSeeDashboard(mode: StudyMode): boolean {
  return mode === 'INTERVENTION';
}
