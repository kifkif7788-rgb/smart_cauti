import type { Check5Result } from '@/lib/check5';
import { BundleIcon, UiIcon } from './UiIcon';

const BANNER = {
  PASS: {
    bg: 'var(--pass-bg)',
    fg: 'var(--pass)',
    title: 'ผ่านเกณฑ์ทุกข้อ',
    detail: 'ดูแลต่อเนื่องตามแนวทาง',
  },
  CORRECT_NOW: {
    bg: 'var(--correct-bg)',
    fg: 'var(--correct)',
    title: 'พบข้อที่ต้องแก้ไข',
    detail: 'กรุณาดำเนินการแก้ไข ณ จุดดูแล แล้วบันทึกผล',
  },
  REVIEW_REMOVAL: {
    bg: 'var(--review-bg)',
    fg: 'var(--review)',
    title: 'ควรทบทวนความจำเป็นของสายสวน',
    detail: 'ไม่พบข้อบ่งชี้ในการคาสาย — ทบทวนกับทีมผู้ดูแล',
  },
  CLOSED_BREACH: {
    bg: 'var(--review-bg)',
    fg: 'var(--review)',
    title: 'ระบบปิดไม่สมบูรณ์',
    detail: 'ดำเนินการตาม protocol ของหน่วยงานและรายงานทีม',
  },
} as const;

export function AssessmentFeedback({ result }: { result: Check5Result }) {
  const banner = BANNER[result.feedback];
  return (<>
        {/* ── แถบผลรวม ─────────────────────────────────────────── */}
        <div
          className="result-banner"
          style={{ background: banner.bg, borderColor: banner.fg }}
        >
          <span className="result-status-icon" style={{ background: banner.fg }}><UiIcon name={result.allPass ? 'check' : 'alert'}/></span>
          <div>
            <h2 className="text-lg font-extrabold" style={{ color: banner.fg }}>
              {banner.title}
            </h2>
            <p className="mt-0.5 text-[13px] leading-relaxed">{banner.detail}</p>
            {result.failedItems.length > 0 && (
              <p className="mt-1 text-[13px] font-bold" style={{ color: banner.fg }}>
                ไม่ผ่าน {result.failedItems.length} ข้อ จาก 5 ข้อ
              </p>
            )}
          </div>
        </div>

        {/* ── คำแนะนำรายข้อ ────────────────────────────────────── */}
        {result.failedItems.length > 0 && (
          <section className="mt-4 space-y-3">
            {result.failedItems.map((item) => {
              const isReview = item.actionKind !== 'CORRECT_NOW';
              return (
                <article key={item.key} className="result-item" data-severity={isReview ? 'review' : 'correct'}>
                  <div className="result-item-heading"><BundleIcon name={item.key}/><div><h3>{item.order}. {item.label} : ไม่ใช่</h3><p>{item.actionTitle}</p></div></div>
                  <p className="result-advice"><strong>แนะนำ :</strong> {item.actionMessage}</p>
                </article>
              );
            })}
          </section>
        )}

        {/* ── คำเตือนทางคลินิก — ต้องแสดงเสมอเมื่อเป็น Review ─── */}
        {result.requiresEscalation && (
          <div
            className="mt-4 rounded-xl border-l-4 px-4 py-3 text-[13px] leading-relaxed"
            style={{ background: 'var(--review-bg)', borderColor: 'var(--review)' }}
          >
            <strong style={{ color: 'var(--review)' }}>ข้อควรทราบ</strong>
            {' — '}
            ระบบนี้เป็นเครื่องมือช่วยเตือน ไม่ทดแทนการตัดสินใจทางคลินิก
            การถอดสายให้เป็นไปตามคำสั่งแพทย์หรือ protocol ที่หน่วยงานอนุมัติเท่านั้น
          </div>
        )}

        {/* ── ข้อที่ผ่าน ───────────────────────────────────────── */}
        {result.failedItems.length < 5 && (
          <div className="result-pass"><span><UiIcon name="check"/></span><div><h3>{result.allPass ? 'ทั้ง 5 ข้อผ่านเกณฑ์' : 'ข้ออื่น ๆ ผ่านเกณฑ์'}</h3><p>ดูแลต่อเนื่องตามแนวทาง</p></div></div>
        )}

  </>);
}
