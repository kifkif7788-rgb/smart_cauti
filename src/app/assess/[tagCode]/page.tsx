import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { getSession, sourceForRole, canDiagnoseInfection } from '@/lib/auth';
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
import { UiIcon } from '@/components/UiIcon';
import { Check5Form } from '@/components/Check5Form';
import { EpisodeActions } from '@/components/EpisodeActions';
import { InvalidTag } from '@/components/InvalidTag';
import { ScanRequired } from '@/components/ScanRequired';
import { hasScanProof } from '@/lib/scan-proof';
import { readNurseLevelCookie } from '@/lib/nurse-level-cookie';
import { NurseLevelSwitch } from '@/components/NurseLevelSwitch';

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

  // เตียงที่มีผู้ป่วยอยู่ต้องมาจากการสแกน QR เท่านั้น — กรอกรหัสเองหรือย้อนกลับมาทีหลังเข้าไม่ได้
  // ตรวจก่อน writeAudit เพื่อไม่ให้ความพยายามที่ถูกปฏิเสธถูกบันทึกเป็นการเปิดดูข้อมูลผู้ป่วย
  if (!(await hasScanProof(tagCode))) {
    return <ScanRequired bedNo={episode.bed_no} />;
  }

  // สแกนเข้ามาโดยไม่ผ่านหน้าแรกจะยังไม่มีคุณวุฒิผู้ประเมิน ต้องถามก่อนเปิดแบบประเมิน
  // ถามที่นี่ก่อน writeAudit เพราะยังไม่ได้เปิดดูข้อมูลผู้ป่วยจริง
  const nurseLevel = await readNurseLevelCookie();
  if (!nurseLevel) {
    return (
      <>
        <AppHeader title="ก่อนเริ่มประเมิน" backHref="/" subtitle={`เตียง ${episode.bed_no}`} />
        <main className="mx-auto max-w-2xl px-4 pb-16 pt-6">
          <div className="surface p-5">
            <p className="text-[14px] leading-relaxed" style={{ color: 'var(--muted)' }}>
              ระบุก่อนว่าผู้ประเมินเป็นใคร ระบบจะจำไว้ใช้กับทุกเตียงในเวรนี้
              และเปิดแบบประเมิน CHECK 8 ให้ทันที
            </p>
            <NurseLevelSwitch initial={null} />
          </div>
        </main>
      </>
    );
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

  // DOE ลงได้ครั้งเดียว ถ้าเคยลงแล้วต้องส่งไปล็อกช่องในฟอร์ม
  const { data: diagnosis } = await db()
    .from('infection_diagnosis')
    .select('doe_date')
    .eq('episode_id', episode.episode_id)
    .maybeSingle();

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
        title="CAUTI Bundle CHECK 8"
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
        today={bangkokDateString()}
        nurseLevel={nurseLevel}
        lockedDoeDate={diagnosis?.doe_date ?? null}
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
        {canDiagnoseInfection(session.role) && (
          <Link
            href={`/infection/${episode.episode_id}`}
            className="surface mt-3 flex items-center justify-center gap-2 px-4 py-3.5 text-sm font-bold"
          >
            <UiIcon name="shield" width={20} height={20} />
            แบบวินิจฉัยการติดเชื้อ
          </Link>
        )}
      </Check5Form>
    </>
  );
}
