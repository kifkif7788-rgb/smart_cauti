import Link from 'next/link';

interface Props {
  /** ชื่อหน้า — ละไว้เพื่อแสดงชื่อระบบเต็มบนหน้าแรก */
  title?: string;
  /** ลิงก์ย้อนกลับ ถ้าไม่ระบุจะไม่แสดงปุ่มย้อนกลับ */
  backHref?: string;
  subtitle?: string;
}

export function AppHeader({ title, backHref, subtitle }: Props) {
  return (
    <header
      className="sticky z-20 border-b"
      style={{
        top: 'env(safe-area-inset-top, 0px)',
        background: 'var(--primary)',
        borderColor: 'rgba(255,255,255,.15)',
      }}
    >
      <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-3">
        {backHref && (
          <Link
            href={backHref}
            aria-label="ย้อนกลับ"
            className="-ml-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-white"
            style={{ background: 'rgba(255,255,255,.14)' }}
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path
                d="M12.5 15L7.5 10l5-5"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </Link>
        )}
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-base font-extrabold text-white">
            {title ?? 'Smart CAUTI GUARD'}
          </h1>
          {subtitle && (
            <p className="truncate text-xs text-white/75">{subtitle}</p>
          )}
        </div>
      </div>
    </header>
  );
}
