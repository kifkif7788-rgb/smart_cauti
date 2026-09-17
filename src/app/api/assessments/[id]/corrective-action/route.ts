import type { NextRequest } from 'next/server';
import { db, writeAudit } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { CHECK5_KEYS, evaluateCheck5, type Check5Key } from '@/lib/check5';
import type { ActionStatusDb } from '@/types/database';

const VALID_STATUS: readonly ActionStatusDb[] = ['CORRECTED', 'ESCALATED', 'UNABLE'];

/**
 * บันทึกการแก้ไขความเสี่ยง — ใช้คำนวณ corrective action rate
 *
 * รับสถานะได้ 3 แบบ เพื่อให้ตัวเลขสะท้อนความจริง:
 *   CORRECTED — แก้ไขแล้ว ณ จุดดูแล
 *   ESCALATED — แจ้งทีม/แพทย์ (กรณี NEED หรือ CLOSED ไม่ผ่าน)
 *   UNABLE    — แก้ไขไม่ได้ในขณะนี้ ต้องระบุเหตุผล
 *
 * ถ้าไม่มีตัวเลือก UNABLE พยาบาลจะถูกบีบให้กด "แก้ไขแล้ว" ทั้งที่ยังไม่ได้แก้
 * ซึ่งทำให้ corrective action rate สูงเกินจริงและตีความผิด
 */
export async function POST(
  request: NextRequest,
  ctx: RouteContext<'/api/assessments/[id]/corrective-action'>,
) {
  const session = await getSession();
  if (!session) {
    return Response.json({ error: 'กรุณาเข้าสู่ระบบ' }, { status: 401 });
  }

  const { id } = await ctx.params;

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return Response.json({ error: 'รูปแบบข้อมูลไม่ถูกต้อง' }, { status: 400 });
  }

  const status = body.status as ActionStatusDb;
  if (!VALID_STATUS.includes(status)) {
    return Response.json({ error: 'สถานะการแก้ไขไม่ถูกต้อง' }, { status: 400 });
  }

  const unableReason = body.unableReason;
  if (status === 'UNABLE') {
    if (typeof unableReason !== 'string' || unableReason.trim().length === 0) {
      return Response.json(
        { error: 'กรุณาระบุเหตุผลที่ยังแก้ไขไม่ได้' },
        { status: 400 },
      );
    }
  }

  const rawItems = Array.isArray(body.itemsCorrected) ? body.itemsCorrected : [];
  const itemsCorrected = rawItems.filter((k): k is Check5Key =>
    CHECK5_KEYS.includes(k as Check5Key),
  );

  const { data: assessment } = await db()
    .from('assessment')
    .select('*')
    .eq('assessment_id', id)
    .maybeSingle();

  if (!assessment) {
    return Response.json({ error: 'ไม่พบการประเมินรายการนี้' }, { status: 404 });
  }

  // ยอมรับเฉพาะข้อที่ไม่ผ่านจริงในการประเมินครั้งนั้น
  const result = evaluateCheck5({
    need: assessment.need,
    fix: assessment.fix,
    flow: assessment.flow,
    below: assessment.below,
    closed: assessment.closed,
    hand: assessment.hand ?? undefined,
    flash: assessment.flash ?? undefined,
    drain: assessment.drain ?? undefined,
  });
  const failedKeys = new Set(result.failedItems.map((f) => f.key));
  const invalid = itemsCorrected.filter((k) => !failedKeys.has(k));

  if (invalid.length > 0) {
    return Response.json(
      { error: `ข้อ ${invalid.join(', ')} ผ่านเกณฑ์อยู่แล้ว ไม่ต้องบันทึกการแก้ไข` },
      { status: 400 },
    );
  }

  const { data: created, error } = await db()
    .from('corrective_action')
    .insert({
      assessment_id: id,
      items_corrected: itemsCorrected,
      status,
      unable_reason:
        status === 'UNABLE' && typeof unableReason === 'string'
          ? unableReason.trim()
          : null,
      performed_by: session.userId,
    })
    .select('action_id, performed_at')
    .single();

  if (error || !created) {
    console.error('[corrective-action] บันทึกไม่สำเร็จ', error);
    return Response.json({ error: 'บันทึกไม่สำเร็จ กรุณาลองใหม่' }, { status: 500 });
  }

  await writeAudit({
    actorId: session.userId,
    action: 'CORRECTIVE_ACTION',
    entity: 'assessment',
    entityId: id,
    detail: { status, itemsCorrected },
  });

  // เวลาระหว่างประเมินกับแก้ไข ใช้เป็นข้อมูลเสริม time-to-correction
  const minutesToCorrection = Math.round(
    (new Date(created.performed_at).getTime() -
      new Date(assessment.assessed_at).getTime()) /
      60000,
  );

  return Response.json(
    { actionId: created.action_id, status, minutesToCorrection },
    { status: 201 },
  );
}
