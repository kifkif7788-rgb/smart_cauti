/**
 * เวรและการคำนวณวันคาสาย — ใช้เขตเวลาไทย (Asia/Bangkok, UTC+7) เสมอ
 *
 * เซิร์ฟเวอร์อาจรันในเขตเวลา UTC แต่ "เวรเช้า" และ "Foley Day"
 * ต้องนับตามเวลาท้องถิ่นของหอผู้ป่วย มิฉะนั้นการประเมินเวรดึกหลังเที่ยงคืน
 * จะถูกนับเป็นคนละวันกับที่พยาบาลเข้าใจ
 */

export type Shift = 'MORNING' | 'AFTERNOON' | 'NIGHT';

export const SHIFT_LABEL_TH: Record<Shift, string> = {
  MORNING: 'เวรเช้า',
  AFTERNOON: 'เวรบ่าย',
  NIGHT: 'เวรดึก',
};

const BANGKOK_OFFSET_MS = 7 * 60 * 60 * 1000;

/** แปลงเวลาเป็นส่วนประกอบวัน/ชั่วโมงตามเวลาไทย */
function bangkokParts(at: Date): { y: number; m: number; d: number; hour: number } {
  const shifted = new Date(at.getTime() + BANGKOK_OFFSET_MS);
  return {
    y: shifted.getUTCFullYear(),
    m: shifted.getUTCMonth() + 1,
    d: shifted.getUTCDate(),
    hour: shifted.getUTCHours(),
  };
}

/** วันที่ตามเวลาไทยในรูปแบบ YYYY-MM-DD (ค.ศ.) */
export function bangkokDateString(at: Date = new Date()): string {
  const { y, m, d } = bangkokParts(at);
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

/**
 * เวรตามเวลาไทย
 *   เช้า 07:00–14:59 · บ่าย 15:00–22:59 · ดึก 23:00–06:59
 */
export function currentShift(at: Date = new Date()): Shift {
  const { hour } = bangkokParts(at);
  if (hour >= 7 && hour < 15) return 'MORNING';
  if (hour >= 15 && hour < 23) return 'AFTERNOON';
  return 'NIGHT';
}

/**
 * ช่วงเวลาของเวรปัจจุบัน ใช้ตรวจว่า episode ถูกประเมินในเวรนี้แล้วหรือยัง
 * เวรดึกคร่อมเที่ยงคืน จึงคำนวณจากจุดเริ่มย้อนหลังแทนการอิงวันที่
 */
export function currentShiftWindow(at: Date = new Date()): { start: Date; end: Date } {
  const { hour } = bangkokParts(at);
  let startHour: number;
  let durationHours: number;

  if (hour >= 7 && hour < 15) {
    startHour = 7;
    durationHours = 8;
  } else if (hour >= 15 && hour < 23) {
    startHour = 15;
    durationHours = 8;
  } else {
    startHour = 23;
    durationHours = 8;
  }

  // หาเวลา 00:00 ของวันไทยปัจจุบันในหน่วย UTC
  const { y, m, d } = bangkokParts(at);
  const bangkokMidnightUtc = Date.UTC(y, m - 1, d) - BANGKOK_OFFSET_MS;

  let start = bangkokMidnightUtc + startHour * 60 * 60 * 1000;
  // เวรดึกช่วง 00:00–06:59 เริ่มตั้งแต่ 23:00 ของ "เมื่อวาน"
  if (startHour === 23 && hour < 7) {
    start -= 24 * 60 * 60 * 1000;
  }

  return {
    start: new Date(start),
    end: new Date(start + durationHours * 60 * 60 * 1000),
  };
}

/**
 * Foley Day — วันที่เท่าไรของการคาสาย นับวันที่ใส่เป็นวันที่ 1
 * รับ insertDate เป็นสตริง YYYY-MM-DD จากคอลัมน์ date ของ Postgres
 */
export function foleyDay(insertDate: string, at: Date = new Date()): number {
  const [y, m, d] = insertDate.split('-').map(Number);
  if (!y || !m || !d) return 0;
  const insertUtc = Date.UTC(y, m - 1, d);
  const { y: ty, m: tm, d: td } = bangkokParts(at);
  const todayUtc = Date.UTC(ty, tm - 1, td);
  const days = Math.floor((todayUtc - insertUtc) / (24 * 60 * 60 * 1000));
  return Math.max(0, days) + 1;
}

/** แปลงวันที่ ค.ศ. เป็นข้อความไทย พ.ศ. เช่น "10 ส.ค. 2568" */
const THAI_MONTHS = [
  'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
  'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.',
];

export function formatThaiDate(isoDate: string): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  if (!y || !m || !d) return isoDate;
  return `${d} ${THAI_MONTHS[m - 1]} ${y + 543}`;
}

/** เวลาไทยแบบ HH:MM */
export function formatThaiTime(at: Date): string {
  const shifted = new Date(at.getTime() + BANGKOK_OFFSET_MS);
  const hh = String(shifted.getUTCHours()).padStart(2, '0');
  const mm = String(shifted.getUTCMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}
