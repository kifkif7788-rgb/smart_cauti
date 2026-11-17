import { notFound } from 'next/navigation';
import Link from 'next/link';
import { AppHeader } from '@/components/AppHeader';
import { ScanHero, CareNote } from '@/components/Brand';
import { Check5Form } from '@/components/Check5Form';
import { AssessmentFeedback } from '@/components/AssessmentFeedback';
import { DashboardView } from '@/components/DashboardView';
import { UiIcon } from '@/components/UiIcon';
import { evaluateCheck5 } from '@/lib/check5';
import {
  DEMO_CHART_COLORS,
  DEMO_EPISODE_FOR_FORM,
  DEMO_TODAY,
  DEMO_WARD,
  demoAssessments,
  demoEpisodes,
  demoTrend,
} from '@/lib/demo-fixtures';

/** Local design review only. Synthetic fixtures never reach the database. */
export default async function DesignPreview({ searchParams }: { searchParams: Promise<{ screen?: string }> }) {
  if (process.env.NODE_ENV !== 'development') notFound();
  const { screen = 'home' } = await searchParams;
  const result = evaluateCheck5({ need: false, fix: true, flow: false, below: true, closed: true });
  const episodes = demoEpisodes();
  const rows = demoAssessments(episodes);
  return <>
    <nav className="preview-nav" aria-label="ตัวอย่างดีไซน์"><span>ตัวอย่างดีไซน์ · ข้อมูลสมมติ</span><div>{[['home','สแกน QR'],['check','CHECK 9'],['result','ผลลัพธ์'],['dashboard','Dashboard']].map(([key,label])=><Link key={key} href={`/design-preview?screen=${key}`} aria-current={screen===key?'page':undefined}>{label}</Link>)}</div></nav>
    {screen !== 'dashboard' && <AppHeader subtitle={DEMO_WARD}/>}
    {screen === 'home' && <main className="home-page mx-auto max-w-2xl px-4 pb-8 pt-4"><ScanHero/><CareNote/></main>}
    {screen === 'check' && <Check5Form preview episode={DEMO_EPISODE_FOR_FORM} today={DEMO_TODAY} nurseLevel="RN" studyMode="INTERVENTION" assessedThisShift={false}/>}
    {screen === 'result' && <main className="result-page mx-auto max-w-2xl px-4 pb-8 pt-4"><AssessmentFeedback result={result}/><button type="button" disabled className="btn-primary action-button-label mt-4 w-full"><UiIcon name="check"/>บันทึกการแก้ไขแล้ว</button><p className="mt-2 text-center text-xs text-[var(--muted)]">ตัวอย่างหน้าจอ · ปุ่มบันทึกปิดใช้งาน</p><Link className="home-return" href="/design-preview"><UiIcon name="home"/>กลับหน้าหลัก</Link><CareNote compact/></main>}
    {screen === 'dashboard' && <DashboardView scope="FULL" kitUses={4} period="day" passTrend={[{label:'เวรเช้า',total:4,passed:3,percent:75},{label:'เวรบ่าย',total:5,passed:4,percent:80},{label:'เวรดึก',total:0,passed:0,percent:null}]} wardCodes={[DEMO_WARD]} list={episodes} rows={rows} pass={9} correct={2} review={1} percent={75} colors={DEMO_CHART_COLORS} trend={demoTrend()} peak={12} longStay={[]} historyError={false}/>}
  </>;
}
