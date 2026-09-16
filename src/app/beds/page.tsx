import { redirect } from 'next/navigation';
import { getSession, sourceForRole } from '@/lib/auth';
import { getActiveStudy } from '@/lib/study';
import { db } from '@/lib/db';
import { maskHn } from '@/lib/hn';
import { foleyDay, currentShiftWindow } from '@/lib/shift';
import { episodesWithSymptoms } from '@/lib/awaiting-diagnosis';
import { AppHeader } from '@/components/AppHeader';

type BedStatus = 'SYMPTOM' | 'PENDING' | 'DONE' | 'EMPTY';

const STATUS = {
  SYMPTOM: { label: 'มีอาการ', bg: 'var(--review-bg)', fg: 'var(--review)' },
  PENDING: { label: 'ค้างประเมิน', bg: 'var(--correct-bg)', fg: 'var(--correct)' },
  DONE: { label: 'ประเมินครบ', bg: 'var(--pass-bg)', fg: 'var(--pass)' },
  EMPTY: { label: 'เตียงว่าง', bg: 'var(--surface)', fg: 'var(--muted)' },
} as const;

export default async function BedsPage() {
  const session = await getSession();
  if (!session) redirect('/login');

  const study = await getActiveStudy();
  const wardCodes = session.wardCodes.length > 0 ? session.wardCodes : [study.ward_code];

  const [{ data: tags }, { data: episodes }] = await Promise.all([
    db().from('tag').select('bed_no').in('ward_code', wardCodes).eq('is_retired', false),
    db().from('episode').select('*').eq('is_active', true).in('ward_code', wardCodes),
  ]);

  const occupied = episodes ?? [];
  const byBed = new Map(occupied.map((e) => [e.bed_no, e]));
  const { start, end } = currentShiftWindow();

  const { data: shiftAssessments } = occupied.length
    ? await db()
        .from('assessment')
        .select('episode_id')
        .eq('source', sourceForRole(session.role))
        .gte('assessed_at', start.toISOString())
        .lt('assessed_at', end.toISOString())
        .in(
          'episode_id',
          occupied.map((e) => e.episode_id),
        )
    : { data: [] };

  const assessed = new Set((shiftAssessments ?? []).map((a) => a.episode_id));
  const symptomatic = await episodesWithSymptoms(occupied.map((e) => e.episode_id));

  const beds = (tags ?? [])
    .map((t) => t.bed_no)
    .sort((a, b) => Number(a) - Number(b))
    .map((bedNo) => {
      const episode = byBed.get(bedNo);
      // อาการแสดงสำคัญกว่าสถานะการประเมิน จึงมาก่อนเสมอ
      const status: BedStatus = !episode
        ? 'EMPTY'
        : symptomatic.has(episode.episode_id)
          ? 'SYMPTOM'
          : assessed.has(episode.episode_id)
            ? 'DONE'
            : 'PENDING';
      return { bedNo, episode, status };
    });

  const counts = beds.reduce<Record<BedStatus, number>>(
    (acc, b) => ({ ...acc, [b.status]: acc[b.status] + 1 }),
    { SYMPTOM: 0, PENDING: 0, DONE: 0, EMPTY: 0 },
  );

  return (
    <>
      <AppHeader title="เช็กทุกวัน" backHref="/" />
      <main className="mx-auto max-w-2xl px-4 pb-16 pt-4">
        <p className="text-[13px]" style={{ color: 'var(--muted)' }}>
          ผังเตียงทั้งหอ ดูได้อย่างเดียว — ต้องสแกน QR ที่ป้ายข้างเตียงจึงจะเริ่มประเมินได้
        </p>

        {/* ── คำอธิบายสี ──────────────────────────────────────── */}
        <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-2">
          {(Object.keys(STATUS) as BedStatus[]).map((key) => (
            <li key={key} className="flex items-center gap-2 text-[13px]">
              <span
                className="inline-block h-4 w-4 rounded border"
                style={{ background: STATUS[key].bg, borderColor: STATUS[key].fg }}
              />
              <span style={{ color: 'var(--muted)' }}>
                {STATUS[key].label} {counts[key]}
              </span>
            </li>
          ))}
        </ul>

        {beds.length === 0 ? (
          <p
            className="surface mt-4 px-4 py-6 text-center text-sm"
            style={{ color: 'var(--muted)' }}
          >
            ยังไม่มีป้ายเตียงในหอผู้ป่วยนี้
          </p>
        ) : (
          <ul className="mt-4 grid grid-cols-4 gap-2.5 sm:grid-cols-5">
            {beds.map(({ bedNo, episode, status }) => {
              const tone = STATUS[status];
              return (
                <li key={bedNo}>
                  <div
                    className="flex h-[74px] flex-col items-center justify-center rounded-xl border px-1"
                    style={{ background: tone.bg, borderColor: tone.fg }}
                    title={`เตียง ${bedNo} · ${tone.label}`}
                  >
                    <span
                      className="text-xl font-extrabold leading-none tabular-nums"
                      style={{ color: tone.fg }}
                    >
                      {bedNo}
                    </span>
                    <span
                      className="mt-1 max-w-full truncate text-[10.5px] font-semibold"
                      style={{ color: tone.fg }}
                    >
                      {episode ? `วันที่ ${foleyDay(episode.insert_date)}` : tone.label}
                    </span>
                    {episode && (
                      <span
                        className="max-w-full truncate text-[10px] tabular-nums"
                        style={{ color: 'var(--muted)' }}
                      >
                        {maskHn(episode.hn)}
                      </span>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </main>
    </>
  );
}
