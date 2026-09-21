import type { NextRequest } from 'next/server';
import { db, writeAudit } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { getActiveStudy } from '@/lib/study';
import { isSupportCategory, validateSupportMessage } from '@/lib/support';

/**
 * แจ้งปัญหาถึงผู้ดูแลระบบ
 *
 * เก็บลงตารางแทนการส่งออกช่องทางภายนอก เรื่องจึงไม่ตกหล่นเมื่อแอดมินไม่อยู่เวร
 * และตามได้ว่าเรื่องไหนแก้แล้ว
 */
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return Response.json({ error: 'กรุณาเข้าสู่ระบบก่อน' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'รูปแบบข้อมูลไม่ถูกต้อง' }, { status: 400 });
  }

  const { category, message, bedNo, pagePath } = (body ?? {}) as Record<string, unknown>;

  if (!isSupportCategory(category)) {
    return Response.json({ error: 'กรุณาเลือกประเภทของปัญหา' }, { status: 400 });
  }
  const problem = validateSupportMessage(message);
  if (problem) return Response.json({ error: problem }, { status: 400 });

  if (bedNo != null && (typeof bedNo !== 'string' || bedNo.length > 10)) {
    return Response.json({ error: 'เลขเตียงไม่ถูกต้อง' }, { status: 400 });
  }

  const study = await getActiveStudy();
  const wardCode = session.wardCodes[0] ?? study.ward_code;

  const { data: inserted, error } = await db()
    .from('support_request')
    .insert({
      reporter_id: session.userId,
      ward_code: wardCode,
      category,
      bed_no: typeof bedNo === 'string' && bedNo.trim() ? bedNo.trim() : null,
      message: (message as string).trim(),
      // เก็บเฉพาะ path ไม่เก็บ query string ซึ่งอาจมีลายเซ็นป้าย QR อยู่
      page_path:
        typeof pagePath === 'string' && pagePath.startsWith('/')
          ? pagePath.split('?')[0].slice(0, 200)
          : null,
    })
    .select('request_id')
    .single();

  if (error || !inserted) {
    console.error('[support] บันทึกเรื่องแจ้งไม่สำเร็จ', error);
    return Response.json({ error: 'ส่งเรื่องไม่สำเร็จ กรุณาลองใหม่' }, { status: 500 });
  }

  await writeAudit({
    actorId: session.userId,
    action: 'SUPPORT_REQUESTED',
    entity: 'support_request',
    entityId: inserted.request_id,
    detail: { category },
  });

  return Response.json({ ok: true, requestId: inserted.request_id });
}
