import type { NextRequest } from 'next/server';
import { db, writeAudit } from '@/lib/db';
import {
  getSession,
  hashPin,
  isValidPinFormat,
  isWeakPin,
  verifyPin,
} from '@/lib/auth';

/**
 * เปลี่ยน PIN ของบัญชีตัวเอง
 *
 * ต้องกรอก PIN ปัจจุบันด้วยเสมอ แม้จะ login อยู่แล้ว เพราะเครื่องในหอผู้ป่วย
 * ใช้ร่วมกันหลายคน ถ้าใครลุกไปโดยไม่ออกจากระบบ คนถัดไปจะเปลี่ยน PIN ทับได้
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

  const { currentPin, newPin } = (body ?? {}) as Record<string, unknown>;

  if (!isValidPinFormat(currentPin) || !isValidPinFormat(newPin)) {
    return Response.json({ error: 'PIN ต้องเป็นตัวเลข 6 หลัก' }, { status: 400 });
  }
  if (newPin === currentPin) {
    return Response.json({ error: 'PIN ใหม่ต้องไม่ซ้ำกับ PIN เดิม' }, { status: 400 });
  }
  if (isWeakPin(newPin)) {
    return Response.json(
      { error: 'PIN นี้เดาง่ายเกินไป หลีกเลี่ยงเลขซ้ำ เลขเรียง และชุดที่ใช้กันทั่วไป' },
      { status: 400 },
    );
  }

  const { data: user, error } = await db()
    .from('app_user')
    .select('user_id, pin_hash, is_active')
    .eq('user_id', session.userId)
    .maybeSingle();

  if (error) {
    console.error('[pin] อ่านข้อมูลผู้ใช้ไม่สำเร็จ', error);
    return Response.json({ error: 'ระบบขัดข้อง กรุณาลองใหม่' }, { status: 500 });
  }
  if (!user || !user.is_active) {
    return Response.json({ error: 'บัญชีนี้ใช้งานไม่ได้แล้ว' }, { status: 403 });
  }

  if (!(await verifyPin(currentPin, user.pin_hash))) {
    await writeAudit({
      actorId: session.userId,
      action: 'PIN_CHANGE_FAILED',
      entity: 'app_user',
      entityId: session.userId,
    });
    return Response.json({ error: 'PIN ปัจจุบันไม่ถูกต้อง' }, { status: 401 });
  }

  const { error: updateError } = await db()
    .from('app_user')
    .update({
      pin_hash: await hashPin(newPin),
      pin_changed_at: new Date().toISOString(),
    })
    .eq('user_id', session.userId);

  if (updateError) {
    console.error('[pin] บันทึก PIN ใหม่ไม่สำเร็จ', updateError);
    return Response.json({ error: 'บันทึก PIN ใหม่ไม่สำเร็จ กรุณาลองใหม่' }, { status: 500 });
  }

  // บันทึกว่าเปลี่ยนแล้ว ไม่บันทึกตัว PIN หรือ hash ลง audit log
  await writeAudit({
    actorId: session.userId,
    action: 'PIN_CHANGED',
    entity: 'app_user',
    entityId: session.userId,
  });

  return Response.json({ ok: true });
}
