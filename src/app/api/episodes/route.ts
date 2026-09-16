import { NextResponse, type NextRequest } from 'next/server';
import { db, writeAudit } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { attachScanProof } from '@/lib/scan-proof';
import { getActiveStudy } from '@/lib/study';
import { isValidTagCode, bedNoFromTagCode } from '@/lib/qr';
import { isValidHn, normalizeHn } from '@/lib/hn';
import { bangkokDateString } from '@/lib/shift';

/**
 * เปิด episode ใหม่ที่เตียงหนึ่ง — ทำหลังสแกน QR ประจำเตียงที่ยังว่าง
 *
 * study_code ไม่ได้รับจาก client แต่ให้ฐานข้อมูลสร้างเองจาก sequence
 * เพื่อให้รหัสงานวิจัยเรียงต่อเนื่องและไม่ซ้ำ โดยที่ผู้ใช้ไม่ต้องจำกฎการตั้งรหัส
 */
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

  const { tagCode, hn, insertDate } = body as {
    tagCode?: unknown;
    hn?: unknown;
    insertDate?: unknown;
  };

  if (!isValidTagCode(tagCode)) {
    return Response.json({ error: 'รหัสเตียงไม่ถูกต้อง' }, { status: 400 });
  }
  if (!isValidHn(hn)) {
    return Response.json(
      { error: 'HN ต้องเป็นตัวอักษรหรือตัวเลข 4–15 หลัก' },
      { status: 400 },
    );
  }
  if (typeof insertDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(insertDate)) {
    return Response.json({ error: 'วันที่ใส่สายไม่ถูกต้อง' }, { status: 400 });
  }
  if (insertDate > bangkokDateString()) {
    return Response.json({ error: 'วันที่ใส่สายต้องไม่เป็นวันในอนาคต' }, { status: 400 });
  }

  const normalizedHn = normalizeHn(hn);
  const study = await getActiveStudy();

  const { data: tag } = await db()
    .from('tag')
    .select('*')
    .eq('tag_code', tagCode)
    .maybeSingle();

  if (!tag || tag.is_retired) {
    return Response.json({ error: 'ไม่พบป้ายเตียงนี้ในระบบ' }, { status: 404 });
  }

  // เตียงต้องว่าง — ถ้ายังมีผู้ป่วยรายเดิมอยู่ ต้องปิดรายเดิมก่อน
  const { data: occupied } = await db()
    .from('episode')
    .select('episode_id, hn')
    .eq('ward_code', tag.ward_code)
    .eq('bed_no', tag.bed_no)
    .eq('is_active', true)
    .maybeSingle();

  if (occupied) {
    return Response.json(
      {
        error:
          `เตียง ${tag.bed_no} ยังมีผู้ป่วยที่คาสายอยู่ ` +
          'กรุณาปิดรายการเดิม (ถอดสาย/จำหน่าย) ก่อนลงทะเบียนผู้ป่วยใหม่',
        occupiedEpisodeId: occupied.episode_id,
      },
      { status: 409 },
    );
  }

  // HN เดียวกันมี episode ที่ยัง active อยู่ที่เตียงอื่น — น่าจะเป็นการย้ายเตียง
  const { data: elsewhere } = await db()
    .from('episode')
    .select('episode_id, bed_no, tag_code')
    .eq('hn', normalizedHn)
    .eq('is_active', true)
    .maybeSingle();

  if (elsewhere) {
    return Response.json(
      {
        error:
          `HN นี้มีรายการคาสายอยู่ที่เตียง ${elsewhere.bed_no} แล้ว ` +
          'หากผู้ป่วยย้ายเตียง กรุณาใช้ปุ่มย้ายเตียงแทน เพื่อไม่ให้จำนวนวันคาสายเริ่มนับใหม่',
        existingEpisodeId: elsewhere.episode_id,
        existingBedNo: elsewhere.bed_no,
        existingTagCode: elsewhere.tag_code,
      },
      { status: 409 },
    );
  }

  const { data: created, error } = await db()
    .from('episode')
    .insert({
      study_id: study.study_id,
      hn: normalizedHn,
      tag_code: tagCode,
      ward_code: tag.ward_code,
      bed_no: tag.bed_no,
      insert_date: insertDate,
      is_active: true,
      created_by: session.userId,
    })
    .select('episode_id, study_code')
    .single();

  if (error || !created) {
    console.error('[episodes] สร้าง episode ไม่สำเร็จ', error);
    return Response.json({ error: 'บันทึกไม่สำเร็จ กรุณาลองใหม่' }, { status: 500 });
  }

  // audit log ไม่บันทึก HN เต็ม — บันทึกเพียง study_code ที่สืบย้อนได้
  await writeAudit({
    actorId: session.userId,
    action: 'EPISODE_CREATE',
    entity: 'episode',
    entityId: created.episode_id,
    detail: {
      studyCode: created.study_code,
      bedNo: tag.bed_no,
      tagCode,
      bedFromTag: bedNoFromTagCode(tagCode),
    },
  });

  // พยาบาลเพิ่งลงทะเบียนผู้ป่วยที่เตียงนี้อยู่ตรงหน้า — ให้ตั๋วต่อเพื่อประเมินได้เลยโดยไม่ต้องสแกนซ้ำ
  return attachScanProof(
    NextResponse.json(
      { episodeId: created.episode_id, studyCode: created.study_code },
      { status: 201 },
    ),
    tagCode,
  );
}
