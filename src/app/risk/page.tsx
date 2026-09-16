import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { getActiveStudy } from '@/lib/study';
import { db } from '@/lib/db';
import { maskHn } from '@/lib/hn';
import { foleyDay } from '@/lib/shift';
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

