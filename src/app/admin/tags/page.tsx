import { redirect } from 'next/navigation';
import QRCode from 'qrcode';
import { getSession } from '@/lib/auth';
import { db } from '@/lib/db';
import { tagUrl } from '@/lib/qr';
import { getActiveStudy } from '@/lib/study';
import { PrintButton } from '@/components/PrintButton';

/**
 * แผ่นพิมพ์ป้าย QR ประจำเตียง
 *
 * ออกแบบให้พิมพ์ลงกระดาษ A4 แล้วตัดติดป้าย PET/PP กันน้ำ
 * เลขเตียงตัวใหญ่อยู่เหนือ QR เพื่อให้พยาบาลยืนยันด้วยตาได้ทันที
 * ว่ากำลังสแกนเตียงถูกใบ โดยไม่ต้องรอผลการสแกน
 */
export default async function TagSheetPage() {
  const session = await getSession();
  if (!session) redirect('/login');
  if (session.role !== 'ADMIN' && session.role !== 'WARD_HEAD') redirect('/');

  const study = await getActiveStudy();
  const wardCodes = session.wardCodes.length > 0 ? session.wardCodes : [study.ward_code];

  const { data: tags } = await db()
    .from('tag')
    .select('*')
    .in('ward_code', wardCodes)
    .eq('is_retired', false);

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? '';

  const sorted = (tags ?? []).sort((a, b) => Number(a.bed_no) - Number(b.bed_no));

  const cards = await Promise.all(
    sorted.map(async (tag) => ({
      bedNo: tag.bed_no,
      tagCode: tag.tag_code,
      wardCode: tag.ward_code,
      svg: await QRCode.toString(tagUrl(tag.tag_code, baseUrl), {
        type: 'svg',
        // ระดับ Q ทนความเสียหายได้ 25% — ป้ายในหอผู้ป่วยถูกเช็ดทำความสะอาดบ่อย
        // และอาจมีรอยขีดข่วนหรือคราบ ซึ่งระดับ M อาจอ่านไม่ออก
        errorCorrectionLevel: 'Q',
        // quiet zone 2 โมดูล — ถ้าเป็น 0 ขอบการ์ดจะชิด QR จนสแกนพลาด
        margin: 2,
        width: 180,
      }),
    })),
  );

  const usingLocalhost = baseUrl.includes('localhost');

  return (
    <main className="mx-auto max-w-4xl px-4 py-6">
      <div className="no-print">
        <h1 className="text-xl font-extrabold">ป้าย QR ประจำเตียง</h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--muted)' }}>
          {cards.length} เตียง · หอผู้ป่วย {wardCodes.join(', ')}
        </p>

        {usingLocalhost && (
          <div
            className="mt-3 rounded-xl border-l-4 px-4 py-3 text-[13px] leading-relaxed"
            style={{ background: 'var(--review-bg)', borderColor: 'var(--review)' }}
          >
            <strong style={{ color: 'var(--review)' }}>อย่าเพิ่งพิมพ์</strong>
            {' — '}
            ขณะนี้ URL ในป้ายชี้ไปที่ <code>localhost</code> ซึ่งใช้ในหอผู้ป่วยไม่ได้
            กรุณาตั้ง <code>NEXT_PUBLIC_BASE_URL</code> เป็นที่อยู่จริงของระบบก่อน
          </div>
        )}

        <div
          className="mt-3 rounded-xl border-l-4 px-4 py-3 text-[13px] leading-relaxed"
          style={{ background: 'var(--surface-2)', borderColor: 'var(--primary)' }}
        >
          <strong>ก่อนพิมพ์</strong> — พิมพ์ลงกระดาษ A4 ขนาดจริง 100% (ไม่ย่อ/ขยาย)
          แล้วตัดติดป้าย PET หรือ PP กันน้ำขอบมน ติดที่หัวเตียงหรือราวเตียง
          <br />
          ป้ายนี้ผูกกับเตียง ไม่ผูกกับผู้ป่วย จึงติดถาวรและใช้ได้กับผู้ป่วยทุกราย
          ที่มาอยู่เตียงนั้น
          <br />
          <strong>QR ไม่มีข้อมูลผู้ป่วยใด ๆ</strong> บรรจุเพียงรหัสเตียงกับลายเซ็นตรวจสอบ
        </div>

        <PrintButton />
      </div>

      <div className="tag-grid mt-6">
        {cards.map((card) => (
          <article key={card.tagCode} className="tag-card">
            <div className="tag-bed">
              <span className="tag-bed-label">เตียง</span>
              <span className="tag-bed-no">{card.bedNo}</span>
            </div>
            <div
              className="tag-qr"
              // QR สร้างฝั่ง server จาก URL ที่ระบบเซ็นเอง ไม่ใช่ข้อมูลจากผู้ใช้
              dangerouslySetInnerHTML={{ __html: card.svg }}
            />
            <div className="tag-meta">
              <div className="tag-brand">Smart CAUTI</div>
              <div className="tag-code">{card.tagCode}</div>
            </div>
            <div className="tag-note">สแกนเพื่อประเมิน CHECK 5</div>
          </article>
        ))}
      </div>

      <style>{`
        .tag-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 12px;
        }
        .tag-card {
          border: 2px solid #1558A0;
          border-radius: 10px;
          padding: 12px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          background: #fff;
          color: #1A2332;
          break-inside: avoid;
          page-break-inside: avoid;
        }
        .tag-bed {
          display: flex;
          align-items: baseline;
          gap: 6px;
          background: #1558A0;
          color: #fff;
          border-radius: 8px;
          padding: 4px 16px;
          width: 100%;
          justify-content: center;
        }
        .tag-bed-label { font-size: 12px; font-weight: 700; opacity: .8; }
        .tag-bed-no {
          font-size: 34px;
          font-weight: 800;
          line-height: 1.1;
          font-variant-numeric: tabular-nums;
        }
        .tag-qr { width: 150px; height: 150px; }
        .tag-qr :global(svg) { width: 100%; height: 100%; display: block; }
        .tag-meta { text-align: center; line-height: 1.3; }
        .tag-brand { font-size: 10px; font-weight: 700; color: #1558A0; }
        .tag-code {
          font-size: 13px;
          font-weight: 700;
          letter-spacing: .06em;
          font-family: ui-monospace, monospace;
        }
        .tag-note { font-size: 10px; color: #566B82; }

        @media print {
          .no-print { display: none !important; }
          main { max-width: none; padding: 0; }
          .tag-grid { grid-template-columns: repeat(3, 1fr); gap: 8px; }
          .tag-card { border-color: #000; }
          @page { size: A4; margin: 10mm; }
        }
      `}</style>
    </main>
  );
}
