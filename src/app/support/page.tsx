import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { db } from '@/lib/db';
import { AppHeader } from '@/components/AppHeader';
import { SUPPORT_CATEGORY, SUPPORT_STATUS } from '@/lib/support';
import { formatThaiDate } from '@/lib/shift';
import { SupportForm } from './SupportForm';

/**
 * ติดต่อผู้ดูแลระบบ
 *
 * ใต้ฟอร์มแสดงเรื่องที่ผู้ใช้คนนี้เคยแจ้งไว้ เพื่อไม่ให้แจ้งซ้ำเรื่องเดิม
 * และได้เห็นคำตอบของแอดมินโดยไม่ต้องตามถาม
 */
export default async function SupportPage(props: PageProps<'/support'>) {
  const session = await getSession();
  if (!session) redirect('/login');

  const search = await props.searchParams;
  const from = typeof search.from === 'string' && search.from.startsWith('/') ? search.from : '/';

  const { data: mine } = await db()
    .from('support_request')
    .select('request_id, category, message, status, admin_note, created_at')
    .eq('reporter_id', session.userId)
    .order('created_at', { ascending: false })
    .limit(5);

  const history = mine ?? [];

  return (
    <>
      <AppHeader title="ติดต่อผู้ดูแลระบบ" backHref="/" subtitle={session.fullName} />
      <main className="mx-auto max-w-2xl px-4 pb-16 pt-4">
        <p className="mb-3 text-[13px] leading-relaxed" style={{ color: 'var(--muted)' }}>
          แจ้งปัญหาการใช้งานหรือขอความช่วยเหลือ ผู้ดูแลระบบจะเห็นเรื่องนี้ในรายการที่รอดำเนินการ
          กรณีเร่งด่วนที่กระทบผู้ป่วยโดยตรง ให้แจ้งหัวหน้าเวรตามสายงานปกติควบคู่ไปด้วย
        </p>

        <SupportForm pagePath={from} />

        {history.length > 0 && (
          <section className="mt-6">
            <h2 className="mb-2 text-base font-extrabold">เรื่องที่คุณเคยแจ้ง</h2>
            <ul className="space-y-2">
              {history.map((row) => {
                const open = row.status === 'OPEN';
                return (
                  <li key={row.request_id} className="surface px-4 py-3">
                    <div className="flex items-start gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="text-[13px] font-bold">
                          {SUPPORT_CATEGORY[row.category]}
                        </div>
                        <div className="text-[12px]" style={{ color: 'var(--muted)' }}>
                          {formatThaiDate(row.created_at.slice(0, 10))}
                        </div>
                      </div>
                      <span
                        className="shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold"
                        style={{
                          background: open ? 'var(--correct-bg)' : 'var(--pass-bg)',
                          color: open ? 'var(--correct)' : 'var(--pass)',
                        }}
                      >
                        {SUPPORT_STATUS[row.status]}
                      </span>
                    </div>
                    <p className="mt-2 text-[13px] leading-relaxed whitespace-pre-wrap">
                      {row.message}
                    </p>
                    {row.admin_note && (
                      <div
                        className="mt-2 rounded-lg border-l-4 px-3 py-2 text-[13px] leading-relaxed"
                        style={{ background: 'var(--surface-2)', borderColor: 'var(--pass)' }}
                      >
                        <strong>ผู้ดูแลระบบตอบ</strong>
                        <br />
                        {row.admin_note}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        )}
      </main>
    </>
  );
}
