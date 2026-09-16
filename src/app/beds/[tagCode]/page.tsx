import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { getSession, sourceForRole } from '@/lib/auth';
import { db } from '@/lib/db';
import { maskHn } from '@/lib/hn';
import { isValidTagCode } from '@/lib/qr';
import { foleyDay, formatThaiDate, currentShiftWindow } from '@/lib/shift';
import { SYMPTOM_BY_CODE, ORIGIN_LABEL, type InfectionOrigin } from '@/lib/infection';
import { AppHeader } from '@/components/AppHeader';

/**
 * รายละเอียดเตียงแบบอ่านอย่างเดียว
 *
 * ไม่ใช่หน้าประเมิน จึงไม่ต้องมีตั๋วสแกน และปิดบัง HN เหมือนรายการรวมอื่น
 * HN เต็มแสดงเฉพาะหน้าประเมินที่ต้องยืนยันตัวผู้ป่วยหลังสแกนป้ายแล้ว
 */
export default async function BedDetailPage(props: PageProps<'/beds/[tagCode]'>) {
  const session = await getSession();
  if (!session) redirect('/login');

  const { tagCode } = await props.params;
  if (!isValidTagCode(tagCode)) notFound();

  const { data: tag } = await db()
    .from('tag')
    .select('tag_code, bed_no, ward_code, is_retired')
    .eq('tag_code', tagCode)
    .maybeSingle();

  if (!tag || tag.is_retired) notFound();

  const { data: episode } = await db()
    .from('episode')
    .select('*')
    .eq('tag_code', tagCode)
    .eq('is_active', true)
    .maybeSingle();

  if (!episode) {
    return (
      <>
        <AppHeader title={`เตียง ${tag.bed_no}`} backHref="/beds" />
        <main className="mx-auto max-w-2xl px-4 pb-16 pt-4">
          <p className="surface px-4 py-8 text-center text-sm" style={{ color: 'var(--muted)' }}>
            เตียงนี้ยังว่าง
          </p>
          <p className="mt-3 text-center text-[13px]" style={{ color: 'var(--muted)' }}>
            สแกน QR ที่ป้ายข้างเตียงเพื่อลงทะเบียนผู้ป่วยรายใหม่
          </p>
          <BackLink />
        </main>
      </>
    );
  }

  const { start, end } = currentShiftWindow();
  const [{ count }, { data: assessments }, { data: diagnosis }] = await Promise.all([
    db()
      .from('assessment')
      .select('assessment_id', { count: 'exact', head: true })
      .eq('episode_id', episode.episode_id)
      .eq('source', sourceForRole(session.role))
      .gte('assessed_at', start.toISOString())
      .lt('assessed_at', end.toISOString()),
    db()
      .from('assessment')
      .select('assessment_id')
      .eq('episode_id', episode.episode_id),
    db()
      .from('infection_diagnosis')
      .select('origin')
      .eq('episode_id', episode.episode_id)
      .maybeSingle(),
  ]);

  const { data: symptoms } = (assessments ?? []).length
    ? await db()
        .from('infection_symptom')
        .select('code, onset_date, end_date')
        .in(
          'assessment_id',
          (assessments ?? []).map((a) => a.assessment_id),
        )
    : { data: [] };

  const assessedThisShift = (count ?? 0) > 0;
  const day = foleyDay(episode.insert_date);

  return (
    <>
      <AppHeader title={`เตียง ${tag.bed_no}`} backHref="/beds" />
      <main className="mx-auto max-w-2xl px-4 pb-16 pt-4">
        <section className="surface p-4">
          <Row label="HN" value={maskHn(episode.hn)} />
          <Row label="รหัสวิจัย" value={episode.study_code} />
          <Row label="วันที่ใส่สาย" value={formatThaiDate(episode.insert_date)} />
          <Row label="คาสายวันที่" value={String(day)} />
          <Row label="ป้ายเตียง" value={tag.tag_code} />
        </section>

        <div className="mt-3 grid gap-2">
          <Status
            ok={assessedThisShift}
            okText="ประเมินครบในเวรนี้แล้ว"
            pendingText="ยังไม่ได้ประเมินในเวรนี้"
          />
          {day >= 3 && (
            <Banner tone="correct">
              คาสายมา {day} วัน — ทบทวนความจำเป็นของการคาสายกับทีมผู้รักษา
            </Banner>
          )}
        </div>

        {(symptoms ?? []).length > 0 && (
          <section className="mt-4">
            <h2 className="mb-2 text-base font-extrabold">อาการแสดงที่บันทึกไว้</h2>
            <ul className="surface divide-y" style={{ borderColor: 'var(--rule)' }}>
              {(symptoms ?? []).map((s, i) => (
                <li key={`${s.code}-${i}`} className="px-4 py-3">
                  <div className="text-[14px] font-bold">
                    {SYMPTOM_BY_CODE.get(s.code)?.label ?? s.code}
                  </div>
                  <div className="mt-0.5 text-[12.5px]" style={{ color: 'var(--muted)' }}>
                    {s.onset_date}
                    {s.end_date ? ` ถึง ${s.end_date}` : ' — ยังไม่สิ้นสุด'}
                  </div>
                </li>
              ))}
            </ul>
            <div className="mt-2">
              {diagnosis ? (
                <Banner tone="review">
                  วินิจฉัยแล้ว — {ORIGIN_LABEL[diagnosis.origin as InfectionOrigin]}
                </Banner>
              ) : (
                <Banner tone="review">
                  รอวินิจฉัย — รอพยาบาลวิชาชีพหรือ IC สรุปการวินิจฉัย
                </Banner>
              )}
            </div>
          </section>
        )}

        <p className="mt-5 text-center text-[13px]" style={{ color: 'var(--muted)' }}>
          หน้านี้ดูได้อย่างเดียว — สแกน QR ที่ป้ายข้างเตียงเพื่อเริ่มประเมิน
        </p>
        <BackLink />
      </main>
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1.5">
      <span className="text-[13px]" style={{ color: 'var(--muted)' }}>
        {label}
      </span>
      <span className="text-[15px] font-bold tabular-nums">{value}</span>
    </div>
  );
}

function Status({
  ok,
  okText,
  pendingText,
}: {
  ok: boolean;
  okText: string;
  pendingText: string;
}) {
  return (
    <Banner tone={ok ? 'pass' : 'correct'}>{ok ? okText : pendingText}</Banner>
  );
}

function Banner({
  tone,
  children,
}: {
  tone: 'pass' | 'correct' | 'review';
  children: React.ReactNode;
}) {
  const bg = `var(--${tone}-bg)`;
  const fg = `var(--${tone})`;
  return (
    <div
      className="rounded-xl border-l-4 px-4 py-3 text-[13px] font-semibold leading-relaxed"
      style={{ background: bg, borderColor: fg, color: fg }}
    >
      {children}
    </div>
  );
}

function BackLink() {
  return (
    <Link
      href="/beds"
      className="mt-4 flex w-full items-center justify-center text-sm font-bold"
      style={{ color: 'var(--primary)' }}
    >
      กลับไปผังเตียง
    </Link>
  );
}
