import { redirect, notFound } from 'next/navigation';
import { getSession, sourceForRole } from '@/lib/auth';
import { getActiveStudy } from '@/lib/study';
import { db } from '@/lib/db';
import { foleyDay, formatThaiDate, currentShiftWindow } from '@/lib/shift';
import { AppHeader } from '@/components/AppHeader';
import { Check5Form } from '@/components/Check5Form';

/**
 * ประเมินโดยอ้างอิง episode โดยตรง ไม่ผ่านป้าย QR
 *
 * ใช้เมื่อป้ายชำรุด หลุด หรือยังไม่ได้ติดใหม่ — ผู้ป่วยยังต้องได้รับการประเมิน
 * ตามกำหนด การบังคับให้สแกนป้ายอย่างเดียวจะทำให้ข้อมูลขาดหายในวันที่ป้ายมีปัญหา
 */
export default async function AssessByEpisodePage(
  props: PageProps<'/assess/by-episode/[episodeId]'>,
) {
  const session = await getSession();
  if (!session) redirect('/login');

  const { episodeId } = await props.params;

  const { data: episode } = await db()
    .from('episode')
    .select('*')
    .eq('episode_id', episodeId)
    .maybeSingle();

  if (!episode) notFound();
  if (!episode.is_active) redirect('/');

  const study = await getActiveStudy();
  const { start, end } = currentShiftWindow();

  const { count } = await db()
    .from('assessment')
    .select('assessment_id', { count: 'exact', head: true })
    .eq('episode_id', episode.episode_id)
    .eq('source', sourceForRole(session.role))
    .gte('assessed_at', start.toISOString())
    .lt('assessed_at', end.toISOString());

  return (
    <>
      <AppHeader
        title="CAUTI Bundle CHECK 5"
        backHref="/"
        subtitle={`เตียง ${episode.bed_no} · ไม่ผ่านป้าย QR`}
      />
      <Check5Form
        episode={{
          episodeId: episode.episode_id,
          studyCode: episode.study_code,
          bedNo: episode.bed_no,
          wardCode: episode.ward_code,
          insertDate: episode.insert_date,
          insertDateTh: formatThaiDate(episode.insert_date),
          foleyDay: foleyDay(episode.insert_date),
        }}
        studyMode={study.current_mode}
        assessedThisShift={(count ?? 0) > 0}
      />
    </>
  );
}
