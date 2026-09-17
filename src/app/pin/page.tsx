import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { AppHeader } from '@/components/AppHeader';
import { PinForm } from './PinForm';

/**
 * เปลี่ยน PIN ของตัวเอง
 *
 * บัญชีที่ยังใช้ PIN ตั้งต้นจะถูก proxy พามาที่นี่และออกไปหน้าอื่นไม่ได้
 * จึงไม่มีปุ่มย้อนกลับให้ในกรณีนั้น
 */
export default async function PinPage() {
  const session = await getSession();
  if (!session) redirect('/login');

  return (
    <>
      <AppHeader
        title="เปลี่ยน PIN"
        backHref={session.mustChangePin ? undefined : '/'}
        subtitle={`${session.employeeId} · ${session.fullName}`}
      />
      <main className="mx-auto max-w-md px-4 pb-16 pt-4">
        <PinForm forced={session.mustChangePin} />
      </main>
    </>
  );
}
