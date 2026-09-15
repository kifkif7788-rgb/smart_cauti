import type { NextRequest } from 'next/server';
import { db, writeAudit } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { getActiveStudy, shouldRevealFeedback } from '@/lib/study';
import { evaluateCheck5, parseAnswers } from '@/lib/check5';
import { currentShift, foleyDay } from '@/lib/shift';
import { buildAssessmentResponseBody } from './response';
import type { StudyMode } from '@/types/database';

/** บันทึกโหมดโครงการตามจริง และส่งผล/คำแนะนำกลับให้ทุก role ในทุกโหมด */
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return Response.json({ error: 'กรุณาเข้าสู่ระบบ' }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return Response.json({ error: 'รูปแบบข้อมูลไม่ถูกต้อง' }, { status: 400 });
  }

  const episodeId = body.episodeId;
  const clientUuid = body.clientUuid;
  const notes = body.notes;

  if (typeof episodeId !== 'string' || episodeId.length === 0) {
    return Response.json({ error: 'ไม่พบรหัส episode' }, { status: 400 });
  }
  if (typeof clientUuid !== 'string' || clientUuid.length < 8) {
    return Response.json({ error: 'ไม่พบ clientUuid สำหรับกันบันทึกซ้ำ' }, { status: 400 });
  }
  if (notes != null && (typeof notes !== 'string' || notes.length > 500)) {
    return Response.json({ error: 'หมายเหตุต้องไม่เกิน 500 อักขระ' }, { status: 400 });
  }

  const answers = parseAnswers(body.answers);
  if (!answers) {
    return Response.json(
      { error: 'ต้องตอบให้ครบทั้ง 5 ข้อ (need, fix, flow, below, closed)' },
      { status: 400 },
    );
  }

  const study = await getActiveStudy();
  const reveal = shouldRevealFeedback(study.current_mode, session.role);

  // ── กันบันทึกซ้ำจาก offline sync ──────────────────────────────────
  // การ sync อาจส่งรายการเดิมซ้ำเมื่อสัญญาณขาดกลางคัน
  const { data: existing } = await db()
    .from('assessment')
    .select('assessment_id, assessed_at, need, fix, flow, below, closed')
    .eq('client_uuid', clientUuid)
    .maybeSingle();

  if (existing) {
    return buildResponse(
      existing.assessment_id,
      existing.assessed_at,
      study.current_mode,
      reveal,
      evaluateCheck5({
        need: existing.need,
        fix: existing.fix,
        flow: existing.flow,
        below: existing.below,
        closed: existing.closed,
      }),
      true,
    );
  }

  // ── ตรวจว่า episode ยังเปิดอยู่จริง ───────────────────────────────
  const { data: episode } = await db()
    .from('episode')
    .select('*')
    .eq('episode_id', episodeId)
    .maybeSingle();

  if (!episode) {
    return Response.json({ error: 'ไม่พบข้อมูลผู้ป่วยรายนี้' }, { status: 404 });
  }
  if (!episode.is_active) {
    return Response.json(
      { error: 'ผู้ป่วยรายนี้ถอดสายแล้ว ไม่ต้องประเมินต่อ' },
      { status: 409 },
    );
  }

  const result = evaluateCheck5(answers);
  const assessedAt = new Date();

  const { data: inserted, error } = await db()
    .from('assessment')
    .insert({
      client_uuid: clientUuid,
      episode_id: episodeId,
      assessor_id: session.userId,
      source: session.role === 'AUDITOR' ? 'AUDITOR' : 'NURSE',
      study_mode: study.current_mode,
      assessed_at: assessedAt.toISOString(),
      shift: currentShift(assessedAt),
      foley_day: foleyDay(episode.insert_date, assessedAt),
      need: answers.need,
      fix: answers.fix,
      flow: answers.flow,
      below: answers.below,
      closed: answers.closed,
      feedback: result.feedback,
      notes: typeof notes === 'string' && notes.trim() ? notes.trim() : null,
    })
    .select('assessment_id, assessed_at')
    .single();

  if (error || !inserted) {
    console.error('[assessments] บันทึกไม่สำเร็จ', error);
    return Response.json({ error: 'บันทึกไม่สำเร็จ กรุณาลองใหม่' }, { status: 500 });
  }

  await writeAudit({
    actorId: session.userId,
    action: 'ASSESSMENT_CREATE',
    entity: 'assessment',
    entityId: inserted.assessment_id,
    detail: { episodeId, studyMode: study.current_mode, feedback: result.feedback },
  });

  return buildResponse(
    inserted.assessment_id,
    inserted.assessed_at,
    study.current_mode,
    reveal,
    result,
    false,
  );
}

function buildResponse(
  assessmentId: string,
  assessedAt: string,
  studyMode: StudyMode,
  reveal: boolean,
  result: ReturnType<typeof evaluateCheck5>,
  duplicate: boolean,
) {
  return Response.json(
    buildAssessmentResponseBody({
      assessmentId,
      assessedAt,
      studyMode,
      reveal,
      result,
      duplicate,
    }),
    { status: duplicate ? 200 : 201 },
  );
}
