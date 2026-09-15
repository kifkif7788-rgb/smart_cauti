import Link from 'next/link';
import { AppHeader } from '@/components/AppHeader';

export function InvalidTag({ reason }: { reason: string }) {
  return (
    <>
      <AppHeader title="ป้ายไม่ถูกต้อง" backHref="/" />
      <main className="mx-auto max-w-md px-4 py-8">
        <div
          className="rounded-2xl border-l-4 px-4 py-4"
          style={{ background: 'var(--review-bg)', borderColor: 'var(--review)' }}
        >
          <h2 className="font-extrabold" style={{ color: 'var(--review)' }}>
            ไม่สามารถใช้ป้ายนี้ได้
          </h2>
          <p className="mt-1 text-[14px] leading-relaxed">{reason}</p>
          <p className="mt-2 text-[13px]" style={{ color: 'var(--muted)' }}>
            กรุณาแจ้งผู้ดูแลระบบ และประเมินผู้ป่วยรายนี้จากรายการในหน้าแรกแทน
          </p>
        </div>
        <Link href="/" className="btn-primary mt-4 flex w-full items-center justify-center">
          กลับหน้าหลัก
        </Link>
      </main>
    </>
  );
}
