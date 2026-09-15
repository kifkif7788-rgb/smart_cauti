import { redirect, notFound } from 'next/navigation';
import { getSession, sourceForRole } from '@/lib/auth';
import { getActiveStudy } from '@/lib/study';
import { db, writeAudit } from '@/lib/db';
import {
  foleyDay,
  formatThaiDate,
  currentShiftWindow,
  bangkokDateString,
} from '@/lib/shift';
import { isValidTagCode } from '@/lib/qr';
import { AppHeader } from '@/components/AppHeader';
import { Check5Form } from '@/components/Check5Form';
import { EpisodeActions } from '@/components/EpisodeActions';
import { InvalidTag } from '@/components/InvalidTag';

export default async function AssessPage(props: PageProps<'/assess/[tagCode]'>) {
  const session = await getSession();
  if (!session) redirect('/login');

  const { tagCode } = await props.params;
  if (!isValidTagCode(tagCode)) notFound();

  const { data: episode } = await db()
    .from('episode')
    .select('*')
    .eq('tag_code', tagCode)
    .eq('is_active', true)
    .maybeSingle();

  if (!episode) {
    // ป้ายไม่มีอยู่จริง (เช่น พิมพ์รหัสผิดตอนกรอกเอง) — แจ้งทันทีแทนที่จะไปเจอ 404 ที่หน้า bind
    const { data: tag } = await db()
      .from('tag')
      .select('tag_code')
      .eq('tag_code', tagCode)
      .eq('is_retired', false)
      .maybeSingle();
    if (!tag) return <InvalidTag reason="ไม่พบรหัสป้ายนี้ในระบบ กรุณาตรวจสอบรหัสอีกครั้ง" />;

    // เตียงว่าง — พาไปหน้าลงทะเบียนผู้ป่วยแทนการแสดงข้อผิดพลาด
    redirect(`/bind/${tagCode}`);
  }

  // การเปิดดูข้อมูลผู้ป่วยต้องสืบย้อนได้ตามนโยบายข้อมูลส่วนบุคคล
  await writeAudit({
    actorId: session.userId,
    action: 'EPISODE_VIEW',
    entity: 'episode',
    entityId: episode.episode_id,
    detail: { studyCode: episode.study_code, bedNo: episode.bed_no },
  });

  const study = await getActiveStudy();
  const { start, end } = currentShiftWindow();

  const { count } = await db()
    .from('assessment')
    .select('assessment_id', { count: 'exact', head: true })
    .eq('episode_id', episode.episode_id)
    .eq('source', sourceForRole(session.role))
    .gte('assessed_at', start.toISOString())
    .lt('assessed_at', end.toISOString());

  // เตียงทั้งหมดในหอ พร้อมสถานะว่าง ใช้ในแผงย้ายเตียง
  const { data: tags } = await db()
    .from('tag')
    .select('bed_no')
    .eq('ward_code', episode.ward_code)
    .eq('is_retired', false);

  const { data: activeEpisodes } = await db()
    .from('episode')
    .select('bed_no')
    .eq('ward_code', episode.ward_code)
    .eq('is_active', true);

  const occupied = new Set((activeEpisodes ?? []).map((e) => e.bed_no));
  const beds = (tags ?? [])
    .map((t) => ({ bedNo: t.bed_no, occupied: occupied.has(t.bed_no) }))
    .sort((a, b) => Number(a.bedNo) - Number(b.bedNo));

  const day = foleyDay(episode.insert_date);

  return (
    <>
      <AppHeader
        title="CAUTI Bundle CHECK 5"
        backHref="/"
        subtitle={`เตียง ${episode.bed_no} · HN ${episode.hn}`}
      />
      <Check5Form
        episode={{
          episodeId: episode.episode_id,
          hn: episode.hn,
          studyCode: episode.study_code,
          bedNo: episode.bed_no,
          wardCode: episode.ward_code,
          insertDate: episode.insert_date,
          insertDateTh: formatThaiDate(episode.insert_date),
          foleyDay: day,
        }}
        studyMode={study.current_mode}
        assessedThisShift={(count ?? 0) > 0}
      >
        <EpisodeActions
          episodeId={episode.episode_id}
          bedNo={episode.bed_no}
          foleyDay={day}
          beds={beds}
          today={bangkokDateString()}
          insertDate={episode.insert_date}
        />
      </Check5Form>
    </>
  );
}
