import { NextResponse, type NextRequest } from 'next/server';
import { getSession } from '@/lib/auth';
import { isValidKitCode, verifyTagSignature } from '@/lib/qr';
import { attachScanProof } from '@/lib/scan-proof';

/**
 * ปลายทางของ QR บนชุดอุปกรณ์ใส่สาย — /k/{kitCode}?k={hmac}
 *
 * ต่างจากป้ายประจำเตียงตรงที่ไม่รู้ว่าเป็นเตียงไหน จึงพาไปหน้าเลือกเตียงแทน
 * การพาไปหน้าเลือกเตียงไม่ได้เปิดทางเข้าแบบประเมินของเตียงที่มีผู้ป่วยอยู่
 * เพราะหน้านั้นให้เลือกได้เฉพาะเตียงว่าง ดู src/app/kit/page.tsx
 */
export async function GET(request: NextRequest, ctx: RouteContext<'/k/[kitCode]'>) {
  const { kitCode } = await ctx.params;
  const signature = request.nextUrl.searchParams.get('k');
  const to = (path: string) => NextResponse.redirect(new URL(path, request.url));

  const session = await getSession();
  if (!session) {
    const target = `/k/${kitCode}${signature ? `?k=${signature}` : ''}`;
    return to(`/login?next=${encodeURIComponent(target)}`);
  }

  if (!isValidKitCode(kitCode) || !verifyTagSignature(kitCode, signature)) {
    return to('/tag-error?reason=signature');
  }

  return attachScanProof(to(`/kit?code=${encodeURIComponent(kitCode)}`), kitCode);
}
