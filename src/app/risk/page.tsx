import { redirect } from 'next/navigation';
import { getSession, sourceForRole } from '@/lib/auth';
import { getActiveStudy } from '@/lib/study';
import { db } from '@/lib/db';
import { maskHn } from '@/lib/hn';
import { foleyDay, todayShiftWindows, SHIFT_LABEL_TH } from '@/lib/shift';
import { AppHeader } from '@/components/AppHeader';
import {
  awaitingDiagnosisEpisodes,
  episodesWithSymptoms,
} from '@/lib/awaiting-diagnosis';
import type { EpisodeRow } from '@/types/database';

/** จำนวนวันคาสายที่ต้องเริ่มทบทวนความจำเป็น ตรงกับป้ายเตือนในหน้าแรก */
const LONG_STAY_DAYS = 3;

export default async function RiskPage() {
  const session = await getSession();
  if (!session) redirect('/login');

  const study = await getActiveStudy();
  const wardCodes = session.wardCodes.length > 0 ? session.wardCodes : [study.ward_code];

  const { data: episodes } = await db()
    .from('episode')
    .select('*')
    .eq('is_active', true)
    .in('ward_code', wardCodes);

  const list = (episodes ?? []).sort((a, b) => Number(a.bed_no) - Number(b.bed_no));
  const ids = list.map((e) => e.episode_id);

  const [withSymptoms, awaiting] = await Promise.all([
    episodesWithSymptoms(ids),
    awaitingDiagnosisEpisodes(ids),
  ]);

  const symptomatic = list.filter((e) => withSymptoms.has(e.episode_id));
  const longStay = list.filter((e) => foleyDay(e.insert_date) >= LONG_STAY_DAYS);

  // ── ค้างประเมินแยกรายเวรของวันนี้ ────────────────────────────────
  const shifts = todayShiftWindows();
  const dayStart = shifts[0].start;
  const dayEnd = shifts[shifts.length - 1].end;

  const { data: todayAssessments } = ids.length
    ? await db()
        .from('assessment')
        .select('episode_id, assessed_at')
        .eq('source', sourceForRole(session.role))
        .gte('assessed_at', dayStart.toISOString())
        .lt('assessed_at', dayEnd.toISOString())
        .in('episode_id', ids)
    : { data: [] };

  const now = new Date();
  const shiftRows = shifts.map(({ shift, start, end }) => {
    const done = new Set(
      (todayAssessments ?? [])
        .filter((a) => {
          const at = new Date(a.assessed_at);
          return at >= start && at < end;
        })
        .map((a) => a.episode_id),
    );
    // เตียงที่รับผู้ป่วยหลังเวรนั้นจบไปแล้ว ไม่นับว่าค้างของเวรนั้น
    const due = list.filter((e) => new Date(e.created_at) < end);
    return {
      shift,
      start,
      end,
      state: now >= end ? ('PAST' as const) : now >= start ? ('NOW' as const) : ('FUTURE' as const),
      done: due.filter((e) => done.has(e.episode_id)).length,
      total: due.length,
      missing: due.filter((e) => !done.has(e.episode_id)),
    };
  });

  return (
    <>
      <AppHeader title="ติดตามความเสี่ยง" backHref="/" />
      <main className="mx-auto max-w-2xl px-4 pb-16 pt-4">
        <p className="mb-4 text-[13px]" style={{ color: 'var(--muted)' }}>
          รายการนี้ดูได้อย่างเดียว — ต้องสแกน QR ที่ป้ายข้างเตียงจึงจะเริ่มประเมินได้
        </p>

        <RiskSection
          title="ผู้ป่วยที่มีอาการแสดงการติดเชื้อ"
          empty="ยังไม่มีผู้ป่วยที่บันทึกอาการแสดงไว้"
          episodes={symptomatic}
          tone="review"
          badge={(e) => (awaiting.has(e.episode_id) ? 'รอวินิจฉัย' : 'มีอาการ')}
        />

        <RiskSection
          title={`ผู้ป่วยคาสายตั้งแต่ ${LONG_STAY_DAYS} วันขึ้นไป`}
          empty={`ยังไม่มีผู้ป่วยที่คาสายถึง ${LONG_STAY_DAYS} วัน`}
          episodes={longStay}
          tone="correct"
          badge={() => 'ทบทวน NEED'}
          note="ทบทวนความจำเป็นของการคาสายกับทีมผู้รักษา ยิ่งคาสายนานยิ่งเสี่ยงต่อ CAUTI"
        />

        {/* ── ค้างประเมินรายเวรวันนี้ ─────────────────────────── */}
        <section className="mb-6">
          <h2 className="mb-2 text-base font-extrabold">ค้างประเมินแต่ละเวรวันนี้</h2>
          <ul className="space-y-2">
            {shiftRows.map((row) => {
              const late = row.state === 'PAST' && row.missing.length > 0;
              const tone = late ? 'var(--review)' : 'var(--muted)';
              return (
                <li key={row.shift} className="surface px-4 py-3">
                  <div className="flex items-baseline justify-between gap-2">
                    <div className="font-bold">
                      {SHIFT_LABEL_TH[row.shift]}{' '}
                      <span className="text-[12.5px] font-normal" style={{ color: 'var(--muted)' }}>
                        {hhmm(row.start)}–{hhmm(row.end)}
                      </span>
                    </div>
                    <span
                      className="shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold"
                      style={{
                        background:
                          row.state === 'NOW' ? 'var(--surface-2)' : 'transparent',
                        color: row.state === 'NOW' ? 'var(--primary)' : 'var(--muted)',
                      }}
                    >
                      {row.state === 'NOW'
                        ? 'เวรปัจจุบัน'
                        : row.state === 'PAST'
                          ? 'ผ่านไปแล้ว'
                          : 'ยังไม่ถึงเวร'}
                    </span>
                  </div>

                  {row.state === 'FUTURE' ? (
                    <p className="mt-1 text-[13px]" style={{ color: 'var(--muted)' }}>
                      ผู้ป่วยที่ต้องประเมิน {row.total} ราย
                    </p>
                  ) : (
                    <>
                      <p className="mt-1 text-[13px] font-semibold" style={{ color: tone }}>
                        ประเมินแล้ว {row.done}/{row.total} ราย
                        {row.missing.length > 0 && ` · ค้าง ${row.missing.length} ราย`}
                        {late && ' (ไม่ได้ประเมินในเวรนั้น)'}
                      </p>
                      {row.missing.length > 0 && (
                        <p className="mt-0.5 text-[12.5px]" style={{ color: 'var(--muted)' }}>
                          เตียง {row.missing.map((e) => e.bed_no).join(', ')}
                        </p>
                      )}
                    </>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      </main>
    </>
  );
}

function RiskSection({
  title,
  empty,
  note,
  episodes,
  tone,
  badge,
}: {
  title: string;
  empty: string;
  note?: string;
  episodes: EpisodeRow[];
  tone: 'review' | 'correct';
  badge: (episode: EpisodeRow) => string;
}) {
  const bg = tone === 'review' ? 'var(--review-bg)' : 'var(--correct-bg)';
  const fg = tone === 'review' ? 'var(--review)' : 'var(--correct)';

  return (
    <section className="mb-6">
      <div className="mb-2 flex items-baseline justify-between">
        <h2 className="text-base font-extrabold">{title}</h2>
        <span className="text-sm font-bold tabular-nums" style={{ color: 'var(--muted)' }}>
          {episodes.length} ราย
        </span>
      </div>
      {note && (
        <p className="mb-2 text-[13px]" style={{ color: 'var(--muted)' }}>
          {note}
        </p>
      )}

      {episodes.length === 0 ? (
        <p
          className="surface px-4 py-6 text-center text-sm"
          style={{ color: 'var(--muted)' }}
        >
          {empty}
        </p>
      ) : (
        <ul className="space-y-2">
          {episodes.map((episode) => (
            <li key={episode.episode_id}>
              <div className="surface flex items-center gap-3 px-4 py-3.5">
                <div
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-lg font-extrabold tabular-nums"
                  style={{ background: bg, color: fg }}
                  aria-label={`เตียง ${episode.bed_no}`}
                >
                  {episode.bed_no}
                </div>
                <div className="min-w-0 flex-1">
                  {/* ปิดบัง HN เหมือนรายการรวมอื่น — แสดงเต็มเฉพาะหน้าประเมิน */}
                  <div className="truncate font-bold tabular-nums">
                    HN {maskHn(episode.hn)}
                  </div>
                  <div className="text-[13px]" style={{ color: 'var(--muted)' }}>
                    คาสายวันที่ {foleyDay(episode.insert_date)}
                  </div>
                </div>
                <span
                  className="shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold"
                  style={{ background: bg, color: fg }}
                >
                  {badge(episode)}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}


/** เวลาแบบ HH:MM ตามเขตเวลาไทย */
function hhmm(at: Date): string {
  return at.toLocaleTimeString('th-TH', {
    timeZone: 'Asia/Bangkok',
    hour: '2-digit',
    minute: '2-digit',
  });
}
