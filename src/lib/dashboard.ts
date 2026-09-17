import {
  bangkokDateString,
  todayShiftWindows,
  periodWindow,
  SHIFT_LABEL_TH,
  type Period,
} from './shift';

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
