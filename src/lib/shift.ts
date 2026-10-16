/**
 * เวรและการคำนวณวันคาสาย — ใช้เขตเวลาไทย (Asia/Bangkok, UTC+7) เสมอ
 *
 * เซิร์ฟเวอร์อาจรันในเขตเวลา UTC แต่ "เวรเช้า" และ "Foley Day"
 * ต้องนับตามเวลาท้องถิ่นของหอผู้ป่วย มิฉะนั้นการประเมินเวรบ่ายหลังเที่ยงคืน
 * จะถูกนับเป็นคนละวันกับที่พยาบาลเข้าใจ
 */

export type Shift = 'MORNING' | 'AFTERNOON' | 'NIGHT';

export const SHIFT_LABEL_TH: Record<Shift, string> = {
  MORNING: 'เวรเช้า',
  AFTERNOON: 'เวรบ่าย',
  NIGHT: 'เวรดึก',
};

/** ช่วงเวลาของแต่ละเวรตามที่หอผู้ป่วยเขียนในตารางเวร */
export const SHIFT_TIME_TH: Record<Shift, string> = {
  MORNING: '08.01–16.00',
  AFTERNOON: '16.01–00.00',
  NIGHT: '00.01–08.00',
};

const BANGKOK_OFFSET_MS = 7 * 60 * 60 * 1000;
const MINUTE_MS = 60 * 1000;
const DAY_MS = 24 * 60 * MINUTE_MS;

/**
 * จุดเริ่มของแต่ละเวร นับเป็นนาทีจากเที่ยงคืนตามเวลาไทย
 *
 * ตารางเวรเขียนปลายช่วงแบบรวมนาทีนั้นด้วย (เช่น เวรดึก 00.01–08.00)
 * นาที 08.00 จึงยังเป็นของเวรดึก และเวรเช้าเริ่มจริงที่ 08.01
 * ทุกเวรยาวเท่ากัน 8 ชั่วโมง และต่อกันสนิทไม่มีช่องว่าง
 */
const SHIFT_LENGTH_MIN = 8 * 60;
const NIGHT_START_MIN = 1; // 00:01
const MORNING_START_MIN = NIGHT_START_MIN + SHIFT_LENGTH_MIN; // 08:01
const AFTERNOON_START_MIN = MORNING_START_MIN + SHIFT_LENGTH_MIN; // 16:01

/** แปลงเวลาเป็นส่วนประกอบวัน/นาทีที่ของวันตามเวลาไทย */
function bangkokParts(at: Date): {
  y: number;
  m: number;
  d: number;
  hour: number;
  minuteOfDay: number;
} {
  const shifted = new Date(at.getTime() + BANGKOK_OFFSET_MS);
  const hour = shifted.getUTCHours();
  return {
    y: shifted.getUTCFullYear(),
    m: shifted.getUTCMonth() + 1,
    d: shifted.getUTCDate(),
    hour,
    minuteOfDay: hour * 60 + shifted.getUTCMinutes(),
  };
}

