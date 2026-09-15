import type { NextRequest } from 'next/server';
import { db, writeAudit } from '@/lib/db';
import {
  createSessionToken,
  isValidPinFormat,
  setSessionCookie,
  verifyPin,
  type SessionUser,
} from '@/lib/auth';

/** ข้อความเดียวกันทั้งกรณีไม่พบผู้ใช้และ PIN ผิด เพื่อไม่บอกใบ้ว่ารหัสใดมีอยู่จริง */
const INVALID_MESSAGE = 'รหัสบุคลากรหรือ PIN ไม่ถูกต้อง';

async function login(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'รูปแบบข้อมูลไม่ถูกต้อง' }, { status: 400 });
  }

  const { employeeId, pin } = (body ?? {}) as Record<string, unknown>;

  if (typeof employeeId !== 'string' || employeeId.trim().length === 0) {
    return Response.json({ error: 'กรุณากรอกรหัสบุคลากร' }, { status: 400 });
  }
  if (!isValidPinFormat(pin)) {
    return Response.json({ error: 'PIN ต้องเป็นตัวเลข 6 หลัก' }, { status: 400 });
  }

  const missing = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'SESSION_SECRET']
    .filter((key) => !process.env[key]?.trim());
  if (process.env.SESSION_SECRET && process.env.SESSION_SECRET.length < 32) {
    missing.push('SESSION_SECRET (minimum 32 characters)');
  }
  if (missing.length > 0) {
    // Log variable names only, never their values or the submitted PIN.
    console.error('[login] Invalid server configuration:', missing.join(', '));
    return Response.json(
      { error: 'ระบบยังตั้งค่าการเข้าสู่ระบบไม่ครบ กรุณาติดต่อผู้ดูแลระบบ' },
      { status: 503 },
    );
  }

  const { data: user, error } = await db()
    .from('app_user')
    .select('*')
    .eq('employee_id', employeeId.trim())
    .eq('is_active', true)
    .maybeSingle();

  if (error) {
    console.error('[login] อ่านข้อมูลผู้ใช้ไม่สำเร็จ', error);
    return Response.json({ error: 'ระบบขัดข้อง กรุณาลองใหม่' }, { status: 500 });
  }

  if (!user || !(await verifyPin(pin, user.pin_hash))) {
    await writeAudit({
      actorId: null,
      action: 'LOGIN_FAILED',
      entity: 'app_user',
      entityId: employeeId.trim(),
    });
    return Response.json({ error: INVALID_MESSAGE }, { status: 401 });
  }

  const session: SessionUser = {
    userId: user.user_id,
    employeeId: user.employee_id,
    fullName: user.full_name,
    role: user.role,
    wardCodes: user.ward_codes,
  };

  await setSessionCookie(await createSessionToken(session));
  await writeAudit({
    actorId: user.user_id,
    action: 'LOGIN',
    entity: 'app_user',
    entityId: user.user_id,
  });

  return Response.json({ user: session });
}

/** Always return JSON so deployment failures have a usable error in the login UI. */
export async function POST(request: NextRequest) {
  try {
    return await login(request);
  } catch (error) {
    console.error('[login] Unexpected server failure:', error instanceof Error ? error.name : 'UnknownError');
    return Response.json(
      { error: 'ระบบเข้าสู่ระบบขัดข้อง กรุณาติดต่อผู้ดูแลเพื่อตรวจสอบการตั้งค่าเซิร์ฟเวอร์' },
      { status: 500 },
    );
  }
}
