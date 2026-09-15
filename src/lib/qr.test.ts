import { beforeAll, describe, expect, it } from 'vitest';

// ต้องตั้ง secret ก่อน import โมดูล เพราะอ่านค่าตอนเรียกใช้
process.env.QR_SECRET = 'test-qr-secret-value-at-least-32-characters-long';

const {
  signTagCode,
  verifyTagSignature,
  isValidTagCode,
  generateTagCode,
  tagUrl,
} = await import('./qr');

describe('isValidTagCode', () => {
  it('รับรูปแบบ XX-XXXXXX', () => {
    expect(isValidTagCode('SM-A17K3Q')).toBe(true);
  });

  it('ปฏิเสธรูปแบบที่ผิด', () => {
    expect(isValidTagCode('sm-a17k3q')).toBe(false); // ตัวพิมพ์เล็ก
    expect(isValidTagCode('SM-A17K3')).toBe(false); // สั้นไป
    expect(isValidTagCode('SMA17K3Q')).toBe(false); // ไม่มีขีด
    expect(isValidTagCode('')).toBe(false);
    expect(isValidTagCode(null)).toBe(false);
  });
});

describe('ลายเซ็นของป้าย', () => {
  it('เซ็นแล้วตรวจผ่าน', () => {
    const code = 'SM-A17K3Q';
    expect(verifyTagSignature(code, signTagCode(code))).toBe(true);
  });

  it('ลายเซ็นของป้ายอื่นใช้ไม่ได้', () => {
    // กันการเดารหัสป้ายใบอื่นจากป้ายที่มีอยู่ในมือ
    expect(verifyTagSignature('SM-A17K3Q', signTagCode('SM-B28L4R'))).toBe(false);
  });

  it('ปฏิเสธลายเซ็นว่างหรือความยาวไม่ตรง', () => {
    expect(verifyTagSignature('SM-A17K3Q', null)).toBe(false);
    expect(verifyTagSignature('SM-A17K3Q', '')).toBe(false);
    expect(verifyTagSignature('SM-A17K3Q', 'abc')).toBe(false);
  });

  it('ลายเซ็นยาว 12 อักขระและเป็น base64url', () => {
    const signature = signTagCode('SM-A17K3Q');
    expect(signature).toHaveLength(12);
    expect(signature).toMatch(/^[A-Za-z0-9_-]{12}$/);
  });
});

describe('generateTagCode', () => {
  it('สร้างรหัสที่ผ่าน isValidTagCode เสมอ', () => {
    for (let i = 0; i < 200; i += 1) {
      expect(isValidTagCode(generateTagCode('SM'))).toBe(true);
    }
  });

  it('ไม่ใช้อักขระที่สับสนง่าย (0/O และ 1/I)', () => {
    // พยาบาลต้องพิมพ์รหัสนี้ด้วยมือเมื่อกล้องใช้ไม่ได้
    for (let i = 0; i < 300; i += 1) {
      const suffix = generateTagCode('SM').split('-')[1];
      expect(suffix).not.toMatch(/[01OI]/);
    }
  });
});

describe('tagUrl', () => {
  it('สร้าง URL ที่มีลายเซ็นกำกับ', () => {
    const url = tagUrl('SM-A17K3Q', 'https://cauti.example.th');
    expect(url).toBe(`https://cauti.example.th/s/SM-A17K3Q?k=${signTagCode('SM-A17K3Q')}`);
  });

  it('ตัด slash ท้าย base URL ไม่ให้เกิด // ซ้อน', () => {
    expect(tagUrl('SM-A17K3Q', 'https://cauti.example.th/')).toContain(
      'cauti.example.th/s/',
    );
  });
});
