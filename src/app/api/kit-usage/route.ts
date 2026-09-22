import type { NextRequest } from 'next/server';
import { db, writeAudit } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { getActiveStudy } from '@/lib/study';
import { isValidKitCode } from '@/lib/qr';
import { hasScanProof } from '@/lib/scan-proof';

/**
 * บันทึกว่าชุดอุปกรณ์ใส่สายถูกใช้ที่เตียงใด
 *
 * หนึ่งแถวคือการใส่สายหนึ่งครั้ง ใช้นับปริมาณการใส่สายของหอผู้ป่วย
 *
 * บันทึกได้ทุกเตียงรวมถึงเตียงที่คาสายอยู่ เพราะการเปลี่ยนสายก็ใช้ชุดอุปกรณ์
 * การบันทึกไม่เปิดสิทธิ์เข้าถึงข้อมูลผู้ป่วยของเตียงนั้น — ตารางนี้เก็บแค่เลขเตียง
 * ส่วนแบบประเมินยังต้องสแกนป้ายประจำเตียงเหมือนเดิม
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

  const { kitCode, bedNo, clientUuid } = (body ?? {}) as Record<string, unknown>;

  if (!isValidKitCode(kitCode)) {
    return Response.json({ error: 'รหัสป้ายชุดอุปกรณ์ไม่ถูกต้อง' }, { status: 400 });
  }
  // ต้องมาจากการสแกนป้ายจริง มิฉะนั้นตัวเลขที่นับได้จะไม่ใช่การใช้งานจริง
  if (!(await hasScanProof(kitCode))) {
    return Response.json(
      { error: 'ต้องสแกน QR บนชุดอุปกรณ์ก่อนบันทึก กรุณาสแกนอีกครั้ง' },
      { status: 403 },
    );
  }
  if (typeof clientUuid !== 'string' || clientUuid.length < 8) {
    return Response.json({ error: 'ไม่พบ clientUuid สำหรับกันบันทึกซ้ำ' }, { status: 400 });
  }
  if (typeof bedNo !== 'string' || bedNo.trim().length === 0) {
    return Response.json({ error: 'กรุณากรอกเลขเตียง' }, { status: 400 });
  }

  const study = await getActiveStudy();
  const wardCodes = session.wardCodes.length > 0 ? session.wardCodes : [study.ward_code];
  const bed = bedNo.trim();

  // เตียงต้องมีอยู่จริงในหอผู้ป่วย มิฉะนั้นพิมพ์ผิดแล้วนับเข้าเตียงที่ไม่มีตัวตน
  const { data: tag } = await db()
    .from('tag')
    .select('bed_no, ward_code')
    .in('ward_code', wardCodes)
    .eq('bed_no', bed)
    .eq('is_retired', false)
    .maybeSingle();

  if (!tag) {
    return Response.json(
      { error: `ไม่พบเตียง ${bed} ในหอผู้ป่วยนี้ กรุณาตรวจสอบเลขเตียงอีกครั้ง` },
      { status: 404 },
    );
  }

  const { error } = await db().from('kit_usage').insert({
    kit_code: kitCode,
    ward_code: tag.ward_code,
    bed_no: tag.bed_no,
    used_by: session.userId,
    client_uuid: clientUuid,
  });

  // ส่งซ้ำด้วย clientUuid เดิมถือว่าสำเร็จ ไม่ใช่ข้อผิดพลาด และไม่นับเพิ่ม
  if (error && error.code !== '23505') {
    console.error('[kit-usage] บันทึกไม่สำเร็จ', error);
    return Response.json({ error: 'บันทึกไม่สำเร็จ กรุณาลองใหม่' }, { status: 500 });
  }

  if (!error) {
    await writeAudit({
      actorId: session.userId,
      action: 'KIT_USED',
      entity: 'kit_usage',
      entityId: null,
      detail: { kitCode, bedNo: tag.bed_no },
    });
  }

  // มีผู้ป่วยคาสายอยู่แล้วหรือไม่ — ใช้ตัดสินว่าจะเสนอให้ลงทะเบียนผู้ป่วยต่อไหม
  const { data: episode } = await db()
    .from('episode')
    .select('episode_id')
    .eq('ward_code', tag.ward_code)
    .eq('bed_no', tag.bed_no)
    .eq('is_active', true)
    .maybeSingle();

  return Response.json({
    ok: true,
    bedNo: tag.bed_no,
    occupied: Boolean(episode),
    duplicate: Boolean(error),
  });
}
