import Link from 'next/link';
import { UiIcon } from './UiIcon';
import { DashboardRefresh } from './DashboardRefresh';
import { AppHeader } from './AppHeader';
import { PERIOD_LABEL, PERIOD_SCOPE, type Period } from '@/lib/shift';
import { CHECK5_ITEMS } from '@/lib/check5';
import { foleyDay } from '@/lib/shift';
import type { AssessmentRow, EpisodeRow } from '@/types/database';

interface Props {
  period: Period;
  wardCodes: string[];
  list: EpisodeRow[];
  rows: AssessmentRow[];
  pass: number;
  correct: number;
  review: number;
  percent: number | null;
  colors: string[];
  trend: { date: string; count: number }[];
  peak: number;
  longStay: EpisodeRow[];
  historyError: boolean;
}

export function DashboardView({ period, wardCodes, list, rows, pass, correct, review, percent, colors, trend, peak, longStay, historyError }: Props) {
  return (
    <>
      <AppHeader title="Dashboard" backHref="/" subtitle={wardCodes.join(', ')} />
      <main className="dashboard-page mx-auto max-w-2xl px-4 pb-16 pt-4">
        <div className="mb-4"><h2 className="text-lg font-extrabold">ภาพรวมการดูแล · {wardCodes.join(', ')}</h2><p className="dashboard-subtitle">ข้อมูล ณ {new Intl.DateTimeFormat('th-TH', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Bangkok' }).format(new Date())} · <DashboardRefresh /></p>
          <nav className="period-tabs" aria-label="เลือกช่วงเวลา">
            {(Object.keys(PERIOD_LABEL) as Period[]).map((key) => (
              <Link key={key} href={`/dashboard?period=${key}`} aria-current={period === key ? 'page' : undefined}>
                {PERIOD_LABEL[key]}
              </Link>
            ))}
          </nav></div>
        <div className="dashboard-metrics grid grid-cols-2 gap-3">
          <div className="surface text-center"><div className="metric-label">ผู้ป่วยที่ใส่ Foley</div><div className="metric-value">{list.length}<small>ราย</small></div></div>
          <div className="surface text-center"><div className="metric-label">Foley &gt; 3 วัน</div><div className="metric-value metric-review">{longStay.length}<small>ราย</small></div></div>
        </div>

        <div className="risk-grid">
          <div style={{ background: 'var(--pass-bg)', color: 'var(--pass)' }}><div className="risk-label"><span style={{ background: 'var(--pass)' }}><UiIcon name="check"/></span>ผ่านเกณฑ์</div><strong>{pass} <small className="text-xs">ราย</small></strong></div>
          <div style={{ background: 'var(--correct-bg)', color: 'var(--correct)' }}><div className="risk-label"><span style={{ background: 'var(--correct)' }}><UiIcon name="alert"/></span>ต้องแก้ไข</div><strong>{correct} <small className="text-xs">ราย</small></strong></div>
          <div style={{ background: 'var(--review-bg)', color: 'var(--review)' }}><div className="risk-label"><span style={{ background: 'var(--review)' }}><UiIcon name="alert"/></span>ต้องทบทวน</div><strong>{review} <small className="text-xs">ราย</small></strong></div>
        </div>
        <p className="dashboard-subtitle">{period === 'day'
          ? `ผลล่าสุด${PERIOD_SCOPE[period]} · ประเมินแล้ว ${rows.length}/${list.length} ราย · ยังไม่ประเมิน ${list.length - rows.length} ราย`
          : `รวมการประเมิน${PERIOD_SCOPE[period]} ${rows.length} ครั้ง`}</p>
        <section className="surface dashboard-card">
          <h2>ความครอบคลุมการดูแล (Bundle Compliance)</h2>
          <p className="dashboard-subtitle">{period === 'day' ? 'สัดส่วนที่ผ่านทั้ง 5 ข้อ จากผู้ป่วยที่ประเมินวันนี้' : `สัดส่วนที่ผ่านทั้ง 5 ข้อ จากการประเมินทั้งหมด${PERIOD_SCOPE[period]}`}</p>
          <div className="compliance-layout">
            <div className="compliance-ring" role="img" aria-label={percent === null ? 'ยังไม่มีข้อมูล' : `ผ่านเกณฑ์ ${percent}%`} style={{ background: percent === null ? 'var(--border)' : `conic-gradient(#2ebd87 ${percent}%, #f47795 0)` }}><strong>{percent === null ? '—' : `${percent}%`}</strong></div>
            <div className="chart-legend"><p><i style={{ background: '#2ebd87' }}/>ผ่าน {percent === null ? '—' : `${percent}%`}</p><p><i style={{ background: '#f47795' }}/>ไม่ผ่าน {percent === null ? '—' : `${100 - percent}%`}</p></div>
          </div>
          {percent === null && <p className="dashboard-subtitle text-center">ยังไม่มีผลการประเมิน{PERIOD_SCOPE[period]}</p>}
        </section>
        <section className="surface dashboard-card bundle-chart">
          <h2>ผลการประเมินรายข้อ</h2>
          {CHECK5_ITEMS.map((item, index) => {
            const value = rows.length ? Math.round(rows.filter(a => a[item.key]).length / rows.length * 100) : null;
            return <div className="chart-row" key={item.key}><span>{item.label}<small className="block">{item.labelTh}</small></span><div className="chart-track"><span style={{ width: `${value ?? 0}%`, background: colors[index] }}/></div><strong>{value === null ? '—' : `${value}%`}</strong></div>;
          })}
        </section>

        <section className="surface dashboard-card">
          <h2>จำนวนผู้ป่วยที่ใส่ Foley รายวัน (7 วันล่าสุด)</h2>
          <p className="dashboard-subtitle">นับรายที่มีสายในวันนั้น รวมวันถอด · ตามหอผู้ป่วยที่บันทึกปัจจุบัน</p>
          {historyError ? <p role="alert" className="mt-4 text-sm">โหลดข้อมูลย้อนหลังไม่สำเร็จ กรุณาอัปเดตข้อมูลอีกครั้ง</p> : <>
          <svg viewBox="0 0 350 130" className="mt-5 w-full" role="img" aria-label="แนวโน้มผู้ป่วยใส่สายสวน 7 วัน รายละเอียดอยู่ใต้กราฟ">
            <path d="M25 100H325" stroke="var(--border)" fill="none"/>
            <polyline points={trend.map((p,i) => `${25+i*50},${95-p.count/peak*65}`).join(' ')} stroke="#168ced" strokeWidth="3" fill="none"/>
            {trend.map((p,i) => <g key={p.date}><circle cx={25+i*50} cy={95-p.count/peak*65} r="4" fill="#168ced"/><text x={25+i*50} y={83-p.count/peak*65} textAnchor="middle" fontSize="12" fill="var(--text)">{p.count}</text><text x={25+i*50} y="120" textAnchor="middle" fontSize="10" fill="var(--muted)">{p.date.slice(8)}/{p.date.slice(5,7)}</text></g>)}
          </svg>
          <ul className="sr-only">{trend.map(p => <li key={p.date}>{p.date}: {p.count} ราย</li>)}</ul>
          </>}
        </section>

        {longStay.length > 0 && (
          <section className="mt-5">
            <h2 className="mb-2 text-base font-extrabold">ควรทบทวนข้อบ่งชี้</h2>
            <ul className="space-y-2">
              {longStay.map((e) => (
                <li key={e.episode_id} className="surface flex items-center gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="font-bold">
                      เตียง {e.bed_no}
                      <span className="ml-2 text-sm font-normal" style={{ color: 'var(--muted)' }}>
                        {e.study_code}
                      </span>
                    </div>
                  </div>
                  <span
                    className="shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold tabular-nums"
                    style={{ background: 'var(--correct-bg)', color: 'var(--correct)' }}
                  >
                    วันที่ {foleyDay(e.insert_date)}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        <Link href="/" className="home-return">
          <UiIcon name="home"/> กลับหน้าหลัก
        </Link>
      </main>
    </>
  );
}
