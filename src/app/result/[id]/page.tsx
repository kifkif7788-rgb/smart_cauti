import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { getSession } from '@/lib/auth';
import { getActiveStudy, shouldRevealFeedback } from '@/lib/study';
import { db } from '@/lib/db';
import { evaluateCheck5 } from '@/lib/check5';
import { CorrectiveActionPanel } from '@/components/CorrectiveActionPanel';
import { AppHeader } from '@/components/AppHeader';

const BANNER = {
  PASS: {
    bg: 'var(--pass-bg)',
    fg: 'var(--pass)',
    icon: '✅',
    title: 'ผ่านเกณฑ์ทุกข้อ',
    detail: 'ดูแลต่อเนื่องตามแนวทาง',
  },
  CORRECT_NOW: {
    bg: 'var(--correct-bg)',
    fg: 'var(--correct)',
    icon: '🔧',
    title: 'พบข้อที่ต้องแก้ไข',
    detail: 'กรุณาดำเนินการแก้ไข ณ จุดดูแล แล้วบันทึกผล',
  },
  REVIEW_REMOVAL: {
    bg: 'var(--review-bg)',
    fg: 'var(--review)',
    icon: '⚠️',
    title: 'ควรทบทวนความจำเป็นของสายสวน',
    detail: 'ไม่พบข้อบ่งชี้ในการคาสาย — ทบทวนกับทีมผู้ดูแล',
  },
  CLOSED_BREACH: {
    bg: 'var(--review-bg)',
    fg: 'var(--review)',
    icon: '⚠️',
    title: 'ระบบปิดไม่สมบูรณ์',
    detail: 'ดำเนินการตาม protocol ของหน่วยงานและรายงานทีม',
  },
} as const;

export default async function ResultPage(props: PageProps<'/result/[id]'>) {
  const session = await getSession();
  if (!session) redirect('/login');

  const { id } = await props.params;

  const { data: assessment } = await db()
    .from('assessment')
    .select('*')
    .eq('assessment_id', id)
    .maybeSingle();

  if (!assessment) notFound();

  const study = await getActiveStudy();

  // ประตูเดียวกับฝั่ง API — ถ้าไม่ควรเห็น feedback ก็ไม่เรนเดอร์หน้านี้
  if (!shouldRevealFeedback(study.current_mode, session.role)) {
    redirect('/?saved=1');
  }

  const result = evaluateCheck5({
    need: assessment.need,
    fix: assessment.fix,
    flow: assessment.flow,
    below: assessment.below,
    closed: assessment.closed,
  });

  const banner = BANNER[result.feedback];

  const { data: existingAction } = await db()
    .from('corrective_action')
    .select('action_id, status')
    .eq('assessment_id', id)
    .maybeSingle();

  return (
    <>
      <AppHeader title="ผลการประเมิน" backHref="/" />

      <main className="mx-auto max-w-2xl px-4 pb-16 pt-4">
        {/* ── แถบผลรวม ─────────────────────────────────────────── */}
        <div
          className="flex items-start gap-3 rounded-2xl border-l-4 px-4 py-4"
          style={{ background: banner.bg, borderColor: banner.fg }}
        >
          <span className="text-2xl leading-none" aria-hidden="true">{banner.icon}</span>
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
                <article key={item.key} className="surface overflow-hidden">
                  <div
                    className="flex items-center gap-2.5 px-4 py-2.5"
                    style={{ background: isReview ? 'var(--review-bg)' : 'var(--correct-bg)' }}
                  >
                    <span
                      className="flex h-6 w-6 items-center justify-center rounded-md text-xs font-extrabold text-white"
                      style={{ background: isReview ? 'var(--review)' : 'var(--correct)' }}
                    >
                      {item.order}
                    </span>
                    <span className="text-sm font-extrabold">{item.label}</span>
                    <span
                      className="ml-auto rounded-full px-2.5 py-0.5 text-[11px] font-bold"
                      style={{
                        background: isReview ? 'var(--review)' : 'var(--correct)',
                        color: '#fff',
                      }}
                    >
                      {item.actionTitle}
                    </span>
                  </div>
                  <p className="px-4 py-3 text-[14px] leading-relaxed">{item.actionMessage}</p>
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
        {result.allPass && (
          <p
            className="mt-4 rounded-xl px-4 py-4 text-center text-sm font-semibold"
            style={{ background: 'var(--pass-bg)', color: 'var(--pass)' }}
          >
            ทั้ง 5 ข้อผ่านเกณฑ์ — ขอบคุณที่ดูแลอย่างต่อเนื่อง
          </p>
        )}

        {/* ── การบันทึกการแก้ไข ────────────────────────────────── */}
        {result.failedItems.length > 0 && (
          <CorrectiveActionPanel
            assessmentId={id}
            failedItems={result.failedItems}
            requiresEscalation={result.requiresEscalation}
            alreadyRecorded={existingAction?.status ?? null}
          />
        )}

        <Link
          href="/"
          className="surface mt-4 block px-4 py-4 text-center text-[15px] font-bold"
        >
          เสร็จสิ้น กลับหน้าหลัก
        </Link>
      </main>
    </>
  );
}
