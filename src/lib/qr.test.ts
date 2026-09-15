import { describe, expect, it } from 'vitest';

// ต้องตั้ง secret ก่อน import โมดูล เพราะอ่านค่าตอนเรียกใช้
process.env.QR_SECRET = 'test-qr-secret-value-at-least-32-characters-long';

const {
  signTagCode,
  verifyTagSignature,
  isValidTagCode,
  tagCodeForBed,
  bedNoFromTagCode,
  tagUrl,
} = await import('./qr');

describe('tagCodeForBed', () => {
  it('เติมศูนย์หน้าเลขเตียงหลักเดียว', () => {
    expect(tagCodeForBed('SM', 1)).toBe('SM-B01');
    expect(tagCodeForBed('SM', 9)).toBe('SM-B09');
  });

  it('เตียงสองหลักไม่เติมศูนย์', () => {
    expect(tagCodeForBed('SM', 10)).toBe('SM-B10');
    expect(tagCodeForBed('SM', 30)).toBe('SM-B30');
  });

  it('สร้างรหัสไม่ซ้ำกันสำหรับเตียง 1–30', () => {
    const codes = new Set<string>();
    for (let bed = 1; bed <= 30; bed += 1) codes.add(tagCodeForBed('SM', bed));
    expect(codes.size).toBe(30);
  });

  it('ปฏิเสธเลขเตียงที่อยู่นอกช่วง', () => {
    expect(() => tagCodeForBed('SM', 0)).toThrow();
    expect(() => tagCodeForBed('SM', 100)).toThrow();
    expect(() => tagCodeForBed('SM', 1.5)).toThrow();
  });
});

describe('bedNoFromTagCode', () => {
  it('อ่านเลขเตียงกลับมาได้', () => {
    expect(bedNoFromTagCode('SM-B01')).toBe(1);
    expect(bedNoFromTagCode('SM-B30')).toBe(30);
  });

  it('ไป-กลับได้ตรงกันทุกเตียง', () => {
    for (let bed = 1; bed <= 30; bed += 1) {
      expect(bedNoFromTagCode(tagCodeForBed('SM', bed))).toBe(bed);
    }
  });

  it('คืน null เมื่อรูปแบบไม่ถูกต้อง', () => {
    expect(bedNoFromTagCode('SM-A17K3Q')).toBeNull();
    expect(bedNoFromTagCode('SM-B00')).toBeNull();
  });
});

describe('isValidTagCode', () => {
  it('รับรูปแบบรหัสเตียง', () => {
    expect(isValidTagCode('SM-B01')).toBe(true);
    expect(isValidTagCode('SM-B30')).toBe(true);
  });

  it('ปฏิเสธรูปแบบที่ผิด', () => {
    expect(isValidTagCode('sm-b01')).toBe(false); // ตัวพิมพ์เล็ก
    expect(isValidTagCode('SM-B00')).toBe(false); // ไม่มีเตียง 0
    expect(isValidTagCode('SM-B1')).toBe(false); // ไม่เติมศูนย์
    expect(isValidTagCode('SM-A17K3Q')).toBe(false); // รูปแบบเดิม
    expect(isValidTagCode('SMB01')).toBe(false);
    expect(isValidTagCode('')).toBe(false);
    expect(isValidTagCode(null)).toBe(false);
  });
});

describe('ลายเซ็นของป้าย', () => {
  it('เซ็นแล้วตรวจผ่าน', () => {
    expect(verifyTagSignature('SM-B01', signTagCode('SM-B01'))).toBe(true);
  });

  it('ลายเซ็นของเตียงอื่นใช้ไม่ได้', () => {
    // รหัสเตียงเดาได้ง่าย ความปลอดภัยจึงอยู่ที่ลายเซ็นทั้งหมด
    expect(verifyTagSignature('SM-B01', signTagCode('SM-B02'))).toBe(false);
  });

  it('ทุกเตียงมีลายเซ็นต่างกัน', () => {
    const signatures = new Set<string>();
    for (let bed = 1; bed <= 30; bed += 1) {
      signatures.add(signTagCode(tagCodeForBed('SM', bed)));
    }
    expect(signatures.size).toBe(30);
  });

  it('ปฏิเสธลายเซ็นว่างหรือความยาวไม่ตรง', () => {
    expect(verifyTagSignature('SM-B01', null)).toBe(false);
    expect(verifyTagSignature('SM-B01', '')).toBe(false);
    expect(verifyTagSignature('SM-B01', 'abc')).toBe(false);
  });

  it('ลายเซ็นยาว 12 อักขระและเป็น base64url', () => {
    const signature = signTagCode('SM-B01');
    expect(signature).toHaveLength(12);
    expect(signature).toMatch(/^[A-Za-z0-9_-]{12}$/);
  });
});

describe('tagUrl', () => {
  it('สร้าง URL ที่มีลายเซ็นกำกับ', () => {
    expect(tagUrl('SM-B01', 'https://cauti.example.th')).toBe(
      `https://cauti.example.th/s/SM-B01?k=${signTagCode('SM-B01')}`,
    );
  });

  it('ตัด slash ท้าย base URL ไม่ให้เกิด // ซ้อน', () => {
    expect(tagUrl('SM-B01', 'https://cauti.example.th/')).toContain(
      'cauti.example.th/s/',
    );
  });

  it('URL ไม่มีข้อมูลผู้ป่วยใด ๆ — มีเพียงรหัสเตียงกับลายเซ็น', () => {
    // ป้ายติดอยู่ในตำแหน่งที่ผู้อื่นมองเห็นได้
    const url = tagUrl('SM-B01', 'https://cauti.example.th');
    expect(url).not.toMatch(/hn|HN|\d{7}/);
  });
});
