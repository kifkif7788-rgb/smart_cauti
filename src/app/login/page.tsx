import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { LoginForm } from './LoginForm';

export default async function LoginPage() {
  if (await getSession()) redirect('/');

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-5 py-10">
      <div className="mb-8 text-center">
        <div
          className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl"
          style={{ background: 'var(--primary)' }}
        >
          <svg width="34" height="34" viewBox="0 0 34 34" fill="none" aria-hidden="true">
            <path
              d="M17 3L5 7v10c0 8 5 15.5 12 18 7-2.5 12-10 12-18V7L17 3z"
              fill="rgba(255,255,255,.18)"
              stroke="rgba(255,255,255,.6)"
              strokeWidth="1.4"
            />
            <path
              d="M17 13v9M12.5 17.5h9"
              stroke="#fff"
              strokeWidth="2.6"
              strokeLinecap="round"
            />
          </svg>
        </div>
        <h1 className="text-2xl font-extrabold">Smart CAUTI GUARD</h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--muted)' }}>
          ระบบบันทึกการปฏิบัติตาม CAUTI Bundle
        </p>
      </div>

      <LoginForm />

      <p className="mt-8 text-center text-xs leading-relaxed" style={{ color: 'var(--muted)' }}>
        ระบบนี้เป็นเครื่องมือช่วยเตือน ไม่ทดแทนการตัดสินใจทางคลินิก
      </p>
    </main>
  );
}
