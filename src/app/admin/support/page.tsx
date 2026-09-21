import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { db } from '@/lib/db';
import { AppHeader } from '@/components/AppHeader';
import { ResolveSupportButton } from '@/components/ResolveSupportButton';
import { SUPPORT_CATEGORY } from '@/lib/support';

/**
 * เรื่องที่ผู้ใช้แจ้งมา — เปิดให้ผู้ดูแลระบบเท่านั้น
 *
 * เรียงเรื่องที่ยังไม่ได้แก้ขึ้นก่อนเสมอ เพราะสิ่งที่แอดมินต้องทำคือเคลียร์คิวนั้น
 * ไม่ใช่ไล่อ่านประวัติทั้งหมด
 */
export default async function AdminSupportPage() {
  const session = await getSession();
  if (!session) redirect('/login');
  if (session.role !== 'ADMIN') redirect('/');

  const { data: requests } = await db()
    .from('support_request')
    .select('*')
    .order('status')
    .order('created_at', { ascending: false })
    .limit(200);

  const list = requests ?? [];
  const open = list.filter((r) => r.status === 'OPEN');

  // ดึงชื่อผู้แจ้งมาแสดง เพราะรหัสบัญชีอย่างเดียวตามตัวคนไม่ได้
  // รวมผู้ที่ปิดเรื่องด้วย มิฉะนั้นบรรทัด "ปิดเรื่องโดย" จะหาชื่อไม่เจอ
  const ids = [
    ...new Set(list.flatMap((r) => [r.reporter_id, r.resolved_by]).filter((id) => id !== null)),
  ];
  const { data: users } = ids.length
    ? await db().from('app_user').select('user_id, employee_id, full_name').in('user_id', ids)
    : { data: [] };
  const byId = new Map((users ?? []).map((u) => [u.user_id, u]));

  const when = (iso: string) =>
    new Intl.DateTimeFormat('th-TH', {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: 'Asia/Bangkok',
    }).format(new Date(iso));

  return (
    <>
      <AppHeader title="เรื่องที่แจ้งเข้ามา" backHref="/" />
      <main className="mx-auto max-w-2xl px-4 pb-16 pt-4">
        <p className="text-[13px]" style={{ color: 'var(--muted)' }}>
          รอดำเนินการ {open.length} เรื่อง · ทั้งหมด {list.length} เรื่อง
        </p>

        {list.length === 0 ? (
          <p className="surface mt-4 px-4 py-6 text-center text-sm" style={{ color: 'var(--muted)' }}>
            ยังไม่มีใครแจ้งเรื่องเข้ามา
          </p>
        ) : (
          <ul className="mt-4 space-y-2">
            {list.map((row) => {
              const isOpen = row.status === 'OPEN';
              const reporter = byId.get(row.reporter_id);
              return (
                <li
                  key={row.request_id}
                  className="surface px-4 py-3"
                  style={{ opacity: isOpen ? 1 : 0.7 }}
                >
                  <div className="flex items-start gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="text-[14px] font-bold">
                        {SUPPORT_CATEGORY[row.category]}
                        {row.bed_no && (
                          <span className="ml-2 font-normal" style={{ color: 'var(--muted)' }}>
                            เตียง {row.bed_no}
                          </span>
                        )}
                      </div>
                      <div className="text-[12px]" style={{ color: 'var(--muted)' }}>
                        {reporter ? `${reporter.employee_id} · ${reporter.full_name}` : 'ไม่ทราบผู้แจ้ง'}
                        {' · '}
                        {when(row.created_at)}
                        {row.page_path && ` · จากหน้า ${row.page_path}`}
                      </div>
                    </div>
                    <span
                      className="shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold"
                      style={{
                        background: isOpen ? 'var(--correct-bg)' : 'var(--pass-bg)',
                        color: isOpen ? 'var(--correct)' : 'var(--pass)',
                      }}
                    >
                      {isOpen ? 'รอดำเนินการ' : 'แก้ไขแล้ว'}
                    </span>
                  </div>

                  <p className="mt-2 text-[14px] leading-relaxed whitespace-pre-wrap">
                    {row.message}
                  </p>

                  {row.admin_note && (
                    <div
                      className="mt-2 rounded-lg border-l-4 px-3 py-2 text-[13px] leading-relaxed"
                      style={{ background: 'var(--surface-2)', borderColor: 'var(--pass)' }}
                    >
                      <strong>คำตอบที่ส่งให้ผู้แจ้ง</strong>
                      <br />
                      {row.admin_note}
                    </div>
                  )}

                  {isOpen ? (
                    <ResolveSupportButton requestId={row.request_id} />
                  ) : (
                    row.resolved_at && (
                      <p className="mt-2 text-[12px]" style={{ color: 'var(--muted)' }}>
                        ปิดเรื่องเมื่อ {when(row.resolved_at)}
                        {byId.get(row.resolved_by ?? '')?.employee_id
                          ? ` โดย ${byId.get(row.resolved_by ?? '')?.employee_id}`
                          : ''}
                      </p>
                    )
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </main>
    </>
  );
}
