import type { NextRequest } from 'next/server';
import { db, writeAudit } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { getActiveStudy } from '@/lib/study';
import { isValidTagCode } from '@/lib/qr';
import { bangkokDateString } from '@/lib/shift';

/** เปิด episode ใหม่และผูกป้าย QR กับผู้ป่วย (ทำครั้งเดียวตอนติดป้าย) */
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

  const { tagCode, studyCode, bedNo, insertDate } = body as {
    tagCode?: unknown;
    studyCode?: unknown;
    bedNo?: unknown;
    insertDate?: unknown;
  };

  if (!isValidTagCode(tagCode)) {
    return Response.json({ error: 'รหัสป้ายไม่ถูกต้อง' }, { status: 400 });
  }
  if (typeof studyCode !== 'string' || studyCode.trim().length === 0) {
    return Response.json({ error: 'กรุณากรอก Study ID' }, { status: 400 });
  }
  if (typeof bedNo !== 'string' || bedNo.trim().length === 0) {
    return Response.json({ error: 'กรุณากรอกหมายเลขเตียง' }, { status: 400 });
  }
  if (typeof insertDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(insertDate)) {
    return Response.json({ error: 'วันที่ใส่สายไม่ถูกต้อง' }, { status: 400 });
  }
  if (insertDate > bangkokDateString()) {
    return Response.json({ error: 'วันที่ใส่สายต้องไม่เป็นวันในอนาคต' }, { status: 400 });
  }

  // กันไม่ให้มี Study ID ที่เป็นเลข HN หลุดเข้ามาโดยไม่ตั้งใจ
  if (/^\d{7,}$/.test(studyCode.trim())) {
    return Response.json(
      {
        error:
          'Study ID ไม่ควรเป็นตัวเลขล้วน 7 หลักขึ้นไป เพราะอาจเป็น HN — ' +
          'กรุณาใช้รหัสตามที่หน่วยงานกำหนด',
      },
      { status: 400 },
    );
  }

  const study = await getActiveStudy();

  const { data: tag } = await db()
    .from('tag')
    .select('*')
    .eq('tag_code', tagCode)
    .maybeSingle();

  if (!tag || tag.is_retired) {
    return Response.json({ error: 'ไม่พบป้ายนี้ในระบบ' }, { status: 404 });
  }

  // ป้ายหนึ่งใบผูกกับ episode ที่ active ได้เพียงรายการเดียว
  const { data: bound } = await db()
    .from('episode')
    .select('episode_id')
    .eq('tag_code', tagCode)
    .eq('is_active', true)
    .maybeSingle();

  if (bound) {
    return Response.json(
      { error: 'ป้ายนี้ผูกกับผู้ป่วยรายอื่นอยู่ กรุณาปิด episode เดิมก่อน' },
      { status: 409 },
    );
  }

  const { data: created, error } = await db()
    .from('episode')
    .insert({
      study_id: study.study_id,
      study_code: studyCode.trim(),
      tag_code: tagCode,
      ward_code: tag.ward_code,
      bed_no: bedNo.trim(),
      insert_date: insertDate,
      is_active: true,
      created_by: session.userId,
    })
    .select('episode_id')
    .single();

  if (error || !created) {
    console.error('[episodes] สร้าง episode ไม่สำเร็จ', error);
    return Response.json({ error: 'บันทึกไม่สำเร็จ กรุณาลองใหม่' }, { status: 500 });
  }

  await writeAudit({
    actorId: session.userId,
    action: 'EPISODE_CREATE',
    entity: 'episode',
    entityId: created.episode_id,
    detail: { tagCode, bedNo: bedNo.trim() },
  });

  return Response.json({ episodeId: created.episode_id }, { status: 201 });
}
