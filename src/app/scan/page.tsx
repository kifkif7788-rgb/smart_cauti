import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { readNurseLevelCookie } from '@/lib/nurse-level-cookie';
import { AppHeader } from '@/components/AppHeader';
import { QrScanner } from '@/components/QrScanner';

export default async function ScanPage() {
  if (!(await getSession())) redirect('/login');

  // ต้องรู้ก่อนว่าใครประเมิน มิฉะนั้นข้อมูลที่บันทึกจะขาดคุณวุฒิผู้ประเมิน
  if (!(await readNurseLevelCookie())) redirect('/');

  return (
    <>
      <AppHeader title="สแกน QR" backHref="/" />
      <QrScanner />
    </>
  );
}
