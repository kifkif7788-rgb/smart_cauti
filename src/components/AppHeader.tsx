import Link from 'next/link';
import { UiIcon } from './UiIcon';
import { LogoutButton } from './LogoutButton';
import { getSession, canDiagnoseInfection, canSeeSatisfaction } from '@/lib/auth';

interface Props {
  title?: string;
  backHref?: string;
  subtitle?: string;
}

export async function AppHeader({ title, backHref, subtitle }: Props) {
  const session = await getSession();
  return (
    <header className="app-header">
      <div className="app-header-inner">
        <Link href={backHref ?? '/'} aria-label={backHref && backHref !== '/' ? 'ย้อนกลับ' : 'หน้าหลัก'} className="header-home"><UiIcon name="home"/></Link>
        <div className="header-copy"><h1>Smart CAUTI Care</h1>{(subtitle || title) && <p>{subtitle ?? title}</p>}</div>
        {session && <details className="app-menu">
          <summary aria-label="เปิดเมนู"><UiIcon name="menu"/></summary>
          <nav aria-label="เมนูหลัก">
            <Link href="/"><UiIcon name="home"/>หน้าหลัก</Link>
            {session.role === 'ADMIN' && (
              <>
                <Link href="/admin/tags"><UiIcon name="qr"/>สร้าง QR</Link>
                <Link href="/admin/users"><UiIcon name="user"/>บัญชีผู้ใช้</Link>
                <Link href="/admin/support"><UiIcon name="message"/>เรื่องที่แจ้งเข้ามา</Link>
              </>
            )}
            {canSeeSatisfaction(session.role) && (
              <Link href="/admin/satisfaction"><UiIcon name="chart"/>ความพึงพอใจต่อผลงาน</Link>
            )}
            <Link href="/scan"><UiIcon name="arrow"/>สแกน QR</Link>
            {canDiagnoseInfection(session.role) && (
              <Link href="/infection"><UiIcon name="shield"/>แบบวินิจฉัยการติดเชื้อ</Link>
            )}
            <Link href="/learn"><UiIcon name="book"/>สื่อการเรียนรู้</Link>
            <Link href="/pin"><UiIcon name="closed"/>เปลี่ยน PIN</Link>
            <Link href="/support"><UiIcon name="message"/>ติดต่อผู้ดูแลระบบ</Link>
            <LogoutButton />
          </nav>
        </details>}
      </div>
    </header>
  );
}
