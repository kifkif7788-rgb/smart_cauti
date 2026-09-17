import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';
import './globals.css';

/**
 * Sarabun แบบ self-host
 *
 * ไม่ใช้ next/font/google เพราะเครือข่ายโรงพยาบาลหลายแห่งบล็อก
 * fonts.googleapis.com ทำให้ตัวอักษรไทยตกไปเป็น fallback ที่อ่านยาก
 * การ self-host ยังตัดการเรียกออกไปยังบุคคลที่สามด้วย ซึ่งดีกว่าในแง่ PDPA
 */
const sarabun = localFont({
  src: [
    { path: './fonts/sarabun-thai-400.woff2', weight: '400', style: 'normal' },
    { path: './fonts/sarabun-latin-400.woff2', weight: '400', style: 'normal' },
    { path: './fonts/sarabun-thai-600.woff2', weight: '600', style: 'normal' },
    { path: './fonts/sarabun-latin-600.woff2', weight: '600', style: 'normal' },
    { path: './fonts/sarabun-thai-700.woff2', weight: '700', style: 'normal' },
    { path: './fonts/sarabun-latin-700.woff2', weight: '700', style: 'normal' },
    { path: './fonts/sarabun-thai-800.woff2', weight: '800', style: 'normal' },
    { path: './fonts/sarabun-latin-800.woff2', weight: '800', style: 'normal' },
  ],
  variable: '--font-sarabun',
  display: 'swap',
  fallback: ['system-ui', 'sans-serif'],
});

export const metadata: Metadata = {
  title: 'Smart CAUTI Care',
  description: 'ระบบบันทึกและติดตามการปฏิบัติตาม CAUTI Maintenance Bundle',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'CAUTI',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  // ไม่ล็อกการซูม เพราะผู้ใช้บางคนต้องขยายเพื่ออ่าน
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="th" className={sarabun.variable}>
      <body>{children}</body>
    </html>
  );
}
