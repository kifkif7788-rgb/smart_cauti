import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getSession, canAlwaysSeeDashboard } from '@/lib/auth';
import { getActiveStudy, nurseCanSeeDashboard } from '@/lib/study';
import { db } from '@/lib/db';
import { foleyDay, currentShiftWindow, currentShift, SHIFT_LABEL_TH } from '@/lib/shift';
import { AppHeader } from '@/components/AppHeader';
import { BaselineBanner } from '@/components/BaselineBanner';
import { HomeNotices } from '@/components/HomeNotices';
import { OfflineQueueBadge } from '@/components/OfflineQueueBadge';

export default async function HomePage() {
  const session = await getSession();
  if (!session) redirect('/login');

  const study = await getActiveStudy();
  const wardCodes = session.wardCodes.length > 0 ? session.wardCodes : [study.ward_code];
  const source = session.role === 'AUDITOR' ? 'AUDITOR' : 'NURSE';

  const { data: episodes } = await db()
    .from('episode')
    .select('*')
    .eq('is_active', true)
    .in('ward_code', wardCodes)
    .order('bed_no', { ascending: true });

  const list = episodes ?? [];
  const { start, end } = currentShiftWindow();

  const { data: shiftAssessments } = list.length
    ? await db()
        .from('assessment')
        .select('episode_id')
        .eq('source', source)
        .gte('assessed_at', start.toISOString())
        .lt('assessed_at', end.toISOString())
        .in(
          'episode_id',
          list.map((e) => e.episode_id),
        )
    : { data: [] };

  const assessedIds = new Set((shiftAssessments ?? []).map((a) => a.episode_id));
  const pending = list.filter((e) => !assessedIds.has(e.episode_id));
  const showDashboard =
    canAlwaysSeeDashboard(session.role) || nurseCanSeeDashboard(study.current_mode);

  return (
    <>
      <AppHeader subtitle={`${session.fullName} · ${SHIFT_LABEL_TH[currentShift()]}`} />

      <main className="mx-auto max-w-2xl px-4 pb-16 pt-4">
        <HomeNotices />
        <OfflineQueueBadge />

        {study.current_mode === 'BASELINE' && (
          <div className="mb-4">
            <BaselineBanner />
          </div>
        )}

        {/* ── ปุ่มสแกนหลัก ──────────────────────────────────────── */}
        <Link
          href="/scan"
          className="flex w-full items-center justify-center gap-3 rounded-2xl px-5 py-6 text-white shadow-sm"
          style={{ background: 'var(--primary)' }}
        >
          <svg width="30" height="30" viewBox="0 0 30 30" fill="none" aria-hidden="true">
            <path
              d="M3 10V5a2 2 0 012-2h5M20 3h5a2 2 0 012 2v5M27 20v5a2 2 0 01-2 2h-5M10 27H5a2 2 0 01-2-2v-5"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
            />
            <path d="M3 15h24" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
          </svg>
          <span className="text-lg font-extrabold">สแกน QR ที่เตียงผู้ป่วย</span>
        </Link>

        {/* ── รายการค้างประเมิน ─────────────────────────────────── */}
        <section className="mt-6">
          <div className="mb-2 flex items-baseline justify-between">
            <h2 className="text-base font-extrabold">ค้างประเมินในเวรนี้</h2>
            <span className="text-sm font-bold tabular-nums" style={{ color: 'var(--muted)' }}>
              {pending.length} / {list.length} ราย
            </span>
          </div>

          {list.length === 0 ? (
            <p
              className="surface px-4 py-6 text-center text-sm"
              style={{ color: 'var(--muted)' }}
            >
              ยังไม่มีผู้ป่วยที่คาสายสวนในหอผู้ป่วยนี้
            </p>
          ) : pending.length === 0 ? (
            <p
              className="rounded-xl px-4 py-6 text-center text-sm font-semibold"
              style={{ background: 'var(--pass-bg)', color: 'var(--pass)' }}
            >
              ประเมินครบทุกรายในเวรนี้แล้ว
            </p>
          ) : (
            <ul className="space-y-2">
              {pending.map((episode) => {
                const day = foleyDay(episode.insert_date);
                return (
                  <li key={episode.episode_id}>
                    <Link
                      href={
                        episode.tag_code
                          ? `/assess/${episode.tag_code}`
                          : `/assess/by-episode/${episode.episode_id}`
                      }
                      className="surface flex items-center gap-3 px-4 py-3.5"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-bold">
                          เตียง {episode.bed_no}
                          <span className="ml-2 text-sm font-normal" style={{ color: 'var(--muted)' }}>
                            {episode.study_code}
                          </span>
                        </div>
                        <div className="text-[13px]" style={{ color: 'var(--muted)' }}>
                          คาสายวันที่ {day}
                        </div>
                      </div>
                      {day >= 3 && (
                        <span
                          className="shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold"
                          style={{ background: 'var(--correct-bg)', color: 'var(--correct)' }}
                        >
                          ทบทวน NEED
                        </span>
                      )}
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 20 20"
                        fill="none"
                        className="shrink-0"
                        aria-hidden="true"
                      >
                        <path
                          d="M7.5 5l5 5-5 5"
                          stroke="var(--muted)"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* ── ทางลัด ───────────────────────────────────────────── */}
        <nav className="mt-6 grid grid-cols-2 gap-3">
          {showDashboard && (
            <Link href="/dashboard" className="surface px-4 py-4 text-center">
              <div className="text-2xl" aria-hidden="true">📊</div>
              <div className="mt-1 text-sm font-bold">Dashboard</div>
            </Link>
          )}
          <Link href="/learn" className="surface px-4 py-4 text-center">
            <div className="text-2xl" aria-hidden="true">📚</div>
            <div className="mt-1 text-sm font-bold">สื่อการเรียนรู้</div>
          </Link>
        </nav>
      </main>
    </>
  );
}
