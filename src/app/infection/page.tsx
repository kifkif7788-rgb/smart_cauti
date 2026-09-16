import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getSession } from '@/lib/auth';
import { canDiagnoseInfection } from '@/lib/auth-roles';
import { getActiveStudy } from '@/lib/study';
import { db } from '@/lib/db';
import { maskHn } from '@/lib/hn';
import { foleyDay } from '@/lib/shift';
import { AppHeader } from '@/components/AppHeader';
import { ORIGIN_LABEL, type InfectionOrigin } from '@/lib/infection';

export default async function InfectionListPage() {
  const session = await getSession();
  if (!session) redirect('/login');
  if (!canDiagnoseInfection(session.role)) redirect('/');

  const study = await getActiveStudy();
  const wardCodes = session.wardCodes.length > 0 ? session.wardCodes : [study.ward_code];

  const { data: episodes } = await db()
    .from('episode')
    .select('episode_id, hn, study_code, bed_no, insert_date, is_active')
    .in('ward_code', wardCodes)
    .order('is_active', { ascending: false })
    .order('bed_no');

  const list = episodes ?? [];

  const { data: diagnoses } = list.length
    ? await db()
        .from('infection_diagnosis')
        .select('episode_id, origin')
        .in(
          'episode_id',
          list.map((e) => e.episode_id),
        )
    : { data: [] };

  const byEpisode = new Map(
    (diagnoses ?? []).map((d) => [d.episode_id, d.origin as InfectionOrigin]),
  );

  return (
    <>
      <AppHeader title="แบบวินิจฉัยการติดเชื้อ" backHref="/" />
      <main className="mx-auto max-w-2xl px-4 pb-16 pt-4">
        <p className="mb-3 text-[13px]" style={{ color: 'var(--muted)' }}>
          เลือกผู้ป่วยเพื่อบันทึกข้อ 7–9 และข้อ 10.2
        </p>

        {list.length === 0 ? (
          <p
            className="surface px-4 py-6 text-center text-sm"
            style={{ color: 'var(--muted)' }}
          >
            ยังไม่มีผู้ป่วยในหอผู้ป่วยนี้
          </p>
        ) : (
          <ul className="space-y-2">
            {list.map((episode) => {
              const origin = byEpisode.get(episode.episode_id);
              return (
                <li key={episode.episode_id}>
                  <Link
                    href={`/infection/${episode.episode_id}`}
                    className="surface flex items-center gap-3 px-4 py-3.5"
                  >
                    <div
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-lg font-extrabold tabular-nums"
                      style={{ background: 'var(--surface-2)', color: 'var(--primary)' }}
                      aria-label={`เตียง ${episode.bed_no}`}
                    >
                      {episode.bed_no}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-bold tabular-nums">
                        HN {maskHn(episode.hn)} · {episode.study_code}
                      </div>
                      <div className="text-[13px]" style={{ color: 'var(--muted)' }}>
                        {episode.is_active
                          ? `คาสายวันที่ ${foleyDay(episode.insert_date)}`
                          : 'ปิดรายการแล้ว'}
                      </div>
                    </div>
                    {origin && (
                      <span
                        className="shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold"
                        style={{
                          background:
                            origin === 'HAI' ? 'var(--review-bg)' : 'var(--pass-bg)',
                          color: origin === 'HAI' ? 'var(--review)' : 'var(--pass)',
                        }}
                        title={ORIGIN_LABEL[origin]}
                      >
                        {origin}
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </main>
    </>
  );
}
