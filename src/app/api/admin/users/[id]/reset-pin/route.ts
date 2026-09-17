import type { NextRequest } from 'next/server';
import { db, writeAudit } from '@/lib/db';
import { generatePin, getSession, hashPin } from '@/lib/auth';

/**
 * แอดมินตั้ง PIN ใหม่ให้พนักงานที่ลืม PIN
 *
 * ระบบเก็บแต่ scrypt hash จึงกู้ PIN เดิมคืนไม่ได้ ทางเดียวคือตั้งให้ใหม่
 * PIN ที่ได้ส่งกลับมาครั้งเดียวเพื่อบอกเจ้าตัว แล้วไม่ถูกเก็บไว้ที่ใดอีก
 * และตั้งธงบังคับเปลี่ยนไว้ เพราะระหว่างนี้แอดมินรู้ PIN ของคนอื่นอยู่
 */
export async function POST(
  _request: NextRequest,
  ctx: RouteContext<'/api/admin/users/[id]/reset-pin'>,
) {
  const session = await getSession();
  if (!session) {
    return Response.json({ error: 'กรุณาเข้าสู่ระบบ' }, { status: 401 });
  }
  if (session.role !== 'ADMIN') {
    return Response.json({ error: 'เฉพาะผู้ดูแลระบบเท่านั้น' }, { status: 403 });
  }

  const { id } = await ctx.params;

  const { data: user, error } = await db()
    .from('app_user')
    .select('user_id, employee_id, full_name')
    .eq('user_id', id)
    .maybeSingle();

  if (error) {
    console.error('[reset-pin] อ่านข้อมูลผู้ใช้ไม่สำเร็จ', error);
    return Response.json({ error: 'ระบบขัดข้อง กรุณาลองใหม่' }, { status: 500 });
  }
  if (!user) {
    return Response.json({ error: 'ไม่พบบัญชีนี้' }, { status: 404 });
  }

  const pin = generatePin();

  const { error: updateError } = await db()
    .from('app_user')
    .update({
      pin_hash: await hashPin(pin),
      must_change_pin: true,
      pin_changed_at: null,
    })
    .eq('user_id', user.user_id);

  if (updateError) {
    console.error('[reset-pin] ตั้ง PIN ใหม่ไม่สำเร็จ', updateError);
    return Response.json({ error: 'ตั้ง PIN ใหม่ไม่สำเร็จ กรุณาลองใหม่' }, { status: 500 });
  }

  // บันทึกว่าใครรีเซ็ตให้ใคร แต่ไม่บันทึกตัว PIN
  await writeAudit({
    actorId: session.userId,
    action: 'PIN_RESET',
    entity: 'app_user',
    entityId: user.user_id,
    detail: { employeeId: user.employee_id },
  });

  return Response.json({ pin, employeeId: user.employee_id, fullName: user.full_name });
}
