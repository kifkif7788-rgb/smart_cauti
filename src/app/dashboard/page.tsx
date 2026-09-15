import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getSession, canAlwaysSeeDashboard } from '@/lib/auth';
import { getActiveStudy, nurseCanSeeDashboard } from '@/lib/study';
import { db } from '@/lib/db';
import { foleyDay } from '@/lib/shift';
import { AppHeader } from '@/components/AppHeader';

/**
 * Dashboard — Phase 1 แสดงเฉพาะสถานะปัจจุบันของหอผู้ป่วย
 *
 * ส่วน compliance chart และการเปรียบเทียบ baseline/intervention
 * ยังไม่สร้างในรอบนี้ เพราะต้องมีข้อมูลสะสมก่อนจึงจะออกแบบการแสดงผลได้ถูก
 */
export default async function DashboardPage() {
  const session = await getSession();
  if (!session) redirect('/login');

  const study = await getActiveStudy();
  const allowed =
    canAlwaysSeeDashboard(session.role) || nurseCanSeeDashboard(study.current_mode);
  if (!allowed) redirect('/');

  const wardCodes = session.wardCodes.length > 0 ? session.wardCodes : [study.ward_code];

  const { data: episodes } = await db()
    .from('episode')
    .select('*')
    .eq('is_active', true)
    .in('ward_code', wardCodes);

  const list = episodes ?? [];
  const longStay = list.filter((e) => foleyDay(e.insert_date) > 3);

  return (
    <>
      <AppHeader title="Dashboard" backHref="/" subtitle={wardCodes.join(', ')} />
      <main className="mx-auto max-w-2xl px-4 pb-16 pt-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="surface px-4 py-5 text-center">
            <div className="text-[11px] font-bold tracking-wider" style={{ color: 'var(--muted)' }}>
              ผู้ป่วยที่มี FOLEY
            </div>
            <div className="mt-1 text-4xl font-extrabold tabular-nums">{list.length}</div>
            <div className="text-xs" style={{ color: 'var(--muted)' }}>ราย</div>
          </div>
          <div
            className="surface px-4 py-5 text-center"
            style={longStay.length > 0 ? { borderColor: 'var(--correct)', borderWidth: 2 } : undefined}
          >
            <div
              className="text-[11px] font-bold tracking-wider"
              style={{ color: longStay.length > 0 ? 'var(--correct)' : 'var(--muted)' }}
            >
              FOLEY &gt; 3 วัน
            </div>
            <div
              className="mt-1 text-4xl font-extrabold tabular-nums"
              style={{ color: longStay.length > 0 ? 'var(--correct)' : 'var(--text)' }}
            >
              {longStay.length}
            </div>
            <div className="text-xs" style={{ color: 'var(--muted)' }}>ราย</div>
          </div>
        </div>

        <div
          className="mt-4 rounded-xl border-l-4 px-4 py-3 text-[13px] leading-relaxed"
          style={{ background: 'var(--surface-2)', borderColor: 'var(--primary)' }}
        >
          <strong>ส่วน compliance อยู่ระหว่างพัฒนา</strong>
          {' — '}
          กราฟ Bundle Compliance รายข้อ และการเปรียบเทียบช่วง baseline กับ intervention
          จะเพิ่มในรอบถัดไป เมื่อมีข้อมูลสะสมพอที่จะออกแบบการแสดงผลได้เหมาะสม
        </div>

        {longStay.length > 0 && (
          <section className="mt-5">
            <h2 className="mb-2 text-base font-extrabold">ควรทบทวนข้อบ่งชี้</h2>
            <ul className="space-y-2">
              {longStay.map((e) => (
                <li key={e.episode_id} className="surface flex items-center gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="font-bold">
                      เตียง {e.bed_no}
                      <span className="ml-2 text-sm font-normal" style={{ color: 'var(--muted)' }}>
                        {e.study_code}
                      </span>
                    </div>
                  </div>
                  <span
                    className="shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold tabular-nums"
                    style={{ background: 'var(--correct-bg)', color: 'var(--correct)' }}
                  >
                    วันที่ {foleyDay(e.insert_date)}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        <Link href="/" className="surface mt-5 block px-4 py-4 text-center text-[15px] font-bold">
          กลับหน้าหลัก
        </Link>
      </main>
    </>
  );
}
