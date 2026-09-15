/**
 * สร้าง response body ของการบันทึกการประเมิน
 *
 * แยกออกมาเป็นฟังก์ชันบริสุทธิ์เพื่อให้ทดสอบได้ว่า
 * โหมด BASELINE ไม่มี field ใดที่เกี่ยวกับ feedback หลุดออกไปจริง
 * ซึ่งเป็นเงื่อนไขที่ความถูกต้องของข้อมูลวิจัยทั้งชุดขึ้นอยู่กับ
 */

import type { Check5Result } from '@/lib/check5';
import type { StudyMode } from '@/types/database';

export interface AssessmentResponseBody {
  assessmentId: string;
  assessedAt: string;
  studyMode: StudyMode;
  duplicate: boolean;
  allPass?: boolean;
  feedback?: Check5Result['feedback'];
  failedItems?: Check5Result['failedItems'];
  requiresEscalation?: boolean;
  correctableKeys?: Check5Result['correctableKeys'];
}

export function buildAssessmentResponseBody(args: {
  assessmentId: string;
  assessedAt: string;
  studyMode: StudyMode;
  reveal: boolean;
  result: Check5Result;
  duplicate: boolean;
}): AssessmentResponseBody {
  const base: AssessmentResponseBody = {
    assessmentId: args.assessmentId,
    assessedAt: args.assessedAt,
    studyMode: args.studyMode,
    duplicate: args.duplicate,
  };

  // ไม่ใช่แค่ตั้งค่าเป็น undefined — ต้องไม่มี key นี้อยู่ใน object เลย
  if (!args.reveal) return base;

  return {
    ...base,
    allPass: args.result.allPass,
    feedback: args.result.feedback,
    failedItems: args.result.failedItems,
    requiresEscalation: args.result.requiresEscalation,
    correctableKeys: args.result.correctableKeys,
  };
}
