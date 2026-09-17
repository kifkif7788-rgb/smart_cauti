import { NextResponse, type NextRequest } from 'next/server';
import { SESSION_COOKIE, readSessionToken } from '@/lib/auth';

/**
 * เส้นทางที่ยังเข้าได้ระหว่างที่ยังไม่ได้ตั้ง PIN ใหม่
 *
 * ต้องมีหน้าเปลี่ยน PIN กับ API ที่หน้านั้นเรียก มิฉะนั้นจะติดวนอยู่กับที่
 * และต้องมีทางออกจากระบบ เผื่อคนที่ลืม PIN เดิมต้องให้แอดมินตั้งให้ใหม่
 */
const ALLOWED_PREFIXES = [
  '/pin',
  '/login',
  '/api/auth/pin',
  '/api/auth/login',
  '/api/auth/logout',
];

/**
 * บังคับให้ตั้ง PIN ของตัวเองก่อนใช้งาน
 *
 * บัญชีที่สร้างเป็นชุดใช้ PIN ตั้งต้นร่วมกัน ถ้าปล่อยให้ใช้ต่อไปได้
 * audit log จะบอกได้แค่ว่าบัญชีไหนบันทึก ไม่ได้บอกว่าใครบันทึก
 *
 * เป็นการเปลี่ยนเส้นทางเชิงป้องกันเท่านั้น ด่านจริงอยู่ที่หน้าและ API แต่ละตัว
 * ซึ่งตรวจ session เองอยู่แล้ว ตามที่เอกสาร Next.js แนะนำเรื่อง proxy
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (ALLOWED_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return NextResponse.next();

  const session = await readSessionToken(token);
  if (!session?.mustChangePin) return NextResponse.next();

  return NextResponse.redirect(new URL('/pin', request.url));
}

export const config = {
  // ข้ามไฟล์สแตติกและรูปภาพ เพราะไม่ใช่หน้าที่ผู้ใช้เปิดดูและไม่มีอะไรให้กัน
  matcher: [
    '/((?!_next/static|_next/image|images/|favicon.ico|manifest.webmanifest|.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico)$).*)',
  ],
};
