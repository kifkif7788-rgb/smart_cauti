import 'server-only';
import { db } from './db';

/** ผู้ป่วยที่มีอาการแสดงบันทึกไว้จากการประเมินรายวัน */
export async function episodesWithSymptoms(episodeIds: string[]): Promise<Set<string>> {
  if (episodeIds.length === 0) return new Set();

  const { data: assessments } = await db()
    .from('assessment')
    .select('assessment_id, episode_id')
    .in('episode_id', episodeIds);

  const episodeOf = new Map((assessments ?? []).map((a) => [a.assessment_id, a.episode_id]));
  if (episodeOf.size === 0) return new Set();

  const { data: symptoms } = await db()
    .from('infection_symptom')
    .select('assessment_id')
    .in('assessment_id', [...episodeOf.keys()]);

  return new Set(
    (symptoms ?? [])
      .map((s) => (s.assessment_id ? episodeOf.get(s.assessment_id) : undefined))
      .filter((id): id is string => Boolean(id)),
  );
}

/**
 * ผู้ป่วยที่มีอาการแสดงบันทึกไว้แล้ว แต่ยังไม่มีการวินิจฉัยสรุป
 *
 * เกิดขึ้นเมื่อผู้ช่วยพยาบาลพบอาการตอนประเมินรายวัน ซึ่งบันทึกได้เฉพาะอาการ
 * รายการจะค้างสถานะนี้จนพยาบาลวิชาชีพหรือ IC กรอกการวินิจฉัย
 */
export async function awaitingDiagnosisEpisodes(
  episodeIds: string[],
): Promise<Set<string>> {
  const withSymptoms = await episodesWithSymptoms(episodeIds);
  if (withSymptoms.size === 0) return withSymptoms;

  const { data: diagnosed } = await db()
    .from('infection_diagnosis')
    .select('episode_id')
    .in('episode_id', [...withSymptoms]);

  for (const row of diagnosed ?? []) withSymptoms.delete(row.episode_id);
  return withSymptoms;
}
