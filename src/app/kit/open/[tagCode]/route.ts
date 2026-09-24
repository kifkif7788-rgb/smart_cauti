import { NextResponse, type NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { getActiveStudy } from '@/lib/study';
import { isValidKitCode, isValidTagCode } from '@/lib/qr';
import { attachScanProof, hasScanProof } from '@/lib/scan-proof';

/**
 * จากป้ายชุดอุปกรณ์ไปยังเตียงที่พยาบาลระบุ
 *
 * ปกติเตียงที่มีผู้ป่วยอยู่ต้องเข้าผ่านการสแกนป้ายประจำเตียงเท่านั้น
 * เส้นทางนี้เป็นข้อยกเว้นที่หน่วยงานกำหนด เพราะตอนใส่สายพยาบาลถือชุดอุปกรณ์
 * อยู่ข้างเตียงนั้นจริง การสแกนป้ายบนชุดจึงยืนยันได้ว่าอยู่หน้างาน
 * ต่างจากการพิมพ์รหัสเตียงเองซึ่งทำจากที่ไหนก็ได้
 *
 * ยังต้องผ่านสองด่าน — สแกนป้ายชุดอุปกรณ์มาจริง และเตียงต้องอยู่ในหอที่ดูแล
 * จากนั้นจึงออกตั๋วของเตียงนั้นให้แทนตั๋วของชุดอุปกรณ์
 */
export async function GET(request: NextRequest, ctx: RouteContext<'/kit/open/[tagCode]'>) {
  const { tagCode } = await ctx.params;
  const kitCode = request.nextUrl.searchParams.get('kit');
  const to = (path: string) => NextResponse.redirect(new URL(path, request.url));

  const session = await getSession();
  if (!session) return to('/login');

  if (!isValidTagCode(tagCode) || !isValidKitCode(kitCode) || !(await hasScanProof(kitCode))) {
    return to('/tag-error?reason=signature');
  }

  const study = await getActiveStudy();
  const wardCodes = session.wardCodes.length > 0 ? session.wardCodes : [study.ward_code];

  const { data: tag } = await db()
    .from('tag')
    .select('tag_code, ward_code')
    .eq('tag_code', tagCode)
    .in('ward_code', wardCodes)
    .eq('is_retired', false)
    .maybeSingle();

  if (!tag) return to('/tag-error?reason=unknown');

  const { data: episode } = await db()
    .from('episode')
    .select('episode_id')
    .eq('tag_code', tagCode)
    .eq('is_active', true)
    .maybeSingle();

  // ยังไม่มีผู้ป่วยในระบบก็ประเมินไม่ได้ ต้องลงทะเบียนก่อน
  // ตั๋วที่ออกให้ครอบคลุมถึงหน้าประเมินหลังลงทะเบียนเสร็จด้วย
  return attachScanProof(to(episode ? `/assess/${tagCode}` : `/bind/${tagCode}`), tagCode);
}
