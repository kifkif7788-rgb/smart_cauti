import { NextResponse, type NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { isValidTagCode, verifyTagSignature } from '@/lib/qr';
import { attachScanProof } from '@/lib/scan-proof';

/**
 * ปลายทางของ QR Code บนป้าย — /s/{tagCode}?k={hmac}
 *
 * เป็น route handler ไม่ใช่ page เพราะต้องออกตั๋วยืนยันการสแกนเป็น cookie
 * ซึ่ง server component ตั้ง cookie ระหว่าง render ไม่ได้
 *
 * แยกจาก /assess เพื่อให้ URL บนป้ายสั้นพอที่ QR จะอ่านง่ายในแสงน้อย
 */
export async function GET(request: NextRequest, ctx: RouteContext<'/s/[tagCode]'>) {
  const { tagCode } = await ctx.params;
  const signature = request.nextUrl.searchParams.get('k');
  const to = (path: string) => NextResponse.redirect(new URL(path, request.url));

  const session = await getSession();
  if (!session) {
    // เก็บปลายทางไว้ให้กลับมาหลัง login
    const target = `/s/${tagCode}${signature ? `?k=${signature}` : ''}`;
    return to(`/login?next=${encodeURIComponent(target)}`);
  }

  if (!isValidTagCode(tagCode) || !verifyTagSignature(tagCode, signature)) {
    return to('/tag-error?reason=signature');
  }

  const { data: tag } = await db()
    .from('tag')
    .select('tag_code, is_retired')
    .eq('tag_code', tagCode)
    .maybeSingle();

  if (!tag || tag.is_retired) {
    return to('/tag-error?reason=unknown');
  }

  const { data: episode } = await db()
    .from('episode')
    .select('episode_id')
    .eq('tag_code', tagCode)
    .eq('is_active', true)
    .maybeSingle();

  return attachScanProof(to(episode ? `/assess/${tagCode}` : `/bind/${tagCode}`), tagCode);
}
