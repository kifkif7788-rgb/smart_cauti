import type { NextRequest } from 'next/server';
import { db, writeAudit } from '@/lib/db';
import { getSession } from '@/lib/auth';

/**
 * ผู้ดูแลระบบปิดเรื่องที่แจ้งมา
 *
 * ปิดเรื่องพร้อมบันทึกว่าแก้อย่างไร เพื่อให้ผู้แจ้งเห็นคำตอบ ไม่ใช่แค่เห็นว่าปิดแล้ว
 */
export async function POST(
  request: NextRequest,
  ctx: RouteContext<'/api/support/[id]/resolve'>,
) {
  const session = await getSession();
  if (!session) {
    return Response.json({ error: 'กรุณาเข้าสู่ระบบ' }, { status: 401 });
  }
  if (session.role !== 'ADMIN') {
    return Response.json({ error: 'เฉพาะผู้ดูแลระบบเท่านั้น' }, { status: 403 });
  }

  const { id } = await ctx.params;

  let note: unknown = null;
  try {
    ({ note } = (await request.json()) as { note?: unknown });
  } catch {
    // ไม่บังคับให้ส่ง body — ปิดเรื่องโดยไม่เขียนหมายเหตุก็ได้
  }
  if (note != null && (typeof note !== 'string' || note.length > 500)) {
    return Response.json({ error: 'หมายเหตุต้องไม่เกิน 500 อักขระ' }, { status: 400 });
  }

  const { data: updated, error } = await db()
    .from('support_request')
    .update({
      status: 'RESOLVED',
      admin_note: typeof note === 'string' && note.trim() ? note.trim() : null,
      resolved_by: session.userId,
      resolved_at: new Date().toISOString(),
    })
    .eq('request_id', id)
    // ปิดซ้ำไม่ได้ เพื่อไม่ให้เวลาและผู้ปิดเดิมถูกเขียนทับ
    .eq('status', 'OPEN')
    .select('request_id')
    .maybeSingle();

  if (error) {
    console.error('[support] ปิดเรื่องไม่สำเร็จ', error);
    return Response.json({ error: 'ปิดเรื่องไม่สำเร็จ กรุณาลองใหม่' }, { status: 500 });
  }
  if (!updated) {
    return Response.json({ error: 'ไม่พบเรื่องนี้ หรือถูกปิดไปแล้ว' }, { status: 409 });
  }

  await writeAudit({
    actorId: session.userId,
    action: 'SUPPORT_RESOLVED',
    entity: 'support_request',
    entityId: id,
  });

  return Response.json({ ok: true });
}
