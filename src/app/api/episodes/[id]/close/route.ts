import type { NextRequest } from 'next/server';
import { db, writeAudit } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { isValidRemovalReason } from '@/lib/hn';
import { bangkokDateString } from '@/lib/shift';

/**
 * ปิด episode — ถอดสายหรือจำหน่ายผู้ป่วย
 *
 * ต้องปิดให้ตรงวัน เพราะ catheter-days คำนวณจาก insert_date ถึง remove_date
 * ถ้าลืมปิด จำนวนวันคาสายจะสูงเกินจริงและทำให้ catheter utilization ผิดไป
 *
 * เมื่อปิดแล้วเตียงจะว่าง พร้อมรับผู้ป่วยรายใหม่ผ่าน QR ใบเดิม
 */
export async function POST(
  request: NextRequest,
  ctx: RouteContext<'/api/episodes/[id]/close'>,
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

  const { reason, removeDate } = body as { reason?: unknown; removeDate?: unknown };

  if (!isValidRemovalReason(reason)) {
    return Response.json({ error: 'กรุณาเลือกเหตุผลในการปิดรายการ' }, { status: 400 });
  }

  const today = bangkokDateString();
  const effectiveDate =
    typeof removeDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(removeDate)
      ? removeDate
      : today;

  if (effectiveDate > today) {
    return Response.json({ error: 'วันที่ถอดสายต้องไม่เป็นวันในอนาคต' }, { status: 400 });
  }

  const { data: episode } = await db()
    .from('episode')
    .select('*')
    .eq('episode_id', id)
    .maybeSingle();

  if (!episode) {
    return Response.json({ error: 'ไม่พบรายการนี้' }, { status: 404 });
  }
  if (!episode.is_active) {
    return Response.json({ error: 'รายการนี้ปิดไปแล้ว' }, { status: 409 });
  }
  if (effectiveDate < episode.insert_date) {
    return Response.json(
      { error: 'วันที่ถอดสายต้องไม่ก่อนวันที่ใส่สาย' },
      { status: 400 },
    );
  }

  const { error } = await db()
    .from('episode')
    .update({
      is_active: false,
      remove_date: effectiveDate,
      removal_reason: reason,
      closed_by: session.userId,
      tag_code: null, // ปลดป้ายให้เตียงว่าง พร้อมรับผู้ป่วยรายใหม่
    })
    .eq('episode_id', id)
    .eq('is_active', true);

  if (error) {
    console.error('[episodes/close] ปิดรายการไม่สำเร็จ', error);
    return Response.json({ error: 'ปิดรายการไม่สำเร็จ กรุณาลองใหม่' }, { status: 500 });
  }

  await writeAudit({
    actorId: session.userId,
    action: 'EPISODE_CLOSE',
    entity: 'episode',
    entityId: id,
    detail: { studyCode: episode.study_code, reason, removeDate: effectiveDate },
  });

  return Response.json({ ok: true, bedNo: episode.bed_no });
}
