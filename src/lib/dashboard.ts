import { bangkokDateString } from './shift';

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
