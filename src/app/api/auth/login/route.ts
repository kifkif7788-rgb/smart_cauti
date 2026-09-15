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

export async function POST(request: NextRequest) {
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
