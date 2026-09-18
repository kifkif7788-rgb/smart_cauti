import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { db } from '@/lib/db';
import { NURSE_LEVEL } from '@/lib/check5';
import { AppHeader } from '@/components/AppHeader';
import { ResetPinButton } from '@/components/ResetPinButton';
import type { NurseLevelDb, UserRoleDb } from '@/types/database';

const ROLE_LABEL: Record<UserRoleDb, string> = {
  NURSE: 'พยาบาล',
  AUDITOR: 'ผู้ประเมิน',
  WARD_HEAD: 'หัวหน้าหอผู้ป่วย',
  IC_NURSE: 'พยาบาล IC',
  ADMIN: 'ผู้ดูแลระบบ',
};

/**
 * รายชื่อบัญชีผู้ใช้ — เปิดให้ผู้ดูแลระบบเท่านั้น
 *
 * ไม่แสดง PIN เพราะระบบเก็บเฉพาะ scrypt hash ไม่ได้เก็บ PIN ดิบไว้ที่ใด
 * หน้านี้จึงใช้ตรวจว่ามีบัญชีครบและเปิดใช้งานอยู่หรือไม่ ไม่ใช่ใช้ดูรหัสผ่าน
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

  const list = users ?? [];
  const active = list.filter((u) => u.is_active).length;
  const starterPin = list.filter((u) => u.pin_changed_at === null).length;

  return (
    <>
      <AppHeader title="บัญชีผู้ใช้" backHref="/" />
      <main className="mx-auto max-w-2xl px-4 pb-16 pt-4">
        <p className="text-[13px]" style={{ color: 'var(--muted)' }}>
          ทั้งหมด {list.length} บัญชี · ใช้งานอยู่ {active} บัญชี
        </p>
        <p className="mt-1 text-[12.5px] leading-relaxed" style={{ color: 'var(--muted)' }}>
          ระบบเก็บ PIN เป็นค่าที่เข้ารหัสแล้วเท่านั้น หน้านี้จึงดู PIN เดิมไม่ได้
          หากพนักงานลืม PIN ให้กดตั้ง PIN ใหม่ ระบบจะสุ่ม PIN ให้และแสดงครั้งเดียว
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
          <p
            className="surface mt-4 px-4 py-6 text-center text-sm"
            style={{ color: 'var(--muted)' }}
          >
            ยังไม่มีบัญชีผู้ใช้ในระบบ
          </p>
        ) : (
          <ul className="mt-4 space-y-2">
            {list.map((user) => (
              <li key={user.user_id}>
                <div
                  className="surface px-4 py-3"
                  style={{ opacity: user.is_active ? 1 : 0.55 }}
                >
                  <div className="flex items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-bold">
                      {user.employee_id}
                      <span className="font-normal" style={{ color: 'var(--muted)' }}>
                        {' · '}
                        {user.full_name}
                      </span>
                    </div>
                    <div className="text-[12.5px]" style={{ color: 'var(--muted)' }}>
                      {ROLE_LABEL[user.role]}
                      {user.ward_codes.length > 0 && ` · ${user.ward_codes.join(', ')}`}
                      {!user.is_active && ' · ปิดใช้งาน'}
                    </div>
                  </div>
                  {user.nurse_level && (
                    <span
                      className="shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold"
                      style={{
                        background:
                          user.nurse_level === 'RN' ? 'var(--surface-2)' : 'var(--pass-bg)',
                        color: user.nurse_level === 'RN' ? 'var(--primary)' : 'var(--pass)',
                      }}
                      title={NURSE_LEVEL[user.nurse_level as NurseLevelDb]}
                    >
                      {user.nurse_level}
                    </span>
                  )}
                  </div>

                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 border-t pt-2" style={{ borderColor: 'var(--border)' }}>
                    <span
                      className="min-w-0 flex-1 text-[12px]"
                      style={{ color: user.pin_changed_at ? 'var(--muted)' : 'var(--correct)' }}
                    >
                      {user.pin_changed_at
                        ? 'ตั้ง PIN เองแล้ว'
                        : 'ยังใช้ PIN ที่ระบบตั้งให้'}
                    </span>
                    <ResetPinButton userId={user.user_id} employeeId={user.employee_id} />
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>
    </>
  );
}
