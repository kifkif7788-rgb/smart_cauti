import { describe, expect, it } from 'vitest';
import {
  SATISFACTION_ITEMS,
  SATISFACTION_SCALE,
  itemAverages,
  overallAverage,
  validateComment,
  validateScores,
  COMMENT_MAX,
} from './satisfaction';

describe('ชุดคำถาม', () => {
  it('มี 5 ข้อ ตรงกับ constraint ในฐานข้อมูล', () => {
    // ฐานข้อมูลบังคับ array_length(scores,1) = 5 ถ้าเพิ่มข้อต้องแก้ migration ด้วย
    expect(SATISFACTION_ITEMS).toHaveLength(5);
  });

  it('ระดับคะแนนมี 5 ระดับ เรียงจากน้อยที่สุดถึงมากที่สุด', () => {
    expect(SATISFACTION_SCALE).toHaveLength(5);
    expect(SATISFACTION_SCALE[0]).toBe('น้อยที่สุด');
    expect(SATISFACTION_SCALE[4]).toBe('มากที่สุด');
  });

  it('ไม่มีข้อคำถามซ้ำกัน', () => {
    expect(new Set(SATISFACTION_ITEMS).size).toBe(SATISFACTION_ITEMS.length);
  });
});

describe('validateScores', () => {
  it('ผ่านเมื่อให้คะแนนครบทุกข้อในช่วง 1–5', () => {
    expect(validateScores([1, 2, 3, 4, 5])).toBeNull();
    expect(validateScores([5, 5, 5, 5, 5])).toBeNull();
  });

  it('ไม่ผ่านเมื่อตอบไม่ครบ', () => {
    expect(validateScores([5, 5, 5, 5])).toContain('ครบทั้ง 5 ข้อ');
    expect(validateScores([])).toContain('ครบทั้ง 5 ข้อ');
  });

  it('ไม่ผ่านเมื่อมีข้อที่ยังไม่ได้เลือก', () => {
    // ฟอร์มส่ง null มาสำหรับข้อที่ยังไม่กด ต้องไม่หลุดผ่านไปเป็น 0
    expect(validateScores([5, 5, null, 5, 5])).toContain('1 ถึง 5');
  });

  it('ไม่ผ่านเมื่อคะแนนอยู่นอกช่วง', () => {
    expect(validateScores([0, 1, 2, 3, 4])).toContain('1 ถึง 5');
    expect(validateScores([1, 2, 3, 4, 6])).toContain('1 ถึง 5');
    expect(validateScores([1, 2, 3, 4, 2.5])).toContain('1 ถึง 5');
  });

  it('ไม่ผ่านเมื่อไม่ใช่ array', () => {
    expect(validateScores(null)).not.toBeNull();
    expect(validateScores('55555')).not.toBeNull();
  });
});

describe('validateComment', () => {
  it('ว่างได้ เพราะไม่บังคับกรอก', () => {
    expect(validateComment(null)).toBeNull();
    expect(validateComment('')).toBeNull();
    expect(validateComment(undefined)).toBeNull();
  });

  it('ผ่านเมื่อเป็นข้อความปกติ', () => {
    expect(validateComment('ใช้งานง่ายดีค่ะ')).toBeNull();
  });

  it('ไม่ผ่านเมื่อยาวเกินกำหนด', () => {
    expect(validateComment('ก'.repeat(COMMENT_MAX + 1))).toContain(String(COMMENT_MAX));
    expect(validateComment('ก'.repeat(COMMENT_MAX))).toBeNull();
  });
});

describe('itemAverages', () => {
  it('เฉลี่ยแยกรายข้อตามลำดับคำถาม', () => {
    const avgs = itemAverages([
      { scores: [5, 1, 5, 1, 5] },
      { scores: [3, 3, 3, 3, 3] },
    ]);
    expect(avgs).toEqual([4, 2, 4, 2, 4]);
  });

  it('คืน null ทุกข้อเมื่อยังไม่มีผู้ตอบ ไม่ใช่ศูนย์', () => {
    // ศูนย์แปลว่าได้คะแนนแย่ที่สุด ซึ่งคนละเรื่องกับยังไม่มีใครตอบ
    expect(itemAverages([])).toEqual([null, null, null, null, null]);
  });
});

describe('overallAverage', () => {
  it('เฉลี่ยรวมทุกข้อทุกคน', () => {
    expect(overallAverage([{ scores: [4, 4, 4, 4, 4] }])).toBe(4);
    expect(
      overallAverage([{ scores: [5, 5, 5, 5, 5] }, { scores: [3, 3, 3, 3, 3] }]),
    ).toBe(4);
  });

  it('คืน null เมื่อยังไม่มีผู้ตอบ', () => {
    expect(overallAverage([])).toBeNull();
  });
});
