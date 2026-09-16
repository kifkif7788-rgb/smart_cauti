import type { NextRequest } from 'next/server';
import { db, writeAudit } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { canDiagnoseInfection } from '@/lib/auth-roles';
import {
  notInfectedReason,
  validateDiagnosis,
  type CatheterAtDoe,
  type DiagnosisInput,
  type DiagnosisOutcome,
  type InfectionOrigin,
  type SymptomEntry,
  type UcResult,
} from '@/lib/infection';

/**
 * บันทึกแบบวินิจฉัยการติดเชื้อ (ข้อ 7–9 และ 10.2)
 *
 * หนึ่ง episode มีผลสรุปได้ชุดเดียว การส่งซ้ำคือการแก้ไขของเดิม
 * ค่า HAI/CI ไม่รับจาก client แต่ให้ฐานข้อมูลคำนวณจากวันที่ เพื่อไม่ให้สรุปขัดกับข้อมูลดิบ
 */
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return Response.json({ error: 'กรุณาเข้าสู่ระบบ' }, { status: 401 });
  }
  if (!canDiagnoseInfection(session.role)) {
    return Response.json(
      { error: 'เฉพาะพยาบาล IC หัวหน้าหอผู้ป่วย หรือผู้ดูแลระบบเท่านั้นที่บันทึกได้' },
      { status: 403 },
    );
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return Response.json({ error: 'รูปแบบข้อมูลไม่ถูกต้อง' }, { status: 400 });
  }

  const {
    episodeId,
    admitDate,
    doeDate,
    admitDx,
    catheterAtDoe,
    ucResult,
    ucResultDate,
    organisms,
    organismOther,
    nonBacterialOrganism,
    symptoms,
  } = body as Record<string, unknown>;

  if (typeof episodeId !== 'string' || episodeId.length === 0) {
    return Response.json({ error: 'ไม่พบรายการผู้ป่วย' }, { status: 400 });
  }

  const input: DiagnosisInput = {
    admitDate: typeof admitDate === 'string' ? admitDate : '',
    doeDate: typeof doeDate === 'string' ? doeDate : '',
    admitDx: typeof admitDx === 'string' ? admitDx.trim() : null,
    catheterAtDoe: catheterAtDoe as CatheterAtDoe,
    ucResult: ucResult as UcResult,
    ucResultDate: typeof ucResultDate === 'string' && ucResultDate ? ucResultDate : null,
    organisms: Array.isArray(organisms) ? (organisms as string[]) : [],
    organismOther: typeof organismOther === 'string' ? organismOther.trim() : null,
    nonBacterialOrganism:
      typeof nonBacterialOrganism === 'string' ? nonBacterialOrganism.trim() : null,
    symptoms: Array.isArray(symptoms) ? (symptoms as SymptomEntry[]) : [],
  };

  if (input.admitDx && input.admitDx.length > 500) {
    return Response.json({ error: 'DX แรกรับยาวเกิน 500 อักขระ' }, { status: 400 });
  }

  const { data: episode } = await db()
    .from('episode')
    .select('episode_id, study_code, insert_date, remove_date')
    .eq('episode_id', episodeId)
    .maybeSingle();

  if (!episode) {
    return Response.json({ error: 'ไม่พบรายการผู้ป่วยนี้' }, { status: 404 });
  }

  // ข้อ 3, 5 และ 7 ของ 10.2.4 ใช้ได้เฉพาะเมื่อถอดสายแล้ว จึงต้องรู้สถานะจริงจากฐานข้อมูล
  const problem = validateDiagnosis(input, episode.remove_date !== null);
  if (problem) {
    return Response.json({ error: problem }, { status: 400 });
  }

  // วันใส่สายต้องไม่มาหลัง DOE มิฉะนั้นเกณฑ์ข้อ 10.2.1 จะอ้างอิงสายที่ยังไม่ได้ใส่
  if (input.doeDate < episode.insert_date) {
    return Response.json(
      { error: `วัน DOE ต้องไม่มาก่อนวันที่ใส่สายสวน (${episode.insert_date})` },
      { status: 400 },
    );
  }

  const { data: saved, error } = await db()
    .from('infection_diagnosis')
    .upsert(
      {
        episode_id: episodeId,
        admit_date: input.admitDate,
        doe_date: input.doeDate,
        admit_dx: input.admitDx || null,
        catheter_at_doe: input.catheterAtDoe,
        uc_result: input.ucResult,
        uc_result_date: input.ucResultDate,
        organisms: input.organisms,
        organism_other: input.organismOther,
        non_bacterial_organism: input.nonBacterialOrganism,
        diagnosed_by: session.userId,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'episode_id' },
    )
    .select('diagnosis_id, origin')
    .single();

  if (error || !saved) {
    console.error('[infection-diagnosis] บันทึกไม่สำเร็จ', error);
    return Response.json({ error: 'บันทึกไม่สำเร็จ กรุณาลองใหม่' }, { status: 500 });
  }

  // ชุดอาการบันทึกแบบแทนที่ทั้งชุด เพื่อให้การแก้ไขที่เอาอาการออกมีผลจริง
  await db().from('infection_symptom').delete().eq('diagnosis_id', saved.diagnosis_id);

  if (input.symptoms.length > 0) {
    const { error: symptomError } = await db()
      .from('infection_symptom')
      .insert(
        input.symptoms.map((s) => ({
          diagnosis_id: saved.diagnosis_id,
          code: s.code,
          onset_date: s.onsetDate,
          end_date: s.endDate,
        })),
      );

    if (symptomError) {
      console.error('[infection-diagnosis] บันทึกอาการไม่สำเร็จ', symptomError);
      return Response.json(
        { error: 'บันทึกอาการแสดงไม่สำเร็จ กรุณาลองใหม่' },
        { status: 500 },
      );
    }
  }

  // อาการมาได้สองทาง — ที่ IC กรอกในแบบนี้ และที่พยาบาลบันทึกตอนประเมินรายวัน
  // ต้องนับทั้งสองทาง ไม่งั้นรายที่พยาบาลพบไข้ไว้แล้วจะถูกสรุปว่าไม่ติดเชื้อ
  let hasSymptoms = input.symptoms.length > 0;
  if (!hasSymptoms) {
    const { data: assessments } = await db()
      .from('assessment')
      .select('assessment_id')
      .eq('episode_id', episodeId);

    if ((assessments ?? []).length > 0) {
      const { count: symptomCount } = await db()
        .from('infection_symptom')
        .select('symptom_id', { count: 'exact', head: true })
        .in(
          'assessment_id',
          (assessments ?? []).map((a) => a.assessment_id),
        );
      hasSymptoms = (symptomCount ?? 0) > 0;
    }
  }

  const reason = notInfectedReason(input.ucResult, hasSymptoms);
  const outcome: DiagnosisOutcome = reason
    ? 'NO_INFECTION'
    : (saved.origin as InfectionOrigin);

  await writeAudit({
    actorId: session.userId,
    action: 'INFECTION_DIAGNOSIS_SAVE',
    entity: 'infection_diagnosis',
    entityId: saved.diagnosis_id,
    detail: { studyCode: episode.study_code, origin: saved.origin, outcome },
  });

  return Response.json({ diagnosisId: saved.diagnosis_id, outcome, reason });
}
