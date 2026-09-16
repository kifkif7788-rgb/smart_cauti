import { redirect, notFound } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { canDiagnoseInfection } from '@/lib/auth-roles';
import { db, writeAudit } from '@/lib/db';
import { bangkokDateString } from '@/lib/shift';
import { AppHeader } from '@/components/AppHeader';
import {
  InfectionDiagnosisForm,
  type ExistingDiagnosis,
} from '@/components/InfectionDiagnosisForm';

export default async function InfectionDiagnosisPage(
  props: PageProps<'/infection/[episodeId]'>,
) {
  const session = await getSession();
  if (!session) redirect('/login');
  if (!canDiagnoseInfection(session.role)) redirect('/');

  const { episodeId } = await props.params;

  const { data: episode } = await db()
    .from('episode')
    .select('episode_id, hn, study_code, bed_no, insert_date, remove_date')
    .eq('episode_id', episodeId)
    .maybeSingle();

  if (!episode) notFound();

  const { data: existing } = await db()
    .from('infection_diagnosis')
    .select('diagnosis_id, admit_date, doe_date, admit_dx, catheter_at_doe, uc_result, organisms')
    .eq('episode_id', episodeId)
    .maybeSingle();

  const { data: symptomRows } = existing
    ? await db()
        .from('infection_symptom')
        .select('code, onset_date, end_date')
        .eq('diagnosis_id', existing.diagnosis_id)
    : { data: [] };

  await writeAudit({
    actorId: session.userId,
    action: 'EPISODE_VIEW',
    entity: 'episode',
    entityId: episode.episode_id,
    detail: { studyCode: episode.study_code, context: 'INFECTION_DIAGNOSIS' },
  });

  const diagnosis: ExistingDiagnosis | null = existing
    ? {
        admitDate: existing.admit_date,
        doeDate: existing.doe_date,
        admitDx: existing.admit_dx,
        catheterAtDoe: existing.catheter_at_doe,
        ucResult: existing.uc_result,
        organisms: existing.organisms ?? [],
        symptoms: (symptomRows ?? []).map((s) => ({
          code: s.code,
          onsetDate: s.onset_date,
          endDate: s.end_date,
        })),
      }
    : null;

  return (
    <>
      <AppHeader
        title="แบบวินิจฉัยการติดเชื้อ"
        backHref="/infection"
        subtitle={`เตียง ${episode.bed_no} · HN ${episode.hn} · ${episode.study_code}`}
      />
      <InfectionDiagnosisForm
        episodeId={episode.episode_id}
        insertDate={episode.insert_date}
        today={bangkokDateString()}
        catheterRemoved={episode.remove_date !== null}
        existing={diagnosis}
      />
    </>
  );
}
