import {
  bangkokDateString,
  todayShiftWindows,
  periodWindow,
  SHIFT_LABEL_TH,
  type Period,
} from './shift';
import type { NurseLevelDb } from '@/types/database';

/** Counts catheter episodes present at any point on each Thai calendar day.
 * Ward attribution follows the episode's stored ward, not historical transfers.
 */
export function foleyTrend(episodes: { insert_date: string; remove_date: string | null }[], now = new Date()) {
  const today = bangkokDateString(now);
  return Array.from({ length: 7 }, (_, index) => {
    const day = new Date(`${today}T12:00:00+07:00`);
    day.setUTCDate(day.getUTCDate() - (6 - index));
    const date = bangkokDateString(day);
    return { date, count: episodes.filter(e => e.insert_date <= date && (!e.remove_date || e.remove_date >= date)).length };
  });
}

// ── สัดส่วนการประเมินที่ผ่านครบทุกข้อ แยกตามช่วงย่อย ────────────────

export interface PassRatePoint {
  label: string;
  total: number;
  passed: number;
  /** null = ช่วงนั้นยังไม่มีการประเมิน จึงไม่มีสัดส่วนให้คิด */
  percent: number | null;
}

/**
 * แบ่งช่วงย่อยตามช่วงที่เลือกดู
 *   รายวัน  → สามเวรของวันนั้น
 *   รายเดือน → รายวันตลอดเดือน
 *   รายปี   → รายเดือนตลอดปี
 */
export function passRateTrend(
  rows: { assessed_at: string; all_pass: boolean }[],
  period: Period,
  at: Date = new Date(),
): PassRatePoint[] {
  const point = (label: string, matched: typeof rows): PassRatePoint => {
    const passed = matched.filter((r) => r.all_pass).length;
    return {
      label,
      total: matched.length,
      passed,
      percent: matched.length ? Math.round((passed / matched.length) * 100) : null,
    };
  };

  if (period === 'day') {
    return todayShiftWindows(at).map(({ shift, start, end }) =>
      point(
        SHIFT_LABEL_TH[shift],
        rows.filter((r) => {
          const t = new Date(r.assessed_at);
          return t >= start && t < end;
        }),
      ),
    );
  }

  const { start } = periodWindow(period, at);
  const [year, month] = bangkokDateString(start).split('-').map(Number);

  if (period === 'month') {
    const days = new Date(Date.UTC(year, month, 0)).getUTCDate();
    return Array.from({ length: days }, (_, i) => {
      const date = `${year}-${String(month).padStart(2, '0')}-${String(i + 1).padStart(2, '0')}`;
      return point(String(i + 1), rows.filter((r) => bangkokDateString(new Date(r.assessed_at)) === date));
    });
  }

  return Array.from({ length: 12 }, (_, i) => {
    const prefix = `${year}-${String(i + 1).padStart(2, '0')}`;
    return point(
      String(i + 1),
      rows.filter((r) => bangkokDateString(new Date(r.assessed_at)).startsWith(prefix)),
    );
  });
}

// ── ผู้ประเมินรายคน ──────────────────────────────────────────────────

export interface AssessorTally {
  /** รหัสพนักงาน — สิ่งที่หัวหน้าหอกับ IC ใช้อ้างอิงตัวบุคคล ไม่ใช่ user_id */
  employeeId: string;
  fullName: string;
  /** คุณวุฒิที่บันทึกไว้ตอนประเมิน ไม่ใช่คุณวุฒิที่ผูกกับบัญชีวันนี้ */
  level: NurseLevelDb | null;
  count: number;
}

/**
 * นับการประเมินแยกเป็นรายคน เพื่อแสดงว่าใครเป็นผู้ประเมินในช่วงนั้น
 *
 * จับคู่เป็น (คน, คุณวุฒิ) ไม่ใช่รายคนล้วน เพราะคนเดียวประเมินในคุณวุฒิ
 * ต่างกันได้ ยอดรวมของรายชื่อจึงตรงกับแท่ง RN/NA เสมอ
 *
 * เรียงจากมากไปน้อย แล้วจึงเรียงด้วยรหัสพนักงานให้ลำดับคงที่ทุกครั้งที่เปิด
 */
export function assessorTally(
  rows: { assessor_id: string; nurse_level: NurseLevelDb | null }[],
  users: { user_id: string; employee_id: string; full_name: string }[],
): AssessorTally[] {
  const byId = new Map(users.map((u) => [u.user_id, u]));
  const tally = new Map<string, AssessorTally>();

  for (const row of rows) {
    const key = `${row.assessor_id}|${row.nurse_level ?? ''}`;
    const found = tally.get(key);
    if (found) {
      found.count += 1;
      continue;
    }
    const user = byId.get(row.assessor_id);
    tally.set(key, {
      // บัญชีที่ถูกลบไปแล้วยังมีการประเมินค้างอยู่ ต้องไม่ทำให้รายการหาย
      employeeId: user?.employee_id ?? '—',
      fullName: user?.full_name ?? 'ไม่พบบัญชีผู้ใช้',
      level: row.nurse_level,
      count: 1,
    });
  }

  return [...tally.values()].sort(
    (a, b) => b.count - a.count || a.employeeId.localeCompare(b.employeeId, 'th'),
  );
}
