import { describe, expect, it } from 'vitest';
import { buildAssessmentResponseBody } from './response';
import { evaluateCheck5 } from '@/lib/check5';
import { shouldRevealFeedback } from '@/lib/study-mode';

const allNo = evaluateCheck5({ need: false, fix: false, flow: false, below: false, closed: false });

for (const mode of ['BASELINE', 'INTERVENTION'] as const) {
  describe(`ผลประเมิน ${mode}`, () => {
    it.each(['NURSE', 'AUDITOR', 'WARD_HEAD', 'IC_NURSE', 'ADMIN'] as const)(
      '%s ตอบไม่ใช่ทุกข้อได้รับคำแนะนำทั้ง 5 ข้อ รวมกรณีส่งซ้ำ', role => {
        for (const duplicate of [false, true]) {
          const body = buildAssessmentResponseBody({
            assessmentId: 'a-1', assessedAt: '2026-09-15T01:30:00.000Z',
            studyMode: mode, reveal: shouldRevealFeedback(mode, role), result: allNo, duplicate,
          });
          expect(body.studyMode).toBe(mode);
          expect(body.duplicate).toBe(duplicate);
          expect(body.allPass).toBe(false);
          expect(body.feedback).toBe('REVIEW_REMOVAL');
          expect(body.failedItems?.map(item => item.key)).toEqual(['need', 'fix', 'flow', 'below', 'closed']);
          expect(body.failedItems?.every(item => item.actionMessage.length > 0)).toBe(true);
          expect(body.requiresEscalation).toBe(true);
          expect(body.correctableKeys).toEqual(['fix', 'flow', 'below']);
        }
      },
    );
    it('ตอบผ่านทุกข้อแสดงผลผ่านและไม่มีรายการแก้ไข', () => {
      const body = buildAssessmentResponseBody({
        assessmentId: 'a-2', assessedAt: '2026-09-15T01:30:00.000Z', studyMode: mode,
        reveal: shouldRevealFeedback(mode, 'NURSE'), duplicate: false,
        result: evaluateCheck5({ need: true, fix: true, flow: true, below: true, closed: true }),
      });
      expect(body.allPass).toBe(true);
      expect(body.feedback).toBe('PASS');
      expect(body.failedItems).toEqual([]);
    });
  });
}
