import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { getActiveStudy } from '@/lib/study';
import { foleyDay, currentShiftWindow } from '@/lib/shift';

/**
 * รายการผู้ป่วยที่ยังคาสายในหอ พร้อมสถานะว่าประเมินในเวรนี้แล้วหรือยัง
 * ใช้บนหน้าแรกเป็น "รายการค้างประเมิน" เพื่อให้พยาบาลเห็นว่าเหลือเตียงไหน
 */
export async function GET() {
  const session = await getSession();
  if (!session) {
    return Response.json({ error: 'กรุณาเข้าสู่ระบบ' }, { status: 401 });
  }

  const study = await getActiveStudy();
  const wardCodes = session.wardCodes.length > 0 ? session.wardCodes : [study.ward_code];

  const { data: episodes, error } = await db()
    .from('episode')
    .select('*')
    .eq('is_active', true)
    .in('ward_code', wardCodes)
    .order('bed_no', { ascending: true });

  if (error) {
    console.error('[episodes/active] อ่านข้อมูลไม่สำเร็จ', error);
    return Response.json({ error: 'อ่านข้อมูลไม่สำเร็จ' }, { status: 500 });
  }

  const list = episodes ?? [];
  const source = session.role === 'AUDITOR' ? 'AUDITOR' : 'NURSE';
  const { start, end } = currentShiftWindow();

  // ดึงการประเมินของเวรนี้ทั้งหมดในครั้งเดียว แทนการ query ทีละ episode
  const { data: shiftAssessments } = await db()
    .from('assessment')
    .select('episode_id')
    .eq('source', source)
    .gte('assessed_at', start.toISOString())
    .lt('assessed_at', end.toISOString())
    .in(
      'episode_id',
      list.map((e) => e.episode_id),
    );

  const assessedIds = new Set((shiftAssessments ?? []).map((a) => a.episode_id));

  return Response.json({
    shiftStart: start.toISOString(),
    shiftEnd: end.toISOString(),
    episodes: list.map((e) => ({
      episodeId: e.episode_id,
      studyCode: e.study_code,
      tagCode: e.tag_code,
      bedNo: e.bed_no,
      wardCode: e.ward_code,
      insertDate: e.insert_date,
      foleyDay: foleyDay(e.insert_date),
      assessedThisShift: assessedIds.has(e.episode_id),
    })),
  });
}