/** วันที่ตามเวลาไทยในรูปแบบ YYYY-MM-DD (ค.ศ.) */
export function bangkokDateString(at: Date = new Date()): string {
  const { y, m, d } = bangkokParts(at);
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

/**
 * เวรตามเวลาไทย
 *   เช้า 08.01–16.00 · บ่าย 16.01–00.00 · ดึก 00.01–08.00
 */
export function currentShift(at: Date = new Date()): Shift {
  const { minuteOfDay } = bangkokParts(at);
  if (minuteOfDay >= MORNING_START_MIN && minuteOfDay < AFTERNOON_START_MIN) return 'MORNING';
  // นาที 00.00 เป็นนาทีสุดท้ายของเวรบ่ายที่เริ่มเมื่อวาน ไม่ใช่ต้นเวรดึก
  if (minuteOfDay >= AFTERNOON_START_MIN || minuteOfDay < NIGHT_START_MIN) return 'AFTERNOON';
  return 'NIGHT';
}

/**
 * ทั้งสามเวรของ "วันทำงานวันนี้" เรียงตามลำดับเวลา
 *
 * วันทำงานเริ่มที่เวรดึก 00.01 และจบตอน 00.00 ของวันถัดไป
 * จึงตรงกับวันตามปฏิทินไทยที่พยาบาลเขียนในตารางเวร
 */
export function todayShiftWindows(
  at: Date = new Date(),
): { shift: Shift; start: Date; end: Date }[] {
  const { y, m, d, minuteOfDay } = bangkokParts(at);
  const midnightUtc = Date.UTC(y, m - 1, d) - BANGKOK_OFFSET_MS;
  // เวลา 00.00 พอดียังเป็นนาทีสุดท้ายของวันทำงานที่เริ่มเมื่อวาน
  const base = minuteOfDay < NIGHT_START_MIN ? midnightUtc - DAY_MS : midnightUtc;

  const window = (shift: Shift, startMin: number) => ({
    shift,
    start: new Date(base + startMin * MINUTE_MS),
    end: new Date(base + (startMin + SHIFT_LENGTH_MIN) * MINUTE_MS),
  });

  return [
    window('NIGHT', NIGHT_START_MIN),
    window('MORNING', MORNING_START_MIN),
    window('AFTERNOON', AFTERNOON_START_MIN),
  ];
}

/**
 * ช่วงเวลาของเวรปัจจุบัน ใช้ตรวจว่า episode ถูกประเมินในเวรนี้แล้วหรือยัง
 * เวรบ่ายจบที่ 00.00 จึงล้ำเข้าวันถัดไปหนึ่งนาที ต้องเผื่อกรณีนั้นด้วย
 */
export function currentShiftWindow(at: Date = new Date()): { start: Date; end: Date } {
  const match = todayShiftWindows(at).find((w) => w.start <= at && at < w.end);
  if (match) return { start: match.start, end: match.end };

  // นาที 00.00 ตกอยู่ในเวรบ่ายของวันทำงานก่อนหน้า
  const previous = todayShiftWindows(new Date(at.getTime() - DAY_MS));
  const last = previous[previous.length - 1];
  return { start: last.start, end: last.end };
}

// ── ช่วงเวลาสำหรับรายงาน ────────────────────────────────────────────

export type Period = 'day' | 'month' | 'year';

export const PERIOD_LABEL: Record<Period, string> = {
  day: 'รายวัน',
  month: 'รายเดือน',
  year: 'รายปี',
};

export const PERIOD_SCOPE: Record<Period, string> = {
  day: 'วันนี้',
  month: 'เดือนนี้',
  year: 'ปีนี้',
};

export function isPeriod(value: unknown): value is Period {
  return value === 'day' || value === 'month' || value === 'year';
}

/**
 * ช่วงเวลาที่ใช้สรุปรายงาน ตามเขตเวลาไทย
 *
 * รายวันใช้ขอบเขตเดียวกับวันทำงาน (00.01 ถึง 00.00 ของวันถัดไป)
 * เพื่อให้ตัวเลขตรงกับหน้าติดตามความเสี่ยง ส่วนรายเดือนและรายปีใช้ขอบเขตปฏิทิน
 */
export function periodWindow(
  period: Period,
  at: Date = new Date(),
): { start: Date; end: Date } {
  if (period === 'day') {
    const shifts = todayShiftWindows(at);
    return { start: shifts[0].start, end: shifts[shifts.length - 1].end };
  }

  const { y, m } = bangkokParts(at);
  const startUtc =
    period === 'month' ? Date.UTC(y, m - 1, 1) : Date.UTC(y, 0, 1);
  const endUtc = period === 'month' ? Date.UTC(y, m, 1) : Date.UTC(y + 1, 0, 1);

  return {
    start: new Date(startUtc - BANGKOK_OFFSET_MS),
    end: new Date(endUtc - BANGKOK_OFFSET_MS),
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
