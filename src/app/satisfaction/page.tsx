import { Brand } from '@/components/Brand';
import { SATISFACTION_ITEMS } from '@/lib/satisfaction';
import { SatisfactionForm } from './SatisfactionForm';

export const metadata = {
  title: 'แบบสอบถามความพึงพอใจ · Smart CAUTI Care',
};

/**
 * แบบสอบถามความพึงพอใจต่อผลงาน — เปิดสาธารณะ ไม่ต้องล็อกอิน
 *
 * ผู้เยี่ยมชมบูธสแกน QR แล้วตอบได้ทันทีจากมือถือตัวเอง
 * จึงไม่เรียก getSession และไม่ใช้ AppHeader ซึ่งมีเมนูของเจ้าหน้าที่อยู่
 */
export default function SatisfactionPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 pb-16 pt-6">
      <div className="mb-5 text-center">
        <Brand />
        <h1 className="mt-3 text-xl font-extrabold">แบบสอบถามความพึงพอใจ</h1>
        <p className="mt-1.5 text-[13px] leading-relaxed" style={{ color: 'var(--muted)' }}>
          ขอบคุณที่แวะชมผลงาน รบกวนให้คะแนน {SATISFACTION_ITEMS.length} ข้อ ใช้เวลาไม่ถึงหนึ่งนาที
          <br />
          แบบสอบถามนี้ไม่เก็บชื่อหรือข้อมูลที่ระบุตัวผู้ตอบ
        </p>
      </div>
      <SatisfactionForm />
    </main>
  );
}
