import { redirect } from 'next/navigation';
import QRCode from 'qrcode';
import { getSession } from '@/lib/auth';
import { db } from '@/lib/db';
import { tagUrl } from '@/lib/qr';
import { getActiveStudy } from '@/lib/study';
import { PrintButton } from '@/components/PrintButton';
import { AppHeader } from '@/components/AppHeader';
import { ShieldMark } from '@/components/Brand';
import styles from './tags.module.css';

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

  const { data: tags, error } = await db()
    .from('tag')
    .select('*')
    .in('ward_code', wardCodes)
    .eq('is_retired', false);

  if (error) throw new Error('โหลดป้าย QR ไม่สำเร็จ กรุณาลองใหม่');

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
        // เว้นพื้นที่สีขาวรอบ QR ให้แยกจากกรอบการ์ดชัดเจน
        margin: 4,
        width: 180,
      }),
    })),
  );

  const usingLocalhost = baseUrl.includes('localhost');

  return (
    <div className={styles.page}>
      <div className={styles.screenOnly}><AppHeader title="สร้างป้าย QR" backHref="/" /></div>
      <main className={styles.main}>
        <section className={`${styles.hero} ${styles.screenOnly}`}>
          <div className={styles.heroContent}>
            <span className={styles.eyebrow}>SMART CAUTI · BEDSIDE CARE</span>
            <h1>ป้าย QR ประจำเตียง</h1>
            <p>สแกนง่ายที่ข้างเตียง เริ่มดูแลได้ทันที</p>
            <div className={styles.badges}>
              <span>{cards.length} ป้ายพร้อมใช้งาน</span>
              <span>หอผู้ป่วย {wardCodes.join(', ')}</span>
            </div>
          </div>
          <div className={styles.heroMark}><ShieldMark /></div>
        </section>

        {usingLocalhost && (
          <div className={`${styles.warning} ${styles.screenOnly}`} role="alert">
            <strong>ตรวจสอบที่อยู่เว็บก่อนพิมพ์</strong>
            <p>QR ขณะนี้ชี้ไปที่ localhost กรุณาตั้ง NEXT_PUBLIC_BASE_URL เป็นที่อยู่จริงของระบบก่อนนำป้ายไปใช้</p>
          </div>
        )}

        <section className={`${styles.printGuide} ${styles.screenOnly}`} aria-label="คำแนะนำการพิมพ์">
          <div><h2>เตรียมป้ายให้พร้อมใช้งาน</h2><p>พิมพ์ A4 ขนาดจริง 100% แล้วตัดตามกรอบ ติดที่หัวเตียงหรือราวเตียงด้วยวัสดุกันน้ำ</p></div>
          <div className={styles.printAction}>{cards.length > 0 && <PrintButton />}<small>จัดหน้าให้อัตโนมัติ · 3 คอลัมน์ต่อแผ่น</small></div>
        </section>

        <div className={`${styles.sectionHeading} ${styles.screenOnly}`}>
          <h2>ป้ายประจำเตียงทั้งหมด <span>{cards.length}</span></h2>
          <p>ใช้ซ้ำได้เมื่อเปลี่ยนผู้ป่วย</p>
        </div>

        {cards.length === 0 ? (
          <div className={styles.empty}><h2>ยังไม่มีป้ายในหอผู้ป่วยนี้</h2><p>เมื่อเพิ่มข้อมูลป้ายประจำเตียงในระบบแล้ว ป้าย QR จะแสดงที่นี่</p></div>
        ) : (
          <div className={styles.grid}>
            {cards.map((card) => (
              <article key={card.tagCode} className={styles.card}>
                <div className={styles.cardTop}><span>Smart <b>CAUTI</b></span><span className={styles.ward}>{card.wardCode}</span></div>
                <div className={styles.bed}><span>เตียง</span><strong>{card.bedNo}</strong><span className={styles.bedCaption}>BED NUMBER</span></div>
                <div className={styles.qrFrame}>
                  <div className={styles.qr} role="img" aria-label={`QR เตียง ${card.bedNo} รหัส ${card.tagCode}`}
                    // SVG comes only from the server QR encoder, never from user-supplied markup.
                    dangerouslySetInnerHTML={{ __html: card.svg }} />
                </div>
                <div className={styles.code}>{card.tagCode}</div>
                <div className={styles.cardFooter}><strong>สแกนเพื่อประเมิน CHECK 5</strong><span>เช็กทุกวัน เพื่อความปลอดภัยของผู้ป่วย</span></div>
              </article>
            ))}
          </div>
        )}
        <p className={`${styles.privacyNote} ${styles.screenOnly}`}>ป้ายผูกกับเตียง ไม่ผูกกับผู้ป่วย · QR บรรจุเฉพาะรหัสเตียงและลายเซ็นตรวจสอบ ไม่มีข้อมูลผู้ป่วย</p>
      </main>
    </div>
  );
}
