import type { NextRequest } from 'next/server';
import { db, writeAudit } from '@/lib/db';
import { generatePin, getSession, hashPin } from '@/lib/auth';

/** กันการกดรีเซ็ตทั้งหอโดยไม่ตั้งใจ และกันคำขอที่ใหญ่จนช้า */
const MAX_AT_ONCE = 40;

/**
 * ผู้ดูแลระบบตั้ง PIN ใหม่ให้หลายบัญชีพร้อมกัน
 *
 * ใช้ตอนเริ่มใช้งานกับหอผู้ป่วยใหม่ หรือเมื่อต้องเปลี่ยน PIN ตั้งต้นที่ใช้ร่วมกัน
 * ให้เป็นของใครของมัน โดยไม่ต้องกดทีละบัญชี 29 ครั้ง
 *
 * PIN ที่สุ่มได้ส่งกลับครั้งเดียวเพื่อให้แอดมินแจกจ่าย แล้วไม่ถูกเก็บไว้ที่ใดอีก
 * เพราะฐานข้อมูลเก็บเฉพาะ scrypt hash
 */
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return Response.json({ error: 'กรุณาเข้าสู่ระบบ' }, { status: 401 });
  }
  if (session.role !== 'ADMIN') {
    return Response.json({ error: 'เฉพาะผู้ดูแลระบบเท่านั้น' }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'รูปแบบข้อมูลไม่ถูกต้อง' }, { status: 400 });
  }

  const { userIds } = (body ?? {}) as Record<string, unknown>;
  if (!Array.isArray(userIds) || userIds.length === 0) {
    return Response.json({ error: 'กรุณาเลือกบัญชีที่ต้องการตั้ง PIN ใหม่' }, { status: 400 });
  }
  if (userIds.some((id) => typeof id !== 'string')) {
    return Response.json({ error: 'รายการบัญชีไม่ถูกต้อง' }, { status: 400 });
  }
  const ids = [...new Set(userIds as string[])];
  if (ids.length > MAX_AT_ONCE) {
    return Response.json(
      { error: `ตั้ง PIN ใหม่ได้ครั้งละไม่เกิน ${MAX_AT_ONCE} บัญชี` },
      { status: 400 },
    );
  }

  const { data: users, error } = await db()
    .from('app_user')
    .select('user_id, employee_id, full_name')
    .in('user_id', ids);

  if (error) {
    console.error('[reset-pins] อ่านข้อมูลผู้ใช้ไม่สำเร็จ', error);
    return Response.json({ error: 'ระบบขัดข้อง กรุณาลองใหม่' }, { status: 500 });
  }
  if (!users || users.length === 0) {
    return Response.json({ error: 'ไม่พบบัญชีที่เลือก' }, { status: 404 });
  }

  const issued: { employeeId: string; fullName: string; pin: string }[] = [];
  const failed: string[] = [];

  // ทีละบัญชีเพราะแต่ละบัญชีได้ PIN คนละตัว และ hash ต้องคำนวณแยกกัน
  for (const user of users) {
    const pin = generatePin();
    const { error: updateError } = await db()
      .from('app_user')
      .update({ pin_hash: await hashPin(pin), pin_changed_at: null })
      .eq('user_id', user.user_id);

    if (updateError) {
      console.error('[reset-pins] ตั้ง PIN ใหม่ไม่สำเร็จ', user.employee_id, updateError);
      failed.push(user.employee_id);
      continue;
    }

    issued.push({ employeeId: user.employee_id, fullName: user.full_name, pin });
    // บันทึกว่าใครรีเซ็ตให้ใคร แต่ไม่บันทึกตัว PIN
    await writeAudit({
      actorId: session.userId,
      action: 'PIN_RESET',
      entity: 'app_user',
      entityId: user.user_id,
      detail: { employeeId: user.employee_id, bulk: true },
    });
  }

  issued.sort((a, b) => a.employeeId.localeCompare(b.employeeId));
  return Response.json({ ok: issued.length > 0, issued, failed });
}
