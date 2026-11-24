import { describe, expect, it } from 'vitest';
import { canSeeAssessorNames, dashboardScope, type UserRole } from './auth-roles';

const ALL_ROLES: UserRole[] = ['NURSE', 'AUDITOR', 'WARD_HEAD', 'IC_NURSE', 'ADMIN'];

describe('canSeeAssessorNames', () => {
  it('ผู้กำกับคุณภาพของหอผู้ป่วยเห็นชื่อผู้ประเมินรายคน', () => {
    expect(canSeeAssessorNames('IC_NURSE')).toBe(true);
    expect(canSeeAssessorNames('WARD_HEAD')).toBe(true);
    expect(canSeeAssessorNames('ADMIN')).toBe(true);
  });

  it('พยาบาลข้างเตียงและผู้ประเมินฝ่ายวิจัยไม่เห็นสถิติรายบุคคล', () => {
    expect(canSeeAssessorNames('NURSE')).toBe(false);
    expect(canSeeAssessorNames('AUDITOR')).toBe(false);
  });

  it('ทุก role ที่เห็นชื่อต้องเห็นแดชบอร์ดแบบเต็มอยู่แล้ว', () => {
    // รายชื่ออยู่ในส่วน FULL ของแดชบอร์ด ถ้าสองเงื่อนไขนี้ไม่ตรงกัน
    // จะมี role ที่ระบบ query ชื่อมาให้แต่ไม่มีที่แสดง
    for (const role of ALL_ROLES.filter(canSeeAssessorNames)) {
      expect(dashboardScope(role)).toBe('FULL');
    }
  });
});
