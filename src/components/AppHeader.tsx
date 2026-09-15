import Link from 'next/link';
import { UiIcon } from './UiIcon';
import { LogoutButton } from './LogoutButton';

interface Props {
  title?: string;
  backHref?: string;
  subtitle?: string;
}

export function AppHeader({ title, backHref, subtitle }: Props) {
  return (
    <header className="app-header">
      <div className="app-header-inner">
        <Link href={backHref ?? '/'} aria-label={backHref && backHref !== '/' ? 'ย้อนกลับ' : 'หน้าหลัก'} className="header-home"><UiIcon name="home"/></Link>
        <div className="header-copy"><h1>Smart CAUTI</h1>{(subtitle || title) && <p>{subtitle ?? title}</p>}</div>
        <details className="app-menu">
          <summary aria-label="เปิดเมนู"><UiIcon name="menu"/></summary>
          <nav aria-label="เมนูหลัก">
            <Link href="/"><UiIcon name="home"/>หน้าหลัก</Link>
            <Link href="/scan"><UiIcon name="arrow"/>สแกน QR</Link>
            <Link href="/learn"><UiIcon name="book"/>สื่อการเรียนรู้</Link>
            <LogoutButton />
          </nav>
        </details>
      </div>
    </header>
  );
}
