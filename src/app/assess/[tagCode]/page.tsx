import { redirect, notFound } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { getActiveStudy } from '@/lib/study';
import { db } from '@/lib/db';
import { foleyDay, formatThaiDate, currentShiftWindow } from '@/lib/shift';
import { isValidTagCode } from '@/lib/qr';
import { AppHeader } from '@/components/AppHeader';
import { Check5Form } from '@/components/Check5Form';

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

  // ป้ายที่ยังไม่ผูกกับผู้ป่วย — พาไปหน้าผูกป้ายแทนการแสดงข้อผิดพลาด
  if (!episode) redirect(`/bind/${tagCode}`);

  const study = await getActiveStudy();
  const { start, end } = currentShiftWindow();

  const { count } = await db()
    .from('assessment')
    .select('assessment_id', { count: 'exact', head: true })
    .eq('episode_id', episode.episode_id)
    .eq('source', session.role === 'AUDITOR' ? 'AUDITOR' : 'NURSE')
    .gte('assessed_at', start.toISOString())
    .lt('assessed_at', end.toISOString());

  return (
    <>
      <AppHeader title="CAUTI Bundle CHECK 5" backHref="/" subtitle={`เตียง ${episode.bed_no}`} />
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
