import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { AppHeader } from '@/components/AppHeader';
import { PinForm } from './PinForm';

/**
 * เปลี่ยน PIN ของตัวเอง
 *
 * เป็นทางเลือก ไม่บังคับ เข้ามาได้จากเมนูเมื่อต้องการตั้ง PIN ของตัวเอง
 */
export default async function PinPage() {
  const session = await getSession();
  if (!session) redirect('/login');

  return (
    <>
      <AppHeader
        title="เปลี่ยน PIN"
        backHref="/"
        subtitle={`${session.employeeId} · ${session.fullName}`}
      />
      <main className="mx-auto max-w-md px-4 pb-16 pt-4">
        <PinForm />
      </main>
    </>
  );
}
