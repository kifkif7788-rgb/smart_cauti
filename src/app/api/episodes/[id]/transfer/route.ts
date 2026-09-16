import { NextResponse, type NextRequest } from 'next/server';
import { db, writeAudit } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { attachScanProof } from '@/lib/scan-proof';

/**
 * ย้ายเตียง
 *
 * ── เหตุผลที่ต้องเป็นการย้าย ไม่ใช่การเปิด episode ใหม่ ────────────
 * ผู้ป่วยที่ย้ายเตียงยังคาสายเส้นเดิมอยู่ ถ้าปิดรายการเก่าแล้วเปิดใหม่
 * จำนวนวันคาสายจะเริ่มนับหนึ่งใหม่ ทำให้ Foley Day ต่ำกว่าความจริง
 * ผู้ป่วยที่คาสายมา 6 วันจะแสดงเป็นวันที่ 1 และหลุดจากการเตือน
 * "ทบทวนข้อบ่งชี้เมื่อเกิน 3 วัน" ซึ่งเป็นกลไกหลักของโครงการ
 *
 * การย้ายจึงคง episode_id, study_code และ insert_date เดิมไว้ทั้งหมด
 * เปลี่ยนเฉพาะเตียงและป้าย และบันทึกประวัติไว้ใน bed_transfer
 * ────────────────────────────────────────────────────────────────────
 */
export async function POST(
  request: NextRequest,
  ctx: RouteContext<'/api/episodes/[id]/transfer'>,
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

  const { toBedNo, reason } = body as { toBedNo?: unknown; reason?: unknown };

  if (typeof toBedNo !== 'string' || toBedNo.trim().length === 0) {
    return Response.json({ error: 'กรุณาเลือกเตียงปลายทาง' }, { status: 400 });
  }
  const targetBed = toBedNo.trim();

  const { data: episode } = await db()
    .from('episode')
    .select('*')
    .eq('episode_id', id)
    .maybeSingle();

  if (!episode) {
    return Response.json({ error: 'ไม่พบรายการนี้' }, { status: 404 });
  }
  if (!episode.is_active) {
    return Response.json(
      { error: 'รายการนี้ปิดไปแล้ว ย้ายเตียงไม่ได้' },
      { status: 409 },
    );
  }
  if (episode.bed_no === targetBed) {
    return Response.json({ error: 'ผู้ป่วยอยู่ที่เตียงนี้อยู่แล้ว' }, { status: 400 });
  }

  // เตียงปลายทางต้องมีอยู่จริงในหอผู้ป่วยเดียวกัน
  const { data: targetTag } = await db()
    .from('tag')
    .select('*')
    .eq('ward_code', episode.ward_code)
    .eq('bed_no', targetBed)
    .maybeSingle();

  if (!targetTag || targetTag.is_retired) {
    return Response.json(
      { error: `ไม่พบเตียง ${targetBed} ในหอผู้ป่วยนี้` },
      { status: 404 },
    );
  }

  // เตียงปลายทางต้องว่าง
  const { data: occupied } = await db()
    .from('episode')
    .select('episode_id')
    .eq('ward_code', episode.ward_code)
    .eq('bed_no', targetBed)
    .eq('is_active', true)
    .maybeSingle();

  if (occupied) {
    return Response.json(
      { error: `เตียง ${targetBed} มีผู้ป่วยที่คาสายอยู่แล้ว` },
      { status: 409 },
    );
  }

  const fromBedNo = episode.bed_no;
  const fromTagCode = episode.tag_code;

  const { error } = await db()
    .from('episode')
    .update({
      bed_no: targetBed,
      tag_code: targetTag.tag_code,
      // insert_date, study_code และ episode_id คงเดิมโดยตั้งใจ
    })
    .eq('episode_id', id)
    .eq('is_active', true);

  if (error) {
    console.error('[episodes/transfer] ย้ายเตียงไม่สำเร็จ', error);
    return Response.json({ error: 'ย้ายเตียงไม่สำเร็จ กรุณาลองใหม่' }, { status: 500 });
  }

  await db().from('bed_transfer').insert({
    episode_id: id,
    from_bed_no: fromBedNo,
    to_bed_no: targetBed,
    from_tag_code: fromTagCode,
    to_tag_code: targetTag.tag_code,
    reason: typeof reason === 'string' && reason.trim() ? reason.trim() : null,
    moved_by: session.userId,
  });

  await writeAudit({
    actorId: session.userId,
    action: 'EPISODE_TRANSFER',
    entity: 'episode',
    entityId: id,
    detail: { studyCode: episode.study_code, fromBedNo, toBedNo: targetBed },
  });

  // ผู้ป่วยรายเดิมที่เพิ่งย้ายมา — ให้ตั๋วของเตียงใหม่เพื่อประเมินต่อได้ทันที
  return attachScanProof(
    NextResponse.json({
      ok: true,
      fromBedNo,
      toBedNo: targetBed,
      tagCode: targetTag.tag_code,
    }),
    targetTag.tag_code,
  );
}
