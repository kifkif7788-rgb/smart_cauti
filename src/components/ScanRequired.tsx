import Link from 'next/link';
import { AppHeader } from '@/components/AppHeader';
import { SCAN_MINUTES } from '@/lib/scan-proof';

export function ScanRequired({ bedNo }: { bedNo: string }) {
  return (
    <>
      <AppHeader title="ต้องสแกน QR ก่อน" backHref="/" />
      <main className="mx-auto max-w-md px-4 py-8">
        <div
          className="rounded-2xl border-l-4 px-4 py-4"
          style={{ background: 'var(--correct-bg)', borderColor: 'var(--correct)' }}
        >
          <h2 className="font-extrabold" style={{ color: 'var(--correct)' }}>
            เตียง {bedNo} มีผู้ป่วยคาสายอยู่แล้ว
          </h2>
          <p className="mt-1 text-[14px] leading-relaxed">
            การประเมินเตียงที่มีผู้ป่วยอยู่ต้องสแกน QR ที่ป้ายข้างเตียงเท่านั้น
            กรอกรหัสเตียงเองไม่ได้
          </p>
          <p className="mt-2 text-[13px]" style={{ color: 'var(--muted)' }}>
            การสแกนยืนยันว่าผู้ประเมินอยู่ที่เตียงผู้ป่วยจริง
            และมีอายุ {SCAN_MINUTES} นาทีต่อการสแกนหนึ่งครั้ง
          </p>
        </div>
        <Link href="/scan" className="btn-primary mt-4 flex w-full items-center justify-center">
          ไปหน้าสแกน QR
        </Link>
        <Link
          href="/"
          className="mt-3 flex w-full items-center justify-center text-sm font-bold"
          style={{ color: 'var(--muted)' }}
        >
          กลับหน้าหลัก
        </Link>
      </main>
    </>
  );
}
