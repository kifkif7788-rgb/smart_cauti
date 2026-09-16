import { notFound } from 'next/navigation';
import Link from 'next/link';
import { AppHeader } from '@/components/AppHeader';
import { ScanHero, CareNote } from '@/components/Brand';
import { Check5Form } from '@/components/Check5Form';
import { AssessmentFeedback } from '@/components/AssessmentFeedback';
import { DashboardView } from '@/components/DashboardView';
import { UiIcon } from '@/components/UiIcon';
import { evaluateCheck5 } from '@/lib/check5';
import type { EpisodeRow, AssessmentRow } from '@/types/database';

/** Local design review only. Synthetic fixtures never reach the database. */
export default async function DesignPreview({ searchParams }: { searchParams: Promise<{ screen?: string }> }) {
  if (process.env.NODE_ENV !== 'development') notFound();
  const { screen = 'home' } = await searchParams;
  const result = evaluateCheck5({ need: false, fix: true, flow: false, below: true, closed: true });
  const episodes: EpisodeRow[] = Array.from({length:12},(_,i)=>({episode_id:`preview-${i}`,study_id:'preview',hn:'DEMO',study_code:`DEMO-${i}`,tag_code:null,ward_code:'หอผู้ป่วยตัวอย่าง',bed_no:String(i+1),insert_date:'2026-09-14',remove_date:null,removal_reason:null,is_active:true,created_by:'preview',closed_by:null,created_at:'2026-09-14T00:00:00Z'}));
  const rows: AssessmentRow[] = episodes.map((e,i)=>({assessment_id:e.episode_id,client_uuid:e.episode_id,episode_id:e.episode_id,assessor_id:'preview',source:'NURSE',nurse_level:i%2===0?'RN':'PN',study_mode:'INTERVENTION',assessed_at:'2026-09-15T00:00:00Z',shift:'MORNING',foley_day:2,need:i!==0,fix:i!==1,flow:i!==2,below:true,closed:true,all_pass:i>2,feedback:i===0?'REVIEW_REMOVAL':i<3?'CORRECT_NOW':'PASS',notes:null,created_at:'2026-09-15T00:00:00Z'}));
  return <>
    <nav className="preview-nav" aria-label="ตัวอย่างดีไซน์"><span>ตัวอย่างดีไซน์ · ข้อมูลสมมติ</span><div>{[['home','สแกน QR'],['check','CHECK 5'],['result','ผลลัพธ์'],['dashboard','Dashboard']].map(([key,label])=><Link key={key} href={`/design-preview?screen=${key}`} aria-current={screen===key?'page':undefined}>{label}</Link>)}</div></nav>
    {screen !== 'dashboard' && <AppHeader subtitle="หอผู้ป่วยตัวอย่าง"/>}
    {screen === 'home' && <main className="home-page mx-auto max-w-2xl px-4 pb-8 pt-4"><ScanHero showDashboard/><CareNote/></main>}
    {screen === 'check' && <Check5Form preview episode={{episodeId:'design-preview',hn:'DEMO-001',studyCode:'DEMO-001',bedNo:'3',wardCode:'ศัลยกรรมชาย',insertDate:'2026-09-13',insertDateTh:'13 ก.ย. 2569',foleyDay:3}} today="2026-09-16" studyMode="INTERVENTION" assessedThisShift={false}/>}
    {screen === 'result' && <main className="result-page mx-auto max-w-2xl px-4 pb-8 pt-4"><AssessmentFeedback result={result}/><button type="button" disabled className="btn-primary action-button-label mt-4 w-full"><UiIcon name="check"/>บันทึกการแก้ไขแล้ว</button><p className="mt-2 text-center text-xs text-[var(--muted)]">ตัวอย่างหน้าจอ · ปุ่มบันทึกปิดใช้งาน</p><Link className="home-return" href="/design-preview"><UiIcon name="home"/>กลับหน้าหลัก</Link><CareNote compact/></main>}
    {screen === 'dashboard' && <DashboardView period="day" wardCodes={['หอผู้ป่วยตัวอย่าง']} list={episodes} rows={rows} pass={9} correct={2} review={1} percent={75} colors={['#2ebd87','#389df4','#ffbe2b','#9770e4','#ef7e9f']} trend={[10,11,12,12,11,12,12].map((count,i)=>({date:`2026-09-${9+i}`,count}))} peak={12} longStay={[]} historyError={false}/>}
  </>;
}
