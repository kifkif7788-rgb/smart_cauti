import { redirect } from 'next/navigation';
import { getSession, needsNurseLevel } from '@/lib/auth';
import { resolveNurseLevel } from '@/lib/nurse-level-cookie';
import { AppHeader } from '@/components/AppHeader';
import { QrScanner } from '@/components/QrScanner';

export default async function ScanPage() {
  const session = await getSession();
  if (!session) redirect('/login');

  // ต้องรู้ก่อนว่าใครประเมิน มิฉะนั้นข้อมูลที่บันทึกจะขาดคุณวุฒิผู้ประเมิน
  // ยกเว้นบัญชีที่ไม่ใช่บุคลากรพยาบาล เช่น ผู้ดูแลระบบ ซึ่งไม่มีคุณวุฒิให้เลือก
  if (needsNurseLevel(session.role) && !(await resolveNurseLevel(session))) redirect('/');

  return (
    <>
      <AppHeader title="สแกน QR" backHref="/" />
      <QrScanner />
    </>
  );
}
