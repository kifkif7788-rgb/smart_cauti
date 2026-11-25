import { redirect } from 'next/navigation';
import QRCode from 'qrcode';
import { headers } from 'next/headers';
import { getSession, canPrintTags } from '@/lib/auth';
import { db } from '@/lib/db';
import { tagUrl, kitUrl, kitCodeForWard, wardPrefixFromCode, resolveBaseUrl } from '@/lib/qr';
import { getActiveStudy } from '@/lib/study';
import { TagPicker, type TagCard } from './TagPicker';
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
  if (!canPrintTags(session.role)) redirect('/');

  const study = await getActiveStudy();
  const wardCodes = session.wardCodes.length > 0 ? session.wardCodes : [study.ward_code];

  const { data: tags, error } = await db()
    .from('tag')
    .select('*')
    .in('ward_code', wardCodes)
    .eq('is_retired', false);

  if (error) throw new Error('โหลดป้าย QR ไม่สำเร็จ กรุณาลองใหม่');

  // ถอยไปอ่านที่อยู่จาก request header เมื่อไม่ได้ตั้ง NEXT_PUBLIC_BASE_URL ไว้
  // ถ้าใช้ค่าว่าง QR จะเก็บแค่ /s/SM-B01?k=... ซึ่งเป็น path ไม่ใช่ URL
  // เครื่องสแกนเปิดไม่ได้ และจะรู้ก็ต่อเมื่อพิมพ์ป้ายไปติดที่เตียงแล้ว
  const baseUrl = resolveBaseUrl(await headers());

  const sorted = (tags ?? []).sort((a, b) => Number(a.bed_no) - Number(b.bed_no));

  const cards: TagCard[] = await Promise.all(
    sorted.map(async (tag) => ({
      code: tag.tag_code,
      heading: tag.bed_no,
      headingLabel: 'เตียง',
      headingCaption: 'BED NUMBER',
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
      footerTitle: 'สแกนเพื่อประเมิน CHECK 9',
      footerNote: 'เช็กทุกวัน เพื่อความปลอดภัยของผู้ป่วย',
    })),
  );

  /**
   * ป้ายสำหรับติดบนชุดอุปกรณ์ใส่สาย
   *
   * มีใบเดียวต่อหอผู้ป่วย เพราะป้ายไม่ผูกกับเตียง พยาบาลเลือกเตียงเองหลังสแกน
   * พิมพ์หลายใบได้ตามจำนวนชุดอุปกรณ์ที่ต้องติด ทุกใบใช้รหัสเดียวกัน
   */
  const kitPrefix = sorted.length ? wardPrefixFromCode(sorted[0].tag_code) : null;
  const kitCode = kitPrefix ? kitCodeForWard(kitPrefix) : null;
  const kitCard: TagCard | null = kitCode
    ? {
        code: kitCode,
        heading: 'SET',
        headingLabel: 'ชุดอุปกรณ์',
        headingCaption: 'INSERTION KIT',
        wardCode: wardCodes.join(', '),
        svg: await QRCode.toString(kitUrl(kitCode, baseUrl), {
          type: 'svg',
          errorCorrectionLevel: 'Q',
          margin: 4,
          width: 180,
        }),
        footerTitle: 'สแกนตอนใส่สาย แล้วเลือกเตียง',
        footerNote: 'ระบบเริ่มนับวันคาสายให้ทันที',
      }
    : null;

  const usingLocalhost = baseUrl.includes('localhost');
  // อ่านที่อยู่ไม่ได้เลย — ป้ายที่พิมพ์จะสแกนไม่ได้ ต้องเตือนก่อนสั่งพิมพ์
  const missingBaseUrl = baseUrl === '';

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

        {missingBaseUrl && (
          <div className={`${styles.warning} ${styles.screenOnly}`} role="alert">
            <strong>ยังพิมพ์ป้ายไม่ได้</strong>
            <p>ระบบอ่านที่อยู่เว็บไม่ได้ QR จะเก็บเพียงเส้นทางภายในและสแกนไม่ขึ้นหน้าใด กรุณาตั้ง NEXT_PUBLIC_BASE_URL ก่อนพิมพ์</p>
          </div>
        )}

        {usingLocalhost && (
          <div className={`${styles.warning} ${styles.screenOnly}`} role="alert">
            <strong>ตรวจสอบที่อยู่เว็บก่อนพิมพ์</strong>
            <p>QR ขณะนี้ชี้ไปที่ localhost กรุณาตั้ง NEXT_PUBLIC_BASE_URL เป็นที่อยู่จริงของระบบก่อนนำป้ายไปใช้</p>
          </div>
        )}

        <TagPicker beds={cards} kit={kitCard} />

        <p className={`${styles.privacyNote} ${styles.screenOnly}`}>ป้ายผูกกับเตียง ไม่ผูกกับผู้ป่วย · QR บรรจุเฉพาะรหัสเตียงและลายเซ็นตรวจสอบ ไม่มีข้อมูลผู้ป่วย</p>
        {/* บอกที่อยู่ที่ QR ใช้จริง เพื่อตรวจก่อนพิมพ์โดยไม่ต้องสแกนทีละใบ */}
        {baseUrl !== '' && (
          <p className={`${styles.privacyNote} ${styles.screenOnly}`}>QR ในแผ่นนี้ชี้ไปที่ {baseUrl}</p>
        )}
      </main>
    </div>
  );
}
