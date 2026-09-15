import { describe, expect, it } from 'vitest';
import {
  currentShift,
  currentShiftWindow,
  foleyDay,
  bangkokDateString,
  formatThaiDate,
} from './shift';

/** ช่วยสร้างเวลา UTC จากเวลาไทยที่อ่านง่าย */
const bkk = (iso: string) => new Date(`${iso}+07:00`);

describe('currentShift', () => {
  it('07:00–14:59 เป็นเวรเช้า', () => {
    expect(currentShift(bkk('2026-09-15T07:00:00'))).toBe('MORNING');
    expect(currentShift(bkk('2026-09-15T14:59:00'))).toBe('MORNING');
  });

  it('15:00–22:59 เป็นเวรบ่าย', () => {
    expect(currentShift(bkk('2026-09-15T15:00:00'))).toBe('AFTERNOON');
    expect(currentShift(bkk('2026-09-15T22:59:00'))).toBe('AFTERNOON');
  });

  it('23:00–06:59 เป็นเวรดึก คร่อมเที่ยงคืน', () => {
    expect(currentShift(bkk('2026-09-15T23:00:00'))).toBe('NIGHT');
    expect(currentShift(bkk('2026-09-16T02:30:00'))).toBe('NIGHT');
    expect(currentShift(bkk('2026-09-16T06:59:00'))).toBe('NIGHT');
  });
});

describe('currentShiftWindow', () => {
  it('เวรเช้าเริ่ม 07:00 ตามเวลาไทย', () => {
    const { start, end } = currentShiftWindow(bkk('2026-09-15T09:30:00'));
    expect(start.toISOString()).toBe(bkk('2026-09-15T07:00:00').toISOString());
    expect(end.toISOString()).toBe(bkk('2026-09-15T15:00:00').toISOString());
  });

  it('เวรดึกหลังเที่ยงคืนต้องย้อนไปเริ่มที่ 23:00 ของเมื่อวาน', () => {
    // ถ้าคำนวณผิด การประเมินตอนตี 2 จะถูกนับเป็นคนละเวรกับตอน 23:30
    const { start, end } = currentShiftWindow(bkk('2026-09-16T02:00:00'));
    expect(start.toISOString()).toBe(bkk('2026-09-15T23:00:00').toISOString());
    expect(end.toISOString()).toBe(bkk('2026-09-16T07:00:00').toISOString());
  });

  it('23:30 กับ 02:00 ของคืนเดียวกันอยู่ในเวรเดียวกัน', () => {
    const a = currentShiftWindow(bkk('2026-09-15T23:30:00'));
    const b = currentShiftWindow(bkk('2026-09-16T02:00:00'));
    expect(a.start.toISOString()).toBe(b.start.toISOString());
  });
});

describe('foleyDay', () => {
  it('วันที่ใส่สายนับเป็นวันที่ 1', () => {
    expect(foleyDay('2026-09-15', bkk('2026-09-15T10:00:00'))).toBe(1);
  });

  it('นับเพิ่มวันละ 1', () => {
    expect(foleyDay('2026-09-13', bkk('2026-09-15T10:00:00'))).toBe(3);
    expect(foleyDay('2026-09-01', bkk('2026-09-15T10:00:00'))).toBe(15);
  });

  it('เวรดึกตี 2 ยังนับเป็นวันตามปฏิทินไทยของวันนั้น', () => {
    expect(foleyDay('2026-09-13', bkk('2026-09-16T02:00:00'))).toBe(4);
  });

  it('คืนค่าอย่างน้อย 1 เมื่อข้อมูลวันที่ผิดปกติ', () => {
    expect(foleyDay('2026-09-20', bkk('2026-09-15T10:00:00'))).toBe(1);
    expect(foleyDay('ไม่ใช่วันที่')).toBe(0);
  });
});

describe('bangkokDateString', () => {
  it('ใช้วันตามเวลาไทย ไม่ใช่ UTC', () => {
    // 2026-09-15 23:30 ไทย = 2026-09-15 16:30 UTC — วันเดียวกัน
    expect(bangkokDateString(bkk('2026-09-15T23:30:00'))).toBe('2026-09-15');
    // 2026-09-16 01:00 ไทย = 2026-09-15 18:00 UTC — ต้องได้ 16 ไม่ใช่ 15
    expect(bangkokDateString(bkk('2026-09-16T01:00:00'))).toBe('2026-09-16');
  });
});

describe('formatThaiDate', () => {
  it('แปลง ค.ศ. เป็น พ.ศ. พร้อมชื่อเดือนย่อ', () => {
    expect(formatThaiDate('2025-08-10')).toBe('10 ส.ค. 2568');
    expect(formatThaiDate('2026-01-01')).toBe('1 ม.ค. 2569');
  });
});
