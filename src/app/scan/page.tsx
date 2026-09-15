import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { AppHeader } from '@/components/AppHeader';
import { QrScanner } from '@/components/QrScanner';

export default async function ScanPage() {
  if (!(await getSession())) redirect('/login');

  return (
    <>
      <AppHeader title="สแกน QR" backHref="/" />
      <QrScanner />
    </>
  );
}
