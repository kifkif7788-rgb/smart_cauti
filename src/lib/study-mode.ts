/** นโยบายการแสดงผลประเมินและสิทธิ์ Dashboard */

import type { StudyMode } from '@/types/database';
import type { UserRole } from './auth-roles';

/** ตามข้อกำหนดปัจจุบัน ทุก role เห็นผลและคำแนะนำได้ทุกโหมด */
export function shouldRevealFeedback(_mode: StudyMode, _role: UserRole): boolean {
  return true;
}

/** dashboard เปิดให้พยาบาลเห็นเฉพาะช่วง intervention */
export function nurseCanSeeDashboard(mode: StudyMode): boolean {
  return mode === 'INTERVENTION';
}
