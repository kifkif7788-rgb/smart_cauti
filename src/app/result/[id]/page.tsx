import { AssessmentFeedback } from '@/components/AssessmentFeedback';
import { UiIcon } from '@/components/UiIcon';
import { CareNote } from '@/components/Brand';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { getSession } from '@/lib/auth';
import { getActiveStudy, shouldRevealFeedback } from '@/lib/study';
import { db } from '@/lib/db';
import { evaluateCheck5 } from '@/lib/check5';
import { CorrectiveActionPanel } from '@/components/CorrectiveActionPanel';
import { AppHeader } from '@/components/AppHeader';

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
    // null = การประเมินครั้งนั้นยังไม่มีข้อนี้ ต้องส่งเป็น undefined ไม่ใช่ false
    hand: assessment.hand ?? undefined,
    flash: assessment.flash ?? undefined,
    drain: assessment.drain ?? undefined,
  });


  const { data: existingAction } = await db()
    .from('corrective_action')
    .select('action_id, status')
    .eq('assessment_id', id)
    .maybeSingle();

  return (
    <>
      <AppHeader title="ผลการประเมิน" backHref="/" />

      <main className="result-page mx-auto max-w-2xl px-4 pb-16 pt-4">
        <AssessmentFeedback result={result} />

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
          className="home-return"
        >
          <UiIcon name="home"/> กลับหน้าหลัก
        </Link>
        <CareNote compact />
      </main>
    </>
  );
}
