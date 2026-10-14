import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { db } from '@/lib/db';
import { AppHeader } from '@/components/AppHeader';
import { UserList, type UserRow } from './UserList';

/**
 * รายชื่อบัญชีผู้ใช้ — เปิดให้ผู้ดูแลระบบเท่านั้น
 *
 * ไม่แสดง PIN เพราะระบบเก็บเฉพาะ scrypt hash ไม่ได้เก็บ PIN ดิบไว้ที่ใด
 * แม้แต่แอดมินหรือผู้ที่เข้าถึงฐานข้อมูลโดยตรงก็อ่าน PIN ของผู้ใช้ไม่ได้
 * ช่วยคนที่ลืม PIN ได้ด้วยการตั้งให้ใหม่เท่านั้น ซึ่งแสดงครั้งเดียวตอนตั้ง
 */
export default async function AdminUsersPage() {
  const session = await getSession();
  if (!session) redirect('/login');
  if (session.role !== 'ADMIN') redirect('/');

  const { data: users } = await db()
    .from('app_user')
    .select(
      'user_id, employee_id, full_name, role, ward_codes, nurse_level, is_active, pin_changed_at',
    )
    .order('employee_id');

  const list: UserRow[] = (users ?? []).map((u) => ({
    userId: u.user_id,
    employeeId: u.employee_id,
    fullName: u.full_name,
    role: u.role,
    wardCodes: u.ward_codes,
    nurseLevel: u.nurse_level,
    isActive: u.is_active,
    setOwnPin: u.pin_changed_at !== null,
  }));

  const active = list.filter((u) => u.isActive).length;
  const starterPin = list.filter((u) => !u.setOwnPin).length;

  return (
    <>
      <AppHeader title="บัญชีผู้ใช้" backHref="/" />
      <main className="mx-auto max-w-2xl px-4 pb-16 pt-4">
        <p className="text-[13px]" style={{ color: 'var(--muted)' }}>
          ทั้งหมด {list.length} บัญชี · ใช้งานอยู่ {active} บัญชี
        </p>
        <p className="mt-1 text-[12.5px] leading-relaxed" style={{ color: 'var(--muted)' }}>
          ระบบเก็บ PIN เป็นค่าที่เข้ารหัสแล้วเท่านั้น จึงดู PIN ของผู้ใช้ไม่ได้
          ไม่ว่าจะเป็นแอดมินหรือผู้ที่เข้าถึงฐานข้อมูลโดยตรง
          หากพนักงานลืม PIN ให้ตั้งใหม่ ระบบจะสุ่มให้และแสดงครั้งเดียว
        </p>

        {starterPin > 0 && (
          <p
            className="mt-3 rounded-lg px-3 py-2.5 text-[13px] leading-relaxed font-semibold"
            style={{ background: 'var(--correct-bg)', color: 'var(--correct)' }}
          >
            {starterPin} บัญชียังใช้ PIN ที่ระบบหรือแอดมินตั้งให้
            แนะนำให้เจ้าของบัญชีตั้ง PIN ของตัวเองที่เมนู "เปลี่ยน PIN" เพื่อให้ประวัติการบันทึก
            ชี้ตัวผู้ปฏิบัติได้จริง แต่ไม่ได้บังคับ ใช้งานได้ตามปกติ
          </p>
        )}

        {list.length === 0 ? (
          <p className="surface mt-4 px-4 py-6 text-center text-sm" style={{ color: 'var(--muted)' }}>
            ยังไม่มีบัญชีผู้ใช้ในระบบ
          </p>
        ) : (
          <UserList users={list} />
        )}
      </main>
    </>
  );
}
