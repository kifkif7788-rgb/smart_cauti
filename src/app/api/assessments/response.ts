/** สร้าง response ผลประเมินรวมคำแนะนำตามนโยบายส่วนกลาง */

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

  // รองรับการไม่เปิดเผยข้อมูลหากนโยบายส่วนกลางเปลี่ยนในอนาคต
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
