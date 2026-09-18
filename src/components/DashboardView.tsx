import Link from 'next/link';
import { UiIcon } from './UiIcon';
import { DashboardRefresh } from './DashboardRefresh';
import { AppHeader } from './AppHeader';
import { PERIOD_LABEL, PERIOD_SCOPE, type Period } from '@/lib/shift';
import type { PassRatePoint } from '@/lib/dashboard';
import { CHECK5_ITEMS } from '@/lib/check5';
import { foleyDay } from '@/lib/shift';
import type { AssessmentRow, EpisodeRow } from '@/types/database';
import type { DashboardScope } from '@/lib/auth-roles';

interface Props {
  /** CARE = เห็นเฉพาะส่วนที่ใช้ดูแลผู้ป่วยตรงหน้า ดู dashboardScope() */
  scope: DashboardScope;
  period: Period;
  passTrend: PassRatePoint[];
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

export function DashboardView({ scope, period, passTrend, wardCodes, list, rows, pass, correct, review, percent, colors, trend, peak, longStay, historyError }: Props) {
  const passedAll = rows.filter((a) => a.all_pass).length;

  // แถวเก่าก่อนมีการเก็บคุณวุฒิจะเป็น null จึงแยกไว้เป็นกลุ่มของตัวเอง
  const byLevel = (
    [
      { key: 'RN' as const, label: 'RN · พยาบาลวิชาชีพ', color: '#1272d6' },
      { key: 'NA' as const, label: 'NA · ผู้ช่วยเหลือคนไข้', color: '#0a9b79' },
      { key: null, label: 'ไม่ระบุคุณวุฒิ', color: 'var(--border)' },
    ] as const
  )
    .map((group) => {
      const matched = rows.filter((a) => a.nurse_level === group.key);
      return {
        label: group.label,
        color: group.color,
        count: matched.length,
        people: new Set(matched.map((a) => a.assessor_id)).size,
      };
    })
    .filter((group) => group.count > 0 || group.label !== 'ไม่ระบุคุณวุฒิ');

  return (
    <>
      <AppHeader title="Dashboard" backHref="/" subtitle={wardCodes.join(', ')} />
      <main className="dashboard-page mx-auto max-w-2xl px-4 pb-16 pt-4">
        <div className="mb-4"><h2 className="text-lg font-extrabold">ภาพรวมการดูแล · {wardCodes.join(', ')}</h2><p className="dashboard-subtitle">ข้อมูล ณ {new Intl.DateTimeFormat('th-TH', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Bangkok' }).format(new Date())} · <DashboardRefresh /></p>
          {scope === 'FULL' && (
            <nav className="period-tabs" aria-label="เลือกช่วงเวลา">
              {(Object.keys(PERIOD_LABEL) as Period[]).map((key) => (
                <Link key={key} href={`/dashboard?period=${key}`} aria-current={period === key ? 'page' : undefined}>
                  {PERIOD_LABEL[key]}
                </Link>
              ))}
            </nav>
          )}</div>
        {scope === 'FULL' && (<>
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
          <p className="dashboard-subtitle">{period === 'day' ? `สัดส่วนที่ผ่านทั้ง ${CHECK5_ITEMS.length} ข้อ จากผู้ป่วยที่ประเมินวันนี้` : `สัดส่วนที่ผ่านทั้ง ${CHECK5_ITEMS.length} ข้อ จากการประเมินทั้งหมด${PERIOD_SCOPE[period]}`}</p>
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
          <h2>สัดส่วนการประเมินครบทุกข้อ</h2>
          <p className="dashboard-subtitle">{TREND_CAPTION[period]} · รวม{PERIOD_SCOPE[period]} {rows.length} ครั้ง · ช่วงที่ไม่มีการประเมินจะเว้นว่าง</p>
          <PassRateChart points={passTrend} period={period} />
        </section>

        <section className="surface dashboard-card bundle-chart">
          <h2>ผู้ประเมินแยก RN / NA</h2>
          <p className="dashboard-subtitle">จำนวนครั้งที่ประเมิน และจำนวนคนที่ลงมือประเมินจริง</p>
          <CountBars
            bars={byLevel.map((b) => ({
              label: b.label,
              sub: `${b.people} คน`,
              value: b.count,
              color: b.color,
            }))}
          />
        </section>

        </>)}

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

/** แท่งเทียบจำนวน ใช้สเกลเดียวกันทุกแท่งเพื่อให้เทียบด้วยสายตาได้ */
function CountBars({
  bars,
}: {
  bars: { label: string; sub: string; value: number; color: string }[];
}) {
  const peak = Math.max(1, ...bars.map((b) => b.value));
  return (
    <>
      {bars.map((bar) => (
        <div className="chart-row" key={bar.label}>
          <span>
            {bar.label}
            <small className="block">{bar.sub}</small>
          </span>
          <div className="chart-track">
            <span style={{ width: `${(bar.value / peak) * 100}%`, background: bar.color }} />
          </div>
          <strong>{bar.value}</strong>
        </div>
      ))}
    </>
  );
}

const TREND_CAPTION: Record<Period, string> = {
  day: 'แยกตามเวร',
  month: 'แยกตามวันในเดือนนี้',
  year: 'แยกตามเดือนในปีนี้',
};

/**
 * สัดส่วนที่ผ่านครบทุกข้อ
 *
 * รายวันมีแค่สามเวรจึงใช้แท่งที่อ่านค่าทีละช่องได้ ส่วนรายเดือนและรายปี
 * มีจุดจำนวนมากและสิ่งที่ต้องดูคือทิศทาง จึงใช้เส้น
 *
 * ช่วงที่ยังไม่มีการประเมินจะไม่มีแท่งและไม่มีจุด ไม่ใช่ค่าศูนย์
 * เพราะศูนย์เปอร์เซ็นต์แปลว่าประเมินแล้วไม่ผ่าน คนละเรื่องกับยังไม่ได้ประเมิน
 */
function PassRateChart({ points, period }: { points: PassRatePoint[]; period: Period }) {
  const width = 350;
  const height = 150;
  const left = 30;
  const top = 12;
  const plot = height - top - 34;
  const asBars = period === 'day';

  const slot = (width - left - 12) / Math.max(1, points.length);
  const barWidth = Math.min(slot * 0.65, 26);
  const step = points.length > 1 ? (width - left - 12) / (points.length - 1) : 0;

  const centre = (i: number) => (asBars ? left + slot * i + slot / 2 : left + i * step);
  const y = (percent: number) => top + plot - (percent / 100) * plot;
  const withData = points
    .map((p, i) => ({ ...p, i }))
    .filter((p): p is typeof p & { percent: number } => p.percent !== null);

  // ป้ายแกนล่างจะชนกันเมื่อช่องเยอะ จึงเว้นระยะให้ยังอ่านออก
  const labelEvery = points.length > 14 ? 5 : 1;

  if (withData.length === 0) {
    return <p className="dashboard-subtitle text-center">ยังไม่มีผลการประเมินในช่วงนี้</p>;
  }

  return (
    <>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="mt-4 w-full"
        role="img"
        aria-label="สัดส่วนการประเมินที่ผ่านครบทุกข้อ รายละเอียดอยู่ใต้กราฟ"
      >
        {[0, 50, 100].map((tick) => (
          <g key={tick}>
            <path d={`M${left} ${y(tick)}H${width - 12}`} stroke="var(--border)" fill="none" />
            <text x={left - 6} y={y(tick) + 4} textAnchor="end" fontSize="10" fill="var(--muted)">
              {tick}
            </text>
          </g>
        ))}

        {asBars
          ? withData.map((p) => (
              <rect
                key={p.i}
                x={centre(p.i) - barWidth / 2}
                y={y(p.percent)}
                width={barWidth}
                height={Math.max(1, top + plot - y(p.percent))}
                rx="3"
                fill="#2ebd87"
              />
            ))
          : (
            <>
              <polyline
                points={withData.map((p) => `${centre(p.i)},${y(p.percent)}`).join(' ')}
                stroke="#2ebd87"
                strokeWidth="2.5"
                fill="none"
              />
              {withData.map((p) => (
                <circle key={p.i} cx={centre(p.i)} cy={y(p.percent)} r="3.5" fill="#2ebd87" />
              ))}
            </>
          )}

        {points.length <= 14 &&
          withData.map((p) => (
            <text
              key={`v-${p.i}`}
              x={centre(p.i)}
              y={y(p.percent) - 6}
              textAnchor="middle"
              fontSize="10"
              fill="var(--text)"
            >
              {p.percent}
            </text>
          ))}

        {points.map((p, i) =>
          i % labelEvery === 0 ? (
            <text
              key={`${p.label}-${i}`}
              x={centre(i)}
              y={height - 12}
              textAnchor="middle"
              fontSize="10"
              fill="var(--muted)"
            >
              {p.label}
            </text>
          ) : null,
        )}
      </svg>
      <ul className="sr-only">
        {points.map((p, i) => (
          <li key={`${p.label}-${i}`}>
            {p.label}:{' '}
            {p.percent === null ? 'ยังไม่มีการประเมิน' : `${p.percent}% (${p.passed}/${p.total})`}
          </li>
        ))}
      </ul>
    </>
  );
}
