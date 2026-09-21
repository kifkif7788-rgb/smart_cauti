import { describe, expect, it } from 'vitest';
import {
  CHECK5_ITEMS,
  CHECK5_KEYS,
  evaluateCheck5,
  parseAnswers,
  type Check5Answers,
} from './check5';

const allPass: Check5Answers = {
  need: true,
  fix: true,
  flow: true,
  below: true,
  closed: true,
  hand: true,
  flush: true,
  drain: true,
};

const fail = (...keys: Array<keyof Check5Answers>): Check5Answers => {
  const answers = { ...allPass };
  for (const key of keys) answers[key] = false;
  return answers;
};

describe('นิยาม CHECK 9', () => {
  it('มีครบ 9 ข้อ เรียงลำดับ 1–9', () => {
    expect(CHECK5_ITEMS).toHaveLength(9);
    expect(CHECK5_ITEMS.map((i) => i.order)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(CHECK5_ITEMS.map((i) => i.key)).toEqual([...CHECK5_KEYS]);
  });

  it('NEED และ CLOSED ไม่ใช่ข้อที่แก้ไขได้เองที่เตียง', () => {
    // สองข้อนี้ต้องผ่านการทบทวนกับทีม จึงไม่นับเป็น corrective action
    expect(CHECK5_ITEMS.find((i) => i.key === 'need')?.actionKind).toBe('REVIEW_REMOVAL');
    expect(CHECK5_ITEMS.find((i) => i.key === 'closed')?.actionKind).toBe('PROTOCOL');
  });

  it('FIX, FLOW, BELOW เป็นข้อที่แก้ไขได้ทันที', () => {
    for (const key of ['fix', 'flow', 'below'] as const) {
      expect(CHECK5_ITEMS.find((i) => i.key === key)?.actionKind).toBe('CORRECT_NOW');
    }
  });
});

describe('evaluateCheck5 — ผลรวม', () => {
  it('ผ่านครบ 5 ข้อ → PASS และไม่ต้องแจ้งทีม', () => {
    const result = evaluateCheck5(allPass);
    expect(result.feedback).toBe('PASS');
    expect(result.allPass).toBe(true);
    expect(result.failedItems).toHaveLength(0);
    expect(result.requiresEscalation).toBe(false);
  });

  it('NEED ไม่ผ่าน → REVIEW_REMOVAL เสมอ แม้ข้ออื่นผ่านหมด', () => {
    const result = evaluateCheck5(fail('need'));
    expect(result.feedback).toBe('REVIEW_REMOVAL');
    expect(result.requiresEscalation).toBe(true);
  });

  it('NEED มีความสำคัญเหนือ CLOSED เมื่อไม่ผ่านทั้งคู่', () => {
    // ถ้าไม่มีข้อบ่งชี้แล้ว การถอดสายแก้ปัญหาทั้งหมดในคราวเดียว
    const result = evaluateCheck5(fail('need', 'closed'));
    expect(result.feedback).toBe('REVIEW_REMOVAL');
  });

  it('CLOSED ไม่ผ่านโดย NEED ผ่าน → CLOSED_BREACH', () => {
    const result = evaluateCheck5(fail('closed'));
    expect(result.feedback).toBe('CLOSED_BREACH');
    expect(result.requiresEscalation).toBe(true);
  });

  it('เฉพาะ FIX/FLOW/BELOW ไม่ผ่าน → CORRECT_NOW และไม่ต้องแจ้งทีม', () => {
    const result = evaluateCheck5(fail('flow', 'below'));
    expect(result.feedback).toBe('CORRECT_NOW');
    expect(result.requiresEscalation).toBe(false);
    expect(result.correctableKeys).toEqual(['flow', 'below']);
  });

  it('ไม่ผ่านทั้ง 5 ข้อ → REVIEW_REMOVAL และรายงานครบ 5 ข้อ', () => {
    const result = evaluateCheck5(fail('need', 'fix', 'flow', 'below', 'closed'));
    expect(result.feedback).toBe('REVIEW_REMOVAL');
    expect(result.failedItems).toHaveLength(5);
  });
});

describe('evaluateCheck5 — รายละเอียดข้อที่ไม่ผ่าน', () => {
  it('รายงานเฉพาะข้อที่ไม่ผ่าน พร้อมคำแนะนำ', () => {
    const result = evaluateCheck5(fail('flow'));
    expect(result.failedItems).toHaveLength(1);
    expect(result.failedItems[0].key).toBe('flow');
    expect(result.failedItems[0].actionTitle).toBe('Correct Now');
    expect(result.failedItems[0].actionMessage).toContain('จัดสายใหม่');
  });

  it('เรียงข้อที่ไม่ผ่านตามลำดับข้อ ไม่ใช่ตามลำดับที่ตรวจพบ', () => {
    const result = evaluateCheck5(fail('closed', 'fix'));
    expect(result.failedItems.map((f) => f.order)).toEqual([3, 6]);
  });

  it('correctableKeys ไม่รวม NEED และ CLOSED', () => {
    // ตัวส่วนของ corrective action rate ต้องนับเฉพาะข้อที่แก้ได้ ณ จุดดูแล
    const result = evaluateCheck5(fail('need', 'closed', 'fix'));
    expect(result.correctableKeys).toEqual(['fix']);
  });
});

describe('parseAnswers', () => {
  it('รับเฉพาะ boolean ครบทั้ง 5 ข้อ', () => {
    expect(parseAnswers(allPass)).toEqual(allPass);
  });

  it('ปฏิเสธเมื่อตอบไม่ครบ', () => {
    expect(parseAnswers({ need: true, fix: true })).toBeNull();
  });

  it('ปฏิเสธค่าที่ไม่ใช่ boolean เช่นสตริงจาก form ที่ไม่ได้แปลงชนิด', () => {
    expect(parseAnswers({ ...allPass, flow: 'true' })).toBeNull();
    expect(parseAnswers({ ...allPass, flow: 1 })).toBeNull();
    expect(parseAnswers({ ...allPass, flow: null })).toBeNull();
  });

  it('ปฏิเสธ null และค่าที่ไม่ใช่ object', () => {
    expect(parseAnswers(null)).toBeNull();
    expect(parseAnswers('ok')).toBeNull();
    expect(parseAnswers(undefined)).toBeNull();
  });

  it('ตัด field ส่วนเกินทิ้ง ไม่ให้ปนเข้าฐานข้อมูล', () => {
    const parsed = parseAnswers({ ...allPass, hn: '1234567' });
    expect(parsed).toEqual(allPass);
    expect(parsed && 'hn' in parsed).toBe(false);
  });
});

describe('ข้อที่เพิ่มทีหลัง', () => {
  const legacy = { need: true, fix: true, flow: true, below: true, closed: true };

  it('คำตอบเก่าที่มีแค่ 5 ข้อยังใช้ได้ ไม่ถูกทิ้ง', () => {
    // รายการที่ค้างในคิวออฟไลน์ตั้งแต่ก่อนเพิ่มข้อต้องซิงก์ขึ้นมาได้
    expect(parseAnswers(legacy)).toEqual(legacy);
  });

  it('ข้อที่ไม่ได้ถามไม่นับว่าตก', () => {
    const result = evaluateCheck5(legacy);
    expect(result.allPass).toBe(true);
    expect(result.failedItems).toHaveLength(0);
  });

  it('ข้อใหม่ที่ตอบว่าไม่ผ่านนับว่าตกและแก้ได้ทันที', () => {
    const result = evaluateCheck5({ ...allPass, hand: false });
    expect(result.allPass).toBe(false);
    expect(result.failedItems.map((f) => f.key)).toEqual(['hand']);
    expect(result.feedback).toBe('CORRECT_NOW');
    expect(result.correctableKeys).toContain('hand');
  });

  it('ห้าข้อแรกยังบังคับต้องมีครบ', () => {
    expect(parseAnswers({ ...legacy, closed: undefined })).toBeNull();
  });
});
