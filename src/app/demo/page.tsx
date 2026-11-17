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
  DEMO_PASS_TREND,
  DEMO_TODAY,
  DEMO_WARD,
  demoAssessments,
  demoEpisodes,
  demoTrend,
} from '@/lib/demo-fixtures';

export const metadata = {
  title: 'ทดลองใช้แอป · Smart CAUTI Care',
};

/**
 * โหมดทดลองใช้สำหรับผู้เยี่ยมชมบูธ — เปิดสาธารณะ ไม่ต้องล็อกอิน
 *
 * ผู้เยี่ยมชมสแกน QR ที่บูธแล้วมาถึงหน้านี้ ได้ลองกดใช้งานจริงทุกจอ
 * ก่อนจะไปตอบแบบสอบถามที่ปลายทาง การให้คะแนนจึงมาจากคนที่ได้ลองใช้จริง
 *
 * ใช้ข้อมูลสมมติล้วน ไม่แตะฐานข้อมูลและไม่มีทางเห็นข้อมูลผู้ป่วยจริง
 * ซึ่งเป็นเหตุผลที่ไม่พาผู้เยี่ยมชมเข้าแอปจริงด้วยบัญชีสาธิต
 */

type Screen = 'home' | 'check' | 'result' | 'dashboard';

const STEPS: { key: Screen; label: string }[] = [
  { key: 'home', label: 'สแกน QR' },
  { key: 'check', label: 'CHECK 9' },
  { key: 'result', label: 'ผลลัพธ์' },
  { key: 'dashboard', label: 'ภาพรวม' },
];

function isScreen(value: unknown): value is Screen {
  return STEPS.some((s) => s.key === value);
}

export default async function DemoPage(props: PageProps<'/demo'>) {
  const search = await props.searchParams;
  const screen: Screen = isScreen(search.screen) ? search.screen : 'home';

  const episodes = demoEpisodes();
  const rows = demoAssessments(episodes);
  const result = evaluateCheck5({ need: false, fix: true, flow: false, below: true, closed: true });

  const index = STEPS.findIndex((s) => s.key === screen);
  const next = STEPS[index + 1];

  return (
    <>
      {/* ── แถบบอกว่าเป็นโหมดทดลอง ───────────────────────────── */}
      {/* ต้องเห็นตลอดทุกจอ ไม่งั้นผู้เยี่ยมชมอาจเข้าใจว่ากำลังดูผู้ป่วยจริง */}
      <nav className="preview-nav" aria-label="ทดลองใช้แอป">
        <span>ทดลองใช้ · ข้อมูลสมมติ ไม่ใช่ผู้ป่วยจริง</span>
        <div>
          {STEPS.map((step) => (
            <Link
              key={step.key}
              href={`/demo?screen=${step.key}`}
              aria-current={screen === step.key ? 'page' : undefined}
            >
              {step.label}
            </Link>
          ))}
        </div>
      </nav>

      {screen !== 'dashboard' && <AppHeader subtitle={DEMO_WARD} backHref="/demo" />}

      {screen === 'home' && (
        <main className="home-page mx-auto max-w-2xl px-4 pb-8 pt-4">
          <ScanHero />
          <CareNote />
        </main>
      )}

      {screen === 'check' && (
        <Check5Form
          preview
          episode={DEMO_EPISODE_FOR_FORM}
          today={DEMO_TODAY}
          nurseLevel="RN"
          studyMode="INTERVENTION"
          assessedThisShift={false}
        />
      )}

      {screen === 'result' && (
        <main className="result-page mx-auto max-w-2xl px-4 pb-8 pt-4">
          <AssessmentFeedback result={result} />
          <button type="button" disabled className="btn-primary action-button-label mt-4 w-full">
            <UiIcon name="check" />
            บันทึกการแก้ไขแล้ว
          </button>
          <p className="mt-2 text-center text-xs" style={{ color: 'var(--muted)' }}>
            ตัวอย่างหน้าจอ · ปุ่มบันทึกปิดใช้งาน
          </p>
          <CareNote compact />
        </main>
      )}

      {screen === 'dashboard' && (
        <DashboardView
          scope="FULL"
          kitUses={4}
          period="day"
          passTrend={DEMO_PASS_TREND}
          wardCodes={[DEMO_WARD]}
          list={episodes}
          rows={rows}
          pass={9}
          correct={2}
          review={1}
          percent={75}
          colors={DEMO_CHART_COLORS}
          trend={demoTrend()}
          peak={12}
          longStay={[]}
          historyError={false}
        />
      )}

      {/* ── ทางไปต่อ ─────────────────────────────────────────── */}
      {/* อยู่ท้ายทุกจอ ผู้เยี่ยมชมที่ดูไม่ครบก็ไปตอบแบบสอบถามได้ทันที */}
      <div className="mx-auto max-w-2xl px-4 pb-16">
        {next ? (
          <Link
            href={`/demo?screen=${next.key}`}
            className="btn-primary flex w-full items-center justify-center gap-2 text-[16px]"
          >
            ดูหน้าถัดไป · {next.label}
            <UiIcon name="arrow" width={18} height={18} />
          </Link>
        ) : (
          <Link
            href="/satisfaction"
            className="btn-primary flex w-full items-center justify-center gap-2 text-[16px]"
          >
            ประเมินความพึงพอใจ
            <UiIcon name="arrow" width={18} height={18} />
          </Link>
        )}

        {next && (
          <Link href="/satisfaction" className="surface mt-2 flex items-center gap-3 px-4 py-3">
            <UiIcon name="chart" width={20} height={20} />
            <span className="min-w-0 flex-1 text-[13.5px] font-bold">
              ดูพอแล้ว ไปประเมินความพึงพอใจ
            </span>
            <UiIcon name="arrow" width={16} height={16} />
          </Link>
        )}
      </div>
    </>
  );
}
