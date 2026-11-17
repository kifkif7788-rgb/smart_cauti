import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import QRCode from 'qrcode';
import { canSeeSatisfaction, getSession } from '@/lib/auth';
import { db } from '@/lib/db';
import { AppHeader } from '@/components/AppHeader';
import { resolveBaseUrl } from '@/lib/qr';
import { formatThaiDate, formatThaiTime } from '@/lib/shift';
import {
  SATISFACTION_ITEMS,
  SATISFACTION_SCALE,
  itemAverages,
  overallAverage,
} from '@/lib/satisfaction';

/**
 * ผลแบบสอบถามความพึงพอใจ — เปิดให้ผู้ดูแลระบบและพยาบาล IC
 *
 * มี QR ให้พิมพ์ไปติดที่บูธ ผู้เยี่ยมชมสแกนแล้วตอบจากมือถือตัวเองได้ทันที
 * แสดงค่าเฉลี่ยรายข้อเพื่อให้เห็นว่าส่วนไหนของผลงานได้คะแนนต่ำกว่าส่วนอื่น
 */
export default async function AdminSatisfactionPage() {
  const session = await getSession();
  if (!session) redirect('/login');
  if (!canSeeSatisfaction(session.role)) redirect('/');

  const { data } = await db()
    .from('satisfaction_response')
    .select('response_id, scores, comment, submitted_at')
    .order('submitted_at', { ascending: false });

  const responses = data ?? [];
  const averages = itemAverages(responses);
  const overall = overallAverage(responses);
  const comments = responses.filter((r) => r.comment);

  // QR พาไปหน้าทดลองใช้ก่อน ไม่ใช่แบบสอบถามโดยตรง
  // ผู้เยี่ยมชมจะได้ลองกดใช้งานจริงก่อนให้คะแนน คะแนนจึงมาจากคนที่ได้ลองใช้
  const demoUrl = `${resolveBaseUrl(await headers())}/demo`;
  const qrSvg = await QRCode.toString(demoUrl, {
    type: 'svg',
    errorCorrectionLevel: 'Q',
    margin: 2,
    width: 200,
  });

  const fmt = (n: number | null) => (n === null ? '—' : n.toFixed(2));

  return (
    <>
      <AppHeader title="ความพึงพอใจต่อผลงาน" backHref="/" />
      <main className="mx-auto max-w-2xl px-4 pb-16 pt-4">
        {/* ── สรุปภาพรวม ─────────────────────────────────────── */}
        <div className="dashboard-metrics grid grid-cols-2 gap-3">
          <div className="surface text-center">
            <div className="metric-label">ผู้ตอบทั้งหมด</div>
            <div className="metric-value">
              {responses.length}
              <small>คน</small>
            </div>
          </div>
          <div className="surface text-center">
            <div className="metric-label">คะแนนเฉลี่ยรวม</div>
            <div className="metric-value">
              {fmt(overall)}
              <small>/ 5</small>
            </div>
          </div>
        </div>

        {/* ── QR สำหรับติดที่บูธ ──────────────────────────────── */}
        <section className="surface mt-3 px-4 py-4">
          <h2 className="text-base font-extrabold">QR สำหรับติดที่บูธ</h2>
          <p className="mt-1 text-[12.5px] leading-relaxed" style={{ color: 'var(--muted)' }}>
            ผู้เยี่ยมชมสแกนแล้วได้ทดลองใช้แอปด้วยข้อมูลสมมติก่อน แล้วจึงกดไปตอบแบบสอบถาม
            ไม่ต้องล็อกอินและไม่เห็นข้อมูลผู้ป่วยจริง สั่งพิมพ์หน้านี้เพื่อนำไปติดได้
          </p>
          <div className="mt-3 flex flex-col items-center gap-2">
            <div
              className="rounded-xl bg-white p-3"
              dangerouslySetInnerHTML={{ __html: qrSvg }}
            />
            <code className="text-[12px] break-all text-center" style={{ color: 'var(--muted)' }}>
              {demoUrl}
            </code>
          </div>
        </section>

        {/* ── ค่าเฉลี่ยรายข้อ ─────────────────────────────────── */}
        <section className="mt-5">
          <h2 className="mb-2 text-base font-extrabold">คะแนนเฉลี่ยรายข้อ</h2>
          {responses.length === 0 ? (
            <p
              className="surface px-4 py-6 text-center text-sm"
              style={{ color: 'var(--muted)' }}
            >
              ยังไม่มีผู้ตอบแบบสอบถาม
            </p>
          ) : (
            <ul className="space-y-2">
              {SATISFACTION_ITEMS.map((item, i) => {
                const avg = averages[i];
                return (
                  <li key={item} className="surface px-4 py-3">
                    <div className="flex items-start gap-3">
                      <p className="min-w-0 flex-1 text-[13px] font-bold leading-relaxed">
                        <span style={{ color: 'var(--muted)' }}>{i + 1}. </span>
                        {item}
                      </p>
                      <strong
                        className="shrink-0 text-[19px] tabular-nums"
                        style={{ color: 'var(--primary)' }}
                      >
                        {fmt(avg)}
                      </strong>
                    </div>
                    {avg !== null && (
                      <div
                        className="mt-2 h-2 w-full overflow-hidden rounded-full"
                        style={{ background: 'var(--surface-2)' }}
                      >
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${(avg / 5) * 100}%`,
                            background: 'var(--primary)',
                          }}
                        />
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* ── ข้อเสนอแนะปลายเปิด ──────────────────────────────── */}
        {comments.length > 0 && (
          <section className="mt-5">
            <h2 className="mb-2 text-base font-extrabold">
              ข้อเสนอแนะ ({comments.length} ข้อความ)
            </h2>
            <ul className="space-y-2">
              {comments.map((row) => (
                <li key={row.response_id} className="surface px-4 py-3">
                  <p className="text-[13px] leading-relaxed whitespace-pre-wrap">
                    {row.comment}
                  </p>
                  <p className="mt-1.5 text-[11.5px]" style={{ color: 'var(--muted)' }}>
                    {formatThaiDate(row.submitted_at.slice(0, 10))} ·{' '}
                    {formatThaiTime(new Date(row.submitted_at))} น.
                  </p>
                </li>
              ))}
            </ul>
          </section>
        )}

        <p className="mt-5 text-[12px] leading-relaxed" style={{ color: 'var(--muted)' }}>
          ระดับคะแนน: {SATISFACTION_SCALE.map((s, i) => `${i + 1} = ${s}`).join(' · ')}
          <br />
          แบบสอบถามนี้เป็นแบบนิรนาม ไม่มีการเก็บชื่อหรือบัญชีของผู้ตอบ
        </p>
      </main>
    </>
  );
}
