import { Brand, CareNote } from '@/components/Brand';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { LoginForm } from './LoginForm';

export default async function LoginPage() {
  if (await getSession()) redirect('/');

  return (
    <main className="login-page mx-auto flex min-h-dvh max-w-md flex-col justify-center px-5 py-10">
      <div className="mb-8 text-center">
        <h1 className="sr-only">Smart CAUTI Care — เข้าสู่ระบบ</h1>
        <Brand />
        <p className="mt-1 text-sm" style={{ color: 'var(--muted)' }}>
          ระบบบันทึกการปฏิบัติตาม CAUTI Bundle
        </p>
      </div>

      <LoginForm />
      <CareNote compact />

      <p className="mt-8 text-center text-xs leading-relaxed" style={{ color: 'var(--muted)' }}>
        ระบบนี้เป็นเครื่องมือช่วยเตือน ไม่ทดแทนการตัดสินใจทางคลินิก
      </p>
    </main>
  );
}
