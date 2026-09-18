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

/**
 * ส่วนของ dashboard ที่แต่ละ role เห็น
 *
 *  FULL  ภาพรวมทั้งหมด รวมสัดส่วนการปฏิบัติตาม bundle และผู้ประเมินแยก RN/NA
 *        สำหรับหัวหน้าหอ พยาบาล IC ผู้ประเมิน และผู้ดูแลระบบ ซึ่งใช้กำกับคุณภาพ
 *
 *  CARE  เฉพาะข้อมูลที่ใช้ดูแลผู้ป่วยตรงหน้า คือจำนวนผู้ป่วยที่คาสาย 7 วันล่าสุด
 *        และรายชื่อที่ควรทบทวนข้อบ่งชี้ สำหรับพยาบาลและผู้ช่วยเหลือคนไข้ข้างเตียง
 *        ซึ่งต้องการรู้ว่าเตียงไหนควรทบทวนวันนี้ ไม่ใช่ตัวเลขกำกับคุณภาพของตัวเอง
 */
export type DashboardScope = 'FULL' | 'CARE';

export function dashboardScope(role: UserRole): DashboardScope {
  return role === 'NURSE' ? 'CARE' : 'FULL';
}

/**
 * บัญชีที่ต้องมีคุณวุฒิ RN หรือ NA ก่อนจึงจะประเมินได้
 *
 * ผู้ดูแลระบบไม่ใช่บุคลากรพยาบาล จึงไม่มีคุณวุฒิให้ผูกกับบัญชีและไม่ควรถูก
 * นับรวมในสถิติที่เทียบ RN กับ NA การประเมินของบัญชีนี้บันทึกโดยไม่มีคุณวุฒิ
 * แต่ยังทำได้ทันทีโดยไม่ต้องเลือกอะไรก่อน
 */
export function needsNurseLevel(role: UserRole): boolean {
  return role !== 'ADMIN';
}

/** แหล่งข้อมูลของการประเมิน — แยกข้อมูลผู้ประเมินออกจากพยาบาลเพื่อวิเคราะห์ */
export function sourceForRole(role: UserRole): 'NURSE' | 'AUDITOR' {
  return role === 'AUDITOR' ? 'AUDITOR' : 'NURSE';
}
