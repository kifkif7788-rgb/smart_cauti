import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { resolveNurseLevel } from '@/lib/nurse-level-cookie';
import { AppHeader } from '@/components/AppHeader';
import { QrScanner } from '@/components/QrScanner';

export default async function ScanPage() {
  const session = await getSession();
  if (!session) redirect('/login');

  // ต้องรู้ก่อนว่าใครประเมิน มิฉะนั้นข้อมูลที่บันทึกจะขาดคุณวุฒิผู้ประเมิน
  if (!(await resolveNurseLevel(session))) redirect('/');

  return (
    <>
      <AppHeader title="สแกน QR" backHref="/" />
      <QrScanner />
    </>
  );
}
