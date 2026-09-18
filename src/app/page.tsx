import { ScanHero, CareNote } from '@/components/Brand';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getSession, canDiagnoseInfection, needsNurseLevel } from '@/lib/auth';
import { getActiveStudy } from '@/lib/study';
import { db } from '@/lib/db';
import { awaitingDiagnosisEpisodes } from '@/lib/awaiting-diagnosis';
import { resolveNurseLevel } from '@/lib/nurse-level-cookie';
import { foleyDay, currentShift, SHIFT_LABEL_TH } from '@/lib/shift';
import { maskHn } from '@/lib/hn';
import { AppHeader } from '@/components/AppHeader';
import { HomeNotices } from '@/components/HomeNotices';
import { OfflineQueueBadge } from '@/components/OfflineQueueBadge';

export default async function HomePage() {
  const session = await getSession();
  if (!session) redirect('/login');

  const study = await getActiveStudy();
  const wardCodes = session.wardCodes.length > 0 ? session.wardCodes : [study.ward_code];

  const { data: episodes } = await db()
    .from('episode')
    .select('*')
    .eq('is_active', true)
    .in('ward_code', wardCodes);

  // เรียงตามเลขเตียงแบบตัวเลข — Postgres เรียง text จะได้ 1, 10, 11, 2
  const list = (episodes ?? []).sort((a, b) => Number(a.bed_no) - Number(b.bed_no));
  const awaitingDiagnosis = await awaitingDiagnosisEpisodes(list.map((e) => e.episode_id));
  const awaitingList = list.filter((e) => awaitingDiagnosis.has(e.episode_id));
  const canDiagnose = canDiagnoseInfection(session.role);
  const nurseLevel = await resolveNurseLevel(session);

  return (
    <>
      <AppHeader subtitle={`${session.fullName} · ${SHIFT_LABEL_TH[currentShift()]}`} />

      <main className="home-page mx-auto max-w-2xl px-4 pb-16 pt-4">
        <HomeNotices />
        <OfflineQueueBadge />

        <ScanHero
          nurseLevel={nurseLevel}
          canChooseLevel={session.nurseLevel === null && needsNurseLevel(session.role)}
        />
        <CareNote />

        {/* ── รอวินิจฉัย ────────────────────────────────────────── */}
        {/* แยกจากรายการค้างประเมิน เพราะผู้ป่วยที่ประเมินไปแล้วจะหลุดจากรายการนั้น */}
        {awaitingList.length > 0 && (
          <section className="mt-6">
            <div className="mb-2 flex items-baseline justify-between">
              <h2 className="text-base font-extrabold">รอวินิจฉัยการติดเชื้อ</h2>
              <span className="text-sm font-bold tabular-nums" style={{ color: 'var(--muted)' }}>
                {awaitingList.length} ราย
              </span>
            </div>
            <p className="mb-2 text-[13px]" style={{ color: 'var(--muted)' }}>
              {canDiagnose
                ? 'พบอาการแสดงจากการประเมินรายวัน แตะเพื่อกรอกการวินิจฉัย'
                : 'พบอาการแสดงจากการประเมินรายวัน รอพยาบาลวิชาชีพหรือ IC สรุปการวินิจฉัย'}
            </p>
            <ul className="space-y-2">
              {awaitingList.map((episode) => {
                const row = (
                  <>
                    <div
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-lg font-extrabold tabular-nums"
                      style={{ background: 'var(--review-bg)', color: 'var(--review)' }}
                      aria-label={`เตียง ${episode.bed_no}`}
                    >
                      {episode.bed_no}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-bold tabular-nums">
                        HN {maskHn(episode.hn)}
                      </div>
                      <div className="text-[13px]" style={{ color: 'var(--muted)' }}>
                        คาสายวันที่ {foleyDay(episode.insert_date)}
                      </div>
                    </div>
                    <span
                      className="shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold"
                      style={{ background: 'var(--review-bg)', color: 'var(--review)' }}
                    >
                      รอวินิจฉัย
                    </span>
                  </>
                );
                return (
                  <li key={episode.episode_id}>
                    {canDiagnose ? (
                      <Link
                        href={`/infection/${episode.episode_id}`}
                        className="surface flex items-center gap-3 px-4 py-3.5"
                      >
                        {row}
                      </Link>
                    ) : (
                      <div className="surface flex items-center gap-3 px-4 py-3.5">{row}</div>
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
