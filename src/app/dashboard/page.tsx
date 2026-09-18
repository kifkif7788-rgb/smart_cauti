import { DashboardView } from '@/components/DashboardView';
import { foleyTrend, passRateTrend } from '@/lib/dashboard';
import { redirect } from 'next/navigation';
import { getSession, dashboardScope } from '@/lib/auth';
import { getActiveStudy } from '@/lib/study';
import { db } from '@/lib/db';
import type { AssessmentRow } from '@/types/database';
import { periodWindow, isPeriod, foleyDay, type Period } from '@/lib/shift';

export default async function DashboardPage(props: PageProps<'/dashboard'>) {
  const session = await getSession();
  if (!session) redirect('/login');

  const study = await getActiveStudy();

  // พยาบาลและผู้ช่วยเหลือคนไข้เห็นเฉพาะส่วนที่ใช้ดูแลผู้ป่วยตรงหน้า
  // จึงไม่ต้องดึงผลการประเมินซึ่งใช้เฉพาะในภาพรวมสำหรับผู้กำกับคุณภาพ
  const scope = dashboardScope(session.role);

  const wardCodes = session.wardCodes.length > 0 ? session.wardCodes : [study.ward_code];

  const search = await props.searchParams;
  const period: Period = isPeriod(search.period) ? search.period : 'day';

  const { data: episodes } = await db()
    .from('episode')
    .select('*')
    .eq('is_active', true)
    .in('ward_code', wardCodes);

  if (!episodes) throw new Error('ไม่สามารถโหลดข้อมูลหอผู้ป่วยได้');
  const list = episodes;
  const { start, end } = periodWindow(period);
  const { data: assessments, error: assessmentError } = scope === 'FULL' && list.length ? await db()
    .from('assessment').select('*').in('episode_id', list.map(e => e.episode_id))
    .eq('source', 'NURSE').eq('study_mode', study.current_mode)
    .gte('assessed_at', start.toISOString()).lt('assessed_at', end.toISOString())
    .order('assessed_at', { ascending: false }) : { data: [], error: null };
  if (assessmentError) throw new Error('ไม่สามารถโหลดผลการประเมินได้');
  // รายวันดูสถานะล่าสุดของผู้ป่วยแต่ละราย ส่วนรายเดือน/รายปีนับทุกครั้งที่ประเมิน
  // มิฉะนั้นข้อมูลทั้งเดือนจะเหลือรายละหนึ่งแถวและสัดส่วนที่ได้จะไม่สะท้อนการปฏิบัติจริง
  let rows = assessments ?? [];
  if (period === 'day') {
    const latest = new Map<string, AssessmentRow>();
    for (const row of rows) if (!latest.has(row.episode_id)) latest.set(row.episode_id, row);
    rows = [...latest.values()];
  }
  const pass = rows.filter(a => a.all_pass).length;
  const correct = rows.filter(a => a.feedback === 'CORRECT_NOW').length;
  const review = rows.filter(a => a.feedback === 'REVIEW_REMOVAL' || a.feedback === 'CLOSED_BREACH').length;
  const percent = rows.length ? Math.round(pass / rows.length * 100) : null;
  const colors = ['#2ebd87', '#389df4', '#ffbe2b', '#9770e4', '#ef7e9f', '#0b93a8', '#5a9316', '#d2701a'];
  // ใช้การประเมินทุกครั้งในช่วง ไม่ใช่ rows ที่รายวันถูกยุบเหลือรายละแถว
  const passTrend = passRateTrend(assessments ?? [], period);
  const dates = foleyTrend([]);
  const { data: history, error: historyError } = await db().from('episode')
    .select('insert_date, remove_date').in('ward_code', wardCodes)
    .lte('insert_date', dates[6].date)
    .or(`remove_date.is.null,remove_date.gte.${dates[0].date}`);
  const trend = foleyTrend(history ?? []);
  const peak = Math.max(1, ...trend.map(p => p.count));
  const longStay = list.filter((e) => foleyDay(e.insert_date) > 3);

  return <DashboardView scope={scope} period={period} passTrend={passTrend} wardCodes={wardCodes} list={list} rows={rows} pass={pass} correct={correct} review={review} percent={percent} colors={colors} trend={trend} peak={peak} longStay={longStay} historyError={Boolean(historyError)} />;
}
