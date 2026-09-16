import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getSession, sourceForRole } from '@/lib/auth';
import { getActiveStudy } from '@/lib/study';
import { db } from '@/lib/db';
import { maskHn } from '@/lib/hn';
import { foleyDay, currentShiftWindow } from '@/lib/shift';
import { episodesWithSymptoms } from '@/lib/awaiting-diagnosis';
import { AppHeader } from '@/components/AppHeader';

type BedStatus = 'PASS' | 'ATTENTION' | 'SYMPTOM' | 'PENDING' | 'EMPTY';

const STATUS = {
  PASS: { label: 'ผ่านทุกข้อ', bg: 'var(--pass-bg)', fg: 'var(--pass)' },
  ATTENTION: { label: 'มีข้อไม่ผ่าน', bg: 'var(--correct-bg)', fg: 'var(--correct)' },
  SYMPTOM: { label: 'มีอาการ', bg: 'var(--review-bg)', fg: 'var(--review)' },
  PENDING: { label: 'ค้างประเมิน', bg: 'var(--surface-2)', fg: 'var(--primary)' },
  EMPTY: { label: 'เตียงว่าง', bg: 'var(--surface)', fg: 'var(--muted)' },
} as const;

export default async function BedsPage() {
  const session = await getSession();
  if (!session) redirect('/login');

  const study = await getActiveStudy();
  const wardCodes = session.wardCodes.length > 0 ? session.wardCodes : [study.ward_code];

  const [{ data: tags }, { data: episodes }] = await Promise.all([
    db()
      .from('tag')
      .select('tag_code, bed_no')
      .in('ward_code', wardCodes)
      .eq('is_retired', false),
    db().from('episode').select('*').eq('is_active', true).in('ward_code', wardCodes),
  ]);

  const occupied = episodes ?? [];
  const byBed = new Map(occupied.map((e) => [e.bed_no, e]));
  const { start, end } = currentShiftWindow();

  const { data: shiftAssessments } = occupied.length
    ? await db()
        .from('assessment')
        .select('episode_id, all_pass, assessed_at')
        .eq('source', sourceForRole(session.role))
        .gte('assessed_at', start.toISOString())
        .lt('assessed_at', end.toISOString())
        .in(
          'episode_id',
          occupied.map((e) => e.episode_id),
        )
        .order('assessed_at', { ascending: false })
    : { data: [] };

  // ประเมินซ้ำในเวรเดียวกันได้ ใช้ครั้งล่าสุดเป็นตัวตัดสินสถานะ
  const latest = new Map<string, boolean>();
  for (const row of shiftAssessments ?? []) {
    if (!latest.has(row.episode_id)) latest.set(row.episode_id, row.all_pass);
  }
  const symptomatic = await episodesWithSymptoms(occupied.map((e) => e.episode_id));

  const beds = (tags ?? [])
    .slice()
    .sort((a, b) => Number(a.bed_no) - Number(b.bed_no))
    .map(({ tag_code: tagCode, bed_no: bedNo }) => {
      const episode = byBed.get(bedNo);
      // อาการแสดงสำคัญกว่าสถานะการประเมิน จึงมาก่อนเสมอ
      const allPass = episode ? latest.get(episode.episode_id) : undefined;
      const status: BedStatus = !episode
        ? 'EMPTY'
        : symptomatic.has(episode.episode_id)
          ? 'SYMPTOM'
          : allPass === undefined
            ? 'PENDING'
            : allPass
              ? 'PASS'
              : 'ATTENTION';
      return { tagCode, bedNo, episode, status };
    });

  const counts = beds.reduce<Record<BedStatus, number>>(
    (acc, b) => ({ ...acc, [b.status]: acc[b.status] + 1 }),
    { PASS: 0, ATTENTION: 0, SYMPTOM: 0, PENDING: 0, EMPTY: 0 },
  );

  return (
    <>
      <AppHeader title="เช็กทุกวัน" backHref="/" />
      <main className="mx-auto max-w-2xl px-4 pb-16 pt-4">
        <p className="text-[13px]" style={{ color: 'var(--muted)' }}>
          แตะที่เตียงเพื่อดูรายละเอียด — การประเมินยังต้องสแกน QR ที่ป้ายข้างเตียง
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
            {beds.map(({ tagCode, bedNo, episode, status }) => {
              const tone = STATUS[status];
              return (
                <li key={bedNo}>
                  <Link
                    href={`/beds/${tagCode}`}
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
