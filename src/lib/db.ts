/**
 * Supabase client — ใช้ service role ฝั่ง server เท่านั้น
 *
 * สคีมาเปิด RLS โดยไม่มี policy ใด ๆ ซึ่งหมายความว่า anon key เข้าถึงไม่ได้เลย
 * การเข้าถึงข้อมูลทั้งหมดจึงผ่าน route handler ที่ตรวจ session ก่อนเสมอ
 * ห้าม import ไฟล์นี้จาก client component
 */

import 'server-only';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

let cached: SupabaseClient<Database> | null = null;

export function db(): SupabaseClient<Database> {
  if (cached) return cached;

  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      'SUPABASE_URL หรือ SUPABASE_SERVICE_ROLE_KEY ไม่ได้ตั้งค่า — ดู .env.example',
    );
  }

  cached = createClient<Database>(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cached;
}

/** บันทึก audit log — ไม่ throw เพื่อไม่ให้การบันทึก log ล้มทำให้งานหลักล้มตาม */
export async function writeAudit(entry: {
  actorId: string | null;
  action: string;
  entity: string;
  entityId?: string | null;
  detail?: Record<string, unknown>;
}): Promise<void> {
  try {
    await db().from('audit_log').insert({
      actor_id: entry.actorId,
      action: entry.action,
      entity: entry.entity,
      entity_id: entry.entityId ?? null,
      detail: entry.detail ?? null,
    });
  } catch (error) {
    console.error('[audit] เขียน audit log ไม่สำเร็จ', error);
  }
}
