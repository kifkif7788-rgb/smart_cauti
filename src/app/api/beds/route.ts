import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { getActiveStudy } from '@/lib/study';

/**
 * รายการเตียงทั้งหมดพร้อมสถานะว่าง/ไม่ว่าง
 * ใช้ในหน้าย้ายเตียง เพื่อให้พยาบาลเลือกได้เฉพาะเตียงที่ว่างจริง
 */
export async function GET() {
  const session = await getSession();
  if (!session) {
    return Response.json({ error: 'กรุณาเข้าสู่ระบบ' }, { status: 401 });
  }

  const study = await getActiveStudy();
  const wardCodes = session.wardCodes.length > 0 ? session.wardCodes : [study.ward_code];

  const { data: tags } = await db()
    .from('tag')
    .select('*')
    .in('ward_code', wardCodes)
    .eq('is_retired', false);

  const { data: active } = await db()
    .from('episode')
    .select('bed_no, ward_code')
    .in('ward_code', wardCodes)
    .eq('is_active', true);

  const occupied = new Set((active ?? []).map((e) => `${e.ward_code}/${e.bed_no}`));

  const beds = (tags ?? [])
    .map((tag) => ({
      bedNo: tag.bed_no,
      tagCode: tag.tag_code,
      wardCode: tag.ward_code,
      occupied: occupied.has(`${tag.ward_code}/${tag.bed_no}`),
    }))
    // เรียงตามเลขเตียงแบบตัวเลข ไม่ใช่ตามตัวอักษร (เตียง 2 ต้องมาก่อน 10)
    .sort((a, b) => Number(a.bedNo) - Number(b.bedNo));

  return Response.json({ beds });
}
