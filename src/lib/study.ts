/**
 * Study Mode — โหมดการเก็บข้อมูลของโครงการวิจัย
 *
 * โครงการใช้รูปแบบ one-group pretest–posttest จึงต้องเก็บข้อมูล CHECK 5
 * ในช่วง baseline โดย "ไม่แสดง feedback" แก่ผู้ปฏิบัติงาน
 *
 * กติกาสำคัญ (spec ส่วนที่ 3 และ 8):
 *   ในโหมด BASELINE เซิร์ฟเวอร์ต้องไม่ส่ง feedback กลับมาใน response เลย
 *   ไม่ใช่แค่ให้ client ซ่อน — มิฉะนั้น intervention รั่วผ่าน network inspection
 *   หรือผ่าน bug ของ client ได้ ซึ่งจะทำให้ข้อมูล baseline ใช้ไม่ได้ทั้งชุด
 */

import 'server-only';
import { db } from './db';
import type { StudyRow, StudyMode } from '@/types/database';

// ตรรกะการเปิดเผย feedback อยู่ใน study-mode.ts เพื่อให้ทดสอบได้โดยไม่ต้องมี DB
export { shouldRevealFeedback, nurseCanSeeDashboard } from './study-mode';

/** โครงการที่กำลังดำเนินอยู่ — Phase 1 มีโครงการเดียว */
export async function getActiveStudy(): Promise<StudyRow> {
  const { data, error } = await db()
    .from('study')
    .select('*')
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(`อ่านข้อมูลโครงการไม่สำเร็จ: ${error.message}`);
  if (!data) throw new Error('ยังไม่มีข้อมูลโครงการในระบบ — ต้องรัน seed ก่อน');
  return data;
}

export interface ModeSwitchResult {
  ok: boolean;
  error?: string;
}

/**
 * สลับโหมดโครงการ
 *
 * ห้ามสลับกลับจาก INTERVENTION เป็น BASELINE เพราะเมื่อผู้ปฏิบัติงาน
 * ได้รับ feedback ไปแล้ว ข้อมูลที่เก็บหลังจากนั้นไม่ใช่ baseline อีกต่อไป
 * (contamination) การอนุญาตให้สลับกลับจะทำให้ชุดข้อมูลตีความไม่ได้
 */
export async function switchStudyMode(
  studyId: string,
  toMode: StudyMode,
  reason: string,
  changedBy: string,
): Promise<ModeSwitchResult> {
  const study = await getActiveStudy();

  if (study.current_mode === toMode) {
    return { ok: false, error: `โครงการอยู่ในโหมด ${toMode} อยู่แล้ว` };
  }

  if (study.current_mode === 'INTERVENTION' && toMode === 'BASELINE') {
    return {
      ok: false,
      error:
        'ไม่สามารถสลับกลับเป็น BASELINE ได้ เพราะผู้ปฏิบัติงานได้รับ feedback ไปแล้ว ' +
        'ข้อมูลที่เก็บหลังจากนี้จะไม่ใช่ baseline อีกต่อไป',
    };
  }

  if (!reason || reason.trim().length < 5) {
    return { ok: false, error: 'ต้องระบุเหตุผลในการสลับโหมดอย่างน้อย 5 อักขระ' };
  }

  const update: Partial<StudyRow> = {
    current_mode: toMode,
    updated_at: new Date().toISOString(),
  };
  if (toMode === 'INTERVENTION' && !study.intervention_start) {
    update.intervention_start = new Date().toISOString().slice(0, 10);
  }

  const { error } = await db().from('study').update(update).eq('study_id', studyId);
  if (error) return { ok: false, error: `สลับโหมดไม่สำเร็จ: ${error.message}` };

  await db().from('study_mode_log').insert({
    study_id: studyId,
    from_mode: study.current_mode,
    to_mode: toMode,
    reason: reason.trim(),
    changed_by: changedBy,
  });

  return { ok: true };
}
