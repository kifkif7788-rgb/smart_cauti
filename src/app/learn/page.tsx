import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { CHECK5_ITEMS } from '@/lib/check5';
import { AppHeader } from '@/components/AppHeader';

const VIDEO_URL = 'https://youtu.be/kDyUv7aLua4';

export default async function LearnPage() {
  if (!(await getSession())) redirect('/login');

  return (
    <>
      <AppHeader title="สื่อการเรียนรู้" backHref="/" />
      <main className="mx-auto max-w-2xl px-4 pb-16 pt-4">
        {/* ── วิดีโอทบทวน ─────────────────────────────────────── */}
        <a
          href={VIDEO_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="block overflow-hidden rounded-2xl"
          style={{ background: '#10283E' }}
        >
          <div className="flex flex-col items-center gap-3 px-5 py-8 text-center">
            <svg width="52" height="52" viewBox="0 0 52 52" fill="none" aria-hidden="true">
              <circle cx="26" cy="26" r="24" fill="rgba(143,194,240,.16)" stroke="#8FC2F0" strokeWidth="2.4" />
              <path d="M21 17l15 9-15 9V17z" fill="#8FC2F0" />
            </svg>
            <div className="text-[15px] font-bold" style={{ color: '#EAF3FC' }}>
              การใส่สายสวนปัสสาวะในเพศชาย (Foley&apos;s catheterization)
            </div>
            <div className="text-[12px]" style={{ color: '#9FBBD6' }}>
              ศูนย์แพทย์ชั้นคลินิก สำนักการแพทย์ · เปิดใน YouTube
            </div>
          </div>
        </a>

        <div
          className="mt-3 rounded-xl border-l-4 px-4 py-3 text-[13px] leading-relaxed"
          style={{ background: 'var(--surface-2)', borderColor: 'var(--primary)' }}
        >
          <strong>ขอบเขตของวิดีโอนี้</strong> — ครอบคลุมการใส่สายและ aseptic technique
          ซึ่งเป็นคนละส่วนกับ CHECK 5 ที่ประเมินการดูแลระหว่างคาสาย
          การป้องกัน CAUTI ต้องอาศัยทั้งสองส่วนร่วมกัน
        </div>

        {/* ── คู่มือย่อ CHECK 5 ────────────────────────────────── */}
        <h2 className="mt-6 mb-2 text-base font-extrabold">คู่มือย่อ CHECK 5</h2>
        <div className="space-y-2.5">
          {CHECK5_ITEMS.map((item) => {
            const review = item.actionKind !== 'CORRECT_NOW';
            return (
              <article key={item.key} className="surface p-4">
                <div className="text-[11px] font-bold tracking-wider" style={{ color: 'var(--muted)' }}>
                  {item.order} · {item.label} · {item.labelTh}
                </div>
                <p className="mt-1 text-[15px] font-bold leading-snug">{item.question}</p>
                <div
                  className="mt-2 rounded-lg px-3 py-2 text-[13px] leading-relaxed"
                  style={{ background: review ? 'var(--review-bg)' : 'var(--correct-bg)' }}
                >
                  <strong style={{ color: review ? 'var(--review)' : 'var(--correct)' }}>
                    ไม่ผ่าน → {item.actionTitle}
                  </strong>
                  <br />
                  {item.actionMessage}
                </div>
              </article>
            );
          })}
        </div>

        {/* ── ข้อห้ามของป้าย QR ───────────────────────────────── */}
        <h2 className="mt-6 mb-2 text-base font-extrabold">การติดป้าย QR</h2>
        <div
          className="rounded-xl border-l-4 px-4 py-3 text-[13px] leading-relaxed"
          style={{ background: 'var(--review-bg)', borderColor: 'var(--review)' }}
        >
          <strong style={{ color: 'var(--review)' }}>ข้อห้าม</strong>
          <ul className="mt-1.5 list-disc space-y-1 pl-4">
            <li>ห้ามคร่อม catheter–drainage junction</li>
            <li>ห้ามสัมผัส mucosa หรือ urethral meatus</li>
            <li>ห้ามดัดแปลง closed drainage system</li>
            <li>ห้ามกดทับสายหรือเพิ่มแรงดึง</li>
          </ul>
          <p className="mt-2">
            หากพบว่าป้ายทำให้สายพับงอ ดึงรั้ง หรือหลุด ให้ถอดป้ายออกทันทีและแจ้งผู้วิจัย
          </p>
        </div>
      </main>
    </>
  );
}
