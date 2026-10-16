import { describe, expect, it } from 'vitest';
import {
  currentShift,
  currentShiftWindow,
  todayShiftWindows,
  periodWindow,
  foleyDay,
  bangkokDateString,
  formatThaiDate,
} from './shift';

/** ช่วยสร้างเวลา UTC จากเวลาไทยที่อ่านง่าย */
const bkk = (iso: string) => new Date(`${iso}+07:00`);

describe('currentShift', () => {
  it('08.01–16.00 เป็นเวรเช้า', () => {
    expect(currentShift(bkk('2026-09-15T08:01:00'))).toBe('MORNING');
    expect(currentShift(bkk('2026-09-15T12:00:00'))).toBe('MORNING');
    expect(currentShift(bkk('2026-09-15T16:00:59'))).toBe('MORNING');
  });

  it('16.01–00.00 เป็นเวรบ่าย', () => {
    expect(currentShift(bkk('2026-09-15T16:01:00'))).toBe('AFTERNOON');
    expect(currentShift(bkk('2026-09-15T23:59:00'))).toBe('AFTERNOON');
  });

  it('00.01–08.00 เป็นเวรดึก', () => {
    expect(currentShift(bkk('2026-09-15T00:01:00'))).toBe('NIGHT');
    expect(currentShift(bkk('2026-09-15T02:30:00'))).toBe('NIGHT');
    expect(currentShift(bkk('2026-09-15T08:00:59'))).toBe('NIGHT');
  });

  it('นาทีสุดท้ายของแต่ละช่วงยังเป็นของเวรที่กำลังจะลง', () => {
    // ตารางเวรเขียนปลายช่วงแบบรวมนาทีนั้น 08.00 จึงยังเป็นเวรดึก ไม่ใช่เวรเช้า
    expect(currentShift(bkk('2026-09-15T08:00:00'))).toBe('NIGHT');
    expect(currentShift(bkk('2026-09-15T16:00:00'))).toBe('MORNING');
    expect(currentShift(bkk('2026-09-15T00:00:00'))).toBe('AFTERNOON');
  });
});

