import { describe, expect, it } from 'vitest';
import { buildAssessmentResponseBody } from './response';
import { evaluateCheck5 } from '@/lib/check5';
import { shouldRevealFeedback } from '@/lib/study-mode';

/**
 * การทดสอบที่สำคัญที่สุดของโครงการ
 *
 * ถ้า feedback รั่วออกไปในช่วง baseline แม้แต่ field เดียว
 * ผู้ปฏิบัติงานอาจได้รับ intervention ก่อนกำหนด ทำให้ข้อมูล
 * ก่อน–หลังเปรียบเทียบกันไม่ได้ และโครงการ 1 เดือนต้องเริ่มใหม่
 *
 * จึงตรวจถึงระดับ JSON ที่ส่งออกจริง ไม่ใช่แค่ค่าของตัวแปร
 */

const failing = evaluateCheck5({
  need: false,
  fix: true,
  flow: false,
  below: true,
  closed: true,
});

const FEEDBACK_FIELDS = [
  'allPass',
  'feedback',
  'failedItems',
  'requiresEscalation',
  'correctableKeys',
];

describe('BASELINE ต้องไม่รั่ว feedback', () => {
  const body = buildAssessmentResponseBody({
    assessmentId: 'a-1',
    assessedAt: '2026-09-15T01:30:00.000Z',
    studyMode: 'BASELINE',
    reveal: false,
    result: failing,
    duplicate: false,
  });

  it('ไม่มี key ที่เกี่ยวกับ feedback อยู่ใน object', () => {
    for (const field of FEEDBACK_FIELDS) {
      expect(Object.hasOwn(body, field)).toBe(false);
    }
  });

  it('ส่งเฉพาะ field ที่จำเป็นต่อการยืนยันว่าบันทึกแล้ว', () => {
    expect(Object.keys(body).sort()).toEqual(
      ['assessedAt', 'assessmentId', 'duplicate', 'studyMode'].sort(),
    );
  });

  it('JSON ที่ส่งออกจริงไม่มีคำแนะนำหรือชื่อข้อที่ไม่ผ่านปนอยู่', () => {
    // ตรวจข้อความดิบ เพราะ field ซ้อนลึกอาจหลุดโดยไม่ทันสังเกต
    const raw = JSON.stringify(body);
    expect(raw).not.toContain('REVIEW_REMOVAL');
    expect(raw).not.toContain('NEED');
    expect(raw).not.toContain('ทบทวน');
    expect(raw).not.toContain('จัดสายใหม่');
  });
});

describe('INTERVENTION ส่ง feedback ครบ', () => {
  const body = buildAssessmentResponseBody({
    assessmentId: 'a-2',
    assessedAt: '2026-09-15T01:30:00.000Z',
    studyMode: 'INTERVENTION',
    reveal: true,
    result: failing,
    duplicate: false,
  });

  it('มีครบทุก field ที่หน้าผลลัพธ์ต้องใช้', () => {
    for (const field of FEEDBACK_FIELDS) {
      expect(Object.hasOwn(body, field)).toBe(true);
    }
  });

  it('ส่งคำแนะนำของข้อที่ไม่ผ่าน', () => {
    expect(body.feedback).toBe('REVIEW_REMOVAL');
    expect(body.failedItems?.map((f) => f.key)).toEqual(['need', 'flow']);
    expect(body.requiresEscalation).toBe(true);
  });
});

describe('ประตูเปิดเผยข้อมูลสอดคล้องกันทั้งระบบ', () => {
  it('AUDITOR ไม่ได้รับ feedback แม้อยู่ในโหมด INTERVENTION', () => {
    const reveal = shouldRevealFeedback('INTERVENTION', 'AUDITOR');
    const body = buildAssessmentResponseBody({
      assessmentId: 'a-3',
      assessedAt: '2026-09-15T01:30:00.000Z',
      studyMode: 'INTERVENTION',
      reveal,
      result: failing,
      duplicate: false,
    });
    expect(reveal).toBe(false);
    for (const field of FEEDBACK_FIELDS) {
      expect(Object.hasOwn(body, field)).toBe(false);
    }
  });

  it('พยาบาลในโหมด BASELINE ไม่ได้รับ feedback', () => {
    expect(shouldRevealFeedback('BASELINE', 'NURSE')).toBe(false);
  });

  it('การบันทึกซ้ำจาก offline sync ก็ยังเคารพโหมด baseline', () => {
    const body = buildAssessmentResponseBody({
      assessmentId: 'a-4',
      assessedAt: '2026-09-15T01:30:00.000Z',
      studyMode: 'BASELINE',
      reveal: false,
      result: failing,
      duplicate: true,
    });
    expect(body.duplicate).toBe(true);
    expect(Object.hasOwn(body, 'feedback')).toBe(false);
  });
});
