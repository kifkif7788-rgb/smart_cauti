import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getSession } from '@/lib/auth';
import { db } from '@/lib/db';
import { isValidTagCode, verifyTagSignature } from '@/lib/qr';
import { AppHeader } from '@/components/AppHeader';

/**
 * ปลายทางของ QR Code บนป้าย — /s/{tagCode}?k={hmac}
 *
 * หน้านี้ตรวจลายเซ็นแล้วส่งต่อ ไม่แสดง UI ในกรณีปกติ
 * แยกจาก /assess เพื่อให้ URL บนป้ายสั้นพอที่ QR จะอ่านง่ายในแสงน้อย
 */
export default async function ScanEntryPage(props: PageProps<'/s/[tagCode]'>) {
  const { tagCode } = await props.params;
  const search = await props.searchParams;
  const signature = typeof search.k === 'string' ? search.k : null;

  const session = await getSession();
  if (!session) {
    // เก็บปลายทางไว้ให้กลับมาหลัง login
    const target = `/s/${tagCode}${signature ? `?k=${signature}` : ''}`;
    redirect(`/login?next=${encodeURIComponent(target)}`);
  }

  if (!isValidTagCode(tagCode) || !verifyTagSignature(tagCode, signature)) {
    return <InvalidTag reason="ป้ายนี้ไม่ผ่านการตรวจสอบความถูกต้อง" />;
  }

  const { data: tag } = await db()
    .from('tag')
    .select('tag_code, is_retired')
    .eq('tag_code', tagCode)
    .maybeSingle();

  if (!tag || tag.is_retired) {
    return <InvalidTag reason="ไม่พบป้ายนี้ในระบบ หรือป้ายถูกยกเลิกการใช้งานแล้ว" />;
  }

  const { data: episode } = await db()
    .from('episode')
    .select('episode_id')
    .eq('tag_code', tagCode)
    .eq('is_active', true)
    .maybeSingle();

  redirect(episode ? `/assess/${tagCode}` : `/bind/${tagCode}`);
}

function InvalidTag({ reason }: { reason: string }) {
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
