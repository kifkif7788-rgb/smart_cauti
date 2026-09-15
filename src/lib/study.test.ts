import { describe, expect, it } from 'vitest';
import { shouldRevealFeedback, nurseCanSeeDashboard } from './study-mode';
import type { UserRole } from './auth-roles';

/**
 * ตรรกะที่ตัดสินว่าจะเปิดเผย feedback หรือไม่
 *
 * นี่คือจุดที่ความถูกต้องของข้อมูลวิจัยทั้งชุดขึ้นอยู่กับ —
 * ถ้ารั่วในช่วง baseline ข้อมูลก่อน–หลังจะเปรียบเทียบกันไม่ได้
 */
describe('shouldRevealFeedback', () => {
  const nurseRoles: UserRole[] = ['NURSE', 'WARD_HEAD', 'IC_NURSE', 'ADMIN'];

  it('โหมด BASELINE ไม่เปิดเผย feedback กับทุก role', () => {
    for (const role of [...nurseRoles, 'AUDITOR' as UserRole]) {
      expect(shouldRevealFeedback('BASELINE', role)).toBe(false);
    }
  });

  it('โหมด INTERVENTION เปิดเผย feedback กับผู้ปฏิบัติงาน', () => {
    for (const role of nurseRoles) {
      expect(shouldRevealFeedback('INTERVENTION', role)).toBe(true);
    }
  });

  it('AUDITOR ไม่เห็น feedback แม้อยู่ในโหมด INTERVENTION', () => {
    // ผู้ประเมินต้องสังเกตอย่างอิสระ ไม่ถูกชี้นำโดยคำแนะนำของระบบ
    expect(shouldRevealFeedback('INTERVENTION', 'AUDITOR')).toBe(false);
  });
});

describe('nurseCanSeeDashboard', () => {
  it('ซ่อน dashboard จากพยาบาลในช่วง baseline', () => {
    expect(nurseCanSeeDashboard('BASELINE')).toBe(false);
  });

  it('เปิด dashboard ให้พยาบาลในช่วง intervention', () => {
    expect(nurseCanSeeDashboard('INTERVENTION')).toBe(true);
  });
});
