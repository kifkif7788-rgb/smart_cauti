/**
 * บทบาทผู้ใช้และกฎการเข้าถึง — ส่วนที่เป็น pure function
 *
 * แยกจาก auth.ts ซึ่งใช้ node:crypto และ next/headers
 * เพื่อให้ตรรกะสิทธิ์ทดสอบได้โดยไม่ต้องมี request context
 */

export type UserRole = 'NURSE' | 'AUDITOR' | 'WARD_HEAD' | 'IC_NURSE' | 'ADMIN';

/** role ที่เห็น dashboard ได้เสมอ ไม่ขึ้นกับ study mode */
const DASHBOARD_ROLES: readonly UserRole[] = ['WARD_HEAD', 'IC_NURSE', 'ADMIN'];

export function canAlwaysSeeDashboard(role: UserRole): boolean {
  return DASHBOARD_ROLES.includes(role);
}

/**
 * role ที่สรุปแบบวินิจฉัยการติดเชื้อได้
 *
 * เป็นการตัดสินทางระบาดวิทยาที่ต้องใช้ผลเพาะเชื้อและเวชระเบียน
 * ไม่ใช่งานประจำเวรของพยาบาลข้างเตียง
 */
const DIAGNOSIS_ROLES: readonly UserRole[] = ['IC_NURSE', 'WARD_HEAD', 'ADMIN'];

export function canDiagnoseInfection(role: UserRole): boolean {
  return DIAGNOSIS_ROLES.includes(role);
}

/** แหล่งข้อมูลของการประเมิน — แยกข้อมูลผู้ประเมินออกจากพยาบาลเพื่อวิเคราะห์ */
export function sourceForRole(role: UserRole): 'NURSE' | 'AUDITOR' {
  return role === 'AUDITOR' ? 'AUDITOR' : 'NURSE';
}
