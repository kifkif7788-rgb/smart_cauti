import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { getActiveStudy } from '@/lib/study';
import { db } from '@/lib/db';
import { isValidKitCode, wardPrefixFromCode } from '@/lib/qr';
import { hasScanProof } from '@/lib/scan-proof';
import { periodWindow } from '@/lib/shift';
import { AppHeader } from '@/components/AppHeader';
import { InvalidTag } from '@/components/InvalidTag';
import { KitUsageForm } from './KitUsageForm';

/**
 * บันทึกการใช้ชุดอุปกรณ์ใส่สาย หลังสแกน QR บนชุด
 *
 * ชุดอุปกรณ์ถูกหยิบไปใช้กับเตียงไหนก็ได้ ป้ายจึงบอกเตียงไม่ได้
 * พยาบาลกรอกเลขเตียงเองที่นี่ ระบบนับเป็นการใส่สายหนึ่งครั้ง
 *
 * การบันทึกทำได้ทุกเตียง แต่ไม่ได้เปิดทางเข้าแบบประเมินของเตียงที่มีผู้ป่วย
 * เพราะเก็บแค่เลขเตียง ส่วนแบบประเมินยังต้องสแกนป้ายประจำเตียงเหมือนเดิม
 */
export default async function KitPage(props: PageProps<'/kit'>) {
  const session = await getSession();
  if (!session) redirect('/login');

  const search = await props.searchParams;
  const kitCode = typeof search.code === 'string' ? search.code : '';

  // ต้องมาจากการสแกนป้ายจริงเท่านั้น มิฉะนั้นตัวเลขที่นับได้จะไม่ใช่การใช้งานจริง
  if (!isValidKitCode(kitCode) || !(await hasScanProof(kitCode))) {
    return (
      <InvalidTag reason="ต้องสแกน QR บนชุดอุปกรณ์ใส่สายเพื่อเข้าหน้านี้ กรุณาสแกนอีกครั้ง" />
    );
  }

  const study = await getActiveStudy();
  const wardCodes = session.wardCodes.length > 0 ? session.wardCodes : [study.ward_code];

  const { data: tags } = await db()
    .from('tag')
    .select('tag_code, bed_no')
    .in('ward_code', wardCodes)
    .eq('is_retired', false);

  // ป้ายชุดอุปกรณ์ของหออื่นต้องไม่บันทึกเข้าเตียงของหอนี้
  const prefix = wardPrefixFromCode(kitCode);
  const wardTags = (tags ?? [])
    .filter((t) => wardPrefixFromCode(t.tag_code) === prefix)
    .sort((a, b) => Number(a.bed_no) - Number(b.bed_no));

  if (wardTags.length === 0) {
    return <InvalidTag reason="ป้ายชุดอุปกรณ์นี้ไม่ตรงกับหอผู้ป่วยที่คุณดูแล" />;
  }

  const { data: episodes } = await db()
    .from('episode')
    .select('bed_no')
    .in('ward_code', wardCodes)
    .eq('is_active', true);

  const occupied = new Set((episodes ?? []).map((e) => e.bed_no));
  const beds = wardTags.map((t) => ({
    bedNo: t.bed_no,
    tagCode: t.tag_code,
    occupied: occupied.has(t.bed_no),
  }));

  // นับการใช้งานของวันนี้และเดือนนี้ ให้เห็นตัวเลขตรงจุดที่บันทึก
  const day = periodWindow('day');
  const month = periodWindow('month');
  const [{ count: today }, { count: thisMonth }] = await Promise.all([
    db()
      .from('kit_usage')
      .select('usage_id', { count: 'exact', head: true })
      .in('ward_code', wardCodes)
      .gte('used_at', day.start.toISOString())
      .lt('used_at', day.end.toISOString()),
    db()
      .from('kit_usage')
      .select('usage_id', { count: 'exact', head: true })
      .in('ward_code', wardCodes)
      .gte('used_at', month.start.toISOString())
      .lt('used_at', month.end.toISOString()),
  ]);

  return (
    <>
      <AppHeader title="ใช้ชุดอุปกรณ์ที่เตียงไหน" backHref="/" subtitle={`ชุดอุปกรณ์ · ${kitCode}`} />
      <main className="mx-auto max-w-2xl px-4 pb-16 pt-4">
        <div className="dashboard-metrics mb-4 grid grid-cols-2 gap-3">
          <div className="surface text-center">
            <div className="metric-label">ใช้ไปวันนี้</div>
            <div className="metric-value">
              {today ?? 0}
              <small>ครั้ง</small>
            </div>
          </div>
          <div className="surface text-center">
            <div className="metric-label">ใช้ไปเดือนนี้</div>
            <div className="metric-value">
              {thisMonth ?? 0}
              <small>ครั้ง</small>
            </div>
          </div>
        </div>

        <KitUsageForm kitCode={kitCode} beds={beds} />
      </main>
    </>
  );
}