describe('currentShiftWindow', () => {
  it('เวรเช้าเริ่ม 08:01 ตามเวลาไทย', () => {
    const { start, end } = currentShiftWindow(bkk('2026-09-15T09:30:00'));
    expect(start.toISOString()).toBe(bkk('2026-09-15T08:01:00').toISOString());
    expect(end.toISOString()).toBe(bkk('2026-09-15T16:01:00').toISOString());
  });

  it('เวรดึกอยู่ในวันเดียวกันทั้งเวร ไม่คร่อมเที่ยงคืนอีกแล้ว', () => {
    const { start, end } = currentShiftWindow(bkk('2026-09-16T02:00:00'));
    expect(start.toISOString()).toBe(bkk('2026-09-16T00:01:00').toISOString());
    expect(end.toISOString()).toBe(bkk('2026-09-16T08:01:00').toISOString());
  });

  it('เวรบ่ายคร่อมเที่ยงคืนหนึ่งนาที 23:30 กับ 00:00 จึงอยู่ในเวรเดียวกัน', () => {
    const a = currentShiftWindow(bkk('2026-09-15T23:30:00'));
    const b = currentShiftWindow(bkk('2026-09-16T00:00:00'));
    expect(a.start.toISOString()).toBe(b.start.toISOString());
    expect(a.start.toISOString()).toBe(bkk('2026-09-15T16:01:00').toISOString());
  });

  it('ตี 0:01 ขึ้นเวรดึกของวันใหม่แล้ว', () => {
    const { start } = currentShiftWindow(bkk('2026-09-16T00:01:00'));
    expect(start.toISOString()).toBe(bkk('2026-09-16T00:01:00').toISOString());
  });

  it('ทุกเวรยาว 8 ชั่วโมงเท่ากัน', () => {
    for (const iso of ['2026-09-15T03:00:00', '2026-09-15T10:00:00', '2026-09-15T20:00:00']) {
      const { start, end } = currentShiftWindow(bkk(iso));
      expect(end.getTime() - start.getTime()).toBe(8 * 60 * 60 * 1000);
    }
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

describe('todayShiftWindows', () => {
  it('คืนสามเวรเรียงตามเวลา เริ่มที่เวรดึก 00:01', () => {
    const w = todayShiftWindows(bkk('2026-09-15T09:30:00'));
    expect(w.map((x) => x.shift)).toEqual(['NIGHT', 'MORNING', 'AFTERNOON']);
    expect(w[0].start.toISOString()).toBe(bkk('2026-09-15T00:01:00').toISOString());
    expect(w[2].end.toISOString()).toBe(bkk('2026-09-16T00:01:00').toISOString());
  });

  it('เวรต่อกันสนิทไม่มีช่องว่าง', () => {
    const w = todayShiftWindows(bkk('2026-09-15T20:00:00'));
    expect(w[0].end.toISOString()).toBe(w[1].start.toISOString());
    expect(w[1].end.toISOString()).toBe(w[2].start.toISOString());
  });

  it('ตีสองอยู่ในวันทำงานของวันนั้นเอง ไม่ใช่เมื่อวาน', () => {
    // เวรดึกไม่คร่อมเที่ยงคืนแล้ว วันทำงานจึงตรงกับวันตามปฏิทิน
    const w = todayShiftWindows(bkk('2026-09-16T02:00:00'));
    expect(w[0].start.toISOString()).toBe(bkk('2026-09-16T00:01:00').toISOString());
  });

  it('เที่ยงคืนพอดียังเป็นวันทำงานเมื่อวาน เพราะเวรบ่ายจบที่ 00.00', () => {
    const w = todayShiftWindows(bkk('2026-09-16T00:00:00'));
    expect(w[0].start.toISOString()).toBe(bkk('2026-09-15T00:01:00').toISOString());
    expect(w[2].end.toISOString()).toBe(bkk('2026-09-16T00:01:00').toISOString());
  });

  it('เวรปัจจุบันตรงกับ currentShiftWindow เสมอ', () => {
    for (const iso of [
      '2026-09-15T00:01:00',
      '2026-09-15T08:00:00',
      '2026-09-15T08:01:00',
      '2026-09-15T16:00:00',
      '2026-09-15T18:00:00',
      '2026-09-16T00:00:00',
      '2026-09-16T02:00:00',
    ]) {
      const now = bkk(iso);
      const cur = currentShiftWindow(now);
      expect(cur.start <= now && now < cur.end).toBe(true);
    }
  });

  it('ทุกนาทีของวันตกอยู่ในเวรใดเวรหนึ่งพอดีหนึ่งเวร', () => {
    const day = bkk('2026-09-15T00:00:00').getTime();
    for (let min = 0; min < 24 * 60; min++) {
      const at = new Date(day + min * 60 * 1000);
      const matches = todayShiftWindows(at).filter((w) => w.start <= at && at < w.end);
      expect(matches).toHaveLength(1);
      expect(matches[0].shift).toBe(currentShift(at));
    }
  });
});

describe('periodWindow', () => {
  it('รายวันตรงกับขอบเขตวันทำงาน 00:01 ถึง 00:01 ของวันถัดไป', () => {
    const { start, end } = periodWindow('day', bkk('2026-09-15T12:00:00'));
    expect(start.toISOString()).toBe(bkk('2026-09-15T00:01:00').toISOString());
    expect(end.toISOString()).toBe(bkk('2026-09-16T00:01:00').toISOString());
  });

  it('รายเดือนครอบทั้งเดือนตามเวลาไทย', () => {
    const { start, end } = periodWindow('month', bkk('2026-09-15T12:00:00'));
    expect(start.toISOString()).toBe(bkk('2026-09-01T00:00:00').toISOString());
    expect(end.toISOString()).toBe(bkk('2026-10-01T00:00:00').toISOString());
  });

  it('รายเดือนข้ามปีตอนธันวาคม', () => {
    const { end } = periodWindow('month', bkk('2026-12-20T12:00:00'));
    expect(end.toISOString()).toBe(bkk('2027-01-01T00:00:00').toISOString());
  });

  it('รายปีครอบทั้งปีตามเวลาไทย', () => {
    const { start, end } = periodWindow('year', bkk('2026-09-15T12:00:00'));
    expect(start.toISOString()).toBe(bkk('2026-01-01T00:00:00').toISOString());
    expect(end.toISOString()).toBe(bkk('2027-01-01T00:00:00').toISOString());
  });

  it('เที่ยงคืนครึ่งของไทยยังนับเป็นเดือนเดิม ไม่ใช่เดือนก่อนตาม UTC', () => {
    // 00:30 ไทย = 17:30 UTC ของวันก่อน ถ้าคำนวณด้วย UTC จะตกเดือนผิด
    const { start } = periodWindow('month', bkk('2026-09-01T00:30:00'));
    expect(start.toISOString()).toBe(bkk('2026-09-01T00:00:00').toISOString());
  });
});
