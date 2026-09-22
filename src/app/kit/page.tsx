import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getSession } from '@/lib/auth';
import { getActiveStudy } from '@/lib/study';
import { db } from '@/lib/db';
import { isValidKitCode, wardPrefixFromCode } from '@/lib/qr';
import { hasScanProof } from '@/lib/scan-proof';
import { AppHeader } from '@/components/AppHeader';
import { InvalidTag } from '@/components/InvalidTag';
import { UiIcon } from '@/components/UiIcon';

/**
 * เลือกเตียงหลังสแกน QR บนชุดอุปกรณ์ใส่สาย
 *
 * ชุดอุปกรณ์ถูกหยิบไปใช้กับเตียงไหนก็ได้ ป้ายจึงบอกเตียงไม่ได้
 * พยาบาลเลือกเองตรงนี้แล้วไปลงทะเบียนผู้ป่วยต่อทันที
 *
 * เลือกได้เฉพาะเตียงว่าง ด้วยเหตุผลสองข้อที่ตรงกันพอดี
 *   1. ชุดอุปกรณ์ใช้ตอนใส่สายใหม่ เตียงที่คาสายอยู่แล้วจึงไม่ใช่ปลายทางที่ถูก
 *   2. กฎของระบบคือเตียงที่มีผู้ป่วยอยู่ต้องเข้าผ่านการสแกนป้ายประจำเตียงเท่านั้น
 *      ถ้าป้ายชุดอุปกรณ์พาเข้าเตียงที่มีผู้ป่วยได้ ก็เท่ากับเปิดทางลัดข้ามกฎนั้น
 */
export default async function KitPage(props: PageProps<'/kit'>) {
  const session = await getSession();
  if (!session) redirect('/login');

  const search = await props.searchParams;
  const kitCode = typeof search.code === 'string' ? search.code : '';

  // ต้องมาจากการสแกนป้ายจริงเท่านั้น พิมพ์ URL เองเข้าไม่ได้
  if (!isValidKitCode(kitCode) || !(await hasScanProof(kitCode))) {
    return (
      <InvalidTag reason="ต้องสแกน QR บนชุดอุปกรณ์ใส่สายเพื่อเข้าหน้านี้ กรุณาสแกนอีกครั้ง" />
    );
  }

  const study = await getActiveStudy();
  const wardCodes = session.wardCodes.length > 0 ? session.wardCodes : [study.ward_code];

  const { data: tags } = await db()
    .from('tag')
    .select('tag_code, bed_no, ward_code')
    .in('ward_code', wardCodes)
    .eq('is_retired', false);

  // ป้ายชุดอุปกรณ์ของหออื่นต้องไม่เปิดเตียงของหอนี้ได้
  const prefix = wardPrefixFromCode(kitCode);
  const beds = (tags ?? [])
    .filter((t) => wardPrefixFromCode(t.tag_code) === prefix)
    .sort((a, b) => Number(a.bed_no) - Number(b.bed_no));

  if (beds.length === 0) {
    return <InvalidTag reason="ป้ายชุดอุปกรณ์นี้ไม่ตรงกับหอผู้ป่วยที่คุณดูแล" />;
  }

  const { data: episodes } = await db()
    .from('episode')
    .select('bed_no, tag_code')
    .in('ward_code', wardCodes)
    .eq('is_active', true);

  const occupied = new Set((episodes ?? []).map((e) => e.bed_no));
  const free = beds.filter((b) => !occupied.has(b.bed_no));

  return (
    <>
      <AppHeader title="ใส่สายให้เตียงไหน" backHref="/" subtitle={`ชุดอุปกรณ์ · ${kitCode}`} />
      <main className="mx-auto max-w-2xl px-4 pb-16 pt-4">
        <p className="text-[13px] leading-relaxed" style={{ color: 'var(--muted)' }}>
          เลือกเตียงที่กำลังใส่สาย แล้วลงทะเบียนผู้ป่วยต่อได้ทันที
          ระบบจะเริ่มนับวันคาสายจากวันที่ลงทะเบียน
        </p>

        {free.length === 0 ? (
          <p
            className="surface mt-4 px-4 py-6 text-center text-sm leading-relaxed"
            style={{ color: 'var(--muted)' }}
          >
            ทุกเตียงในหอผู้ป่วยมีผู้ป่วยคาสายอยู่แล้ว
            <br />
            หากเป็นการเปลี่ยนสายให้ผู้ป่วยเดิม ให้สแกน QR ที่เตียงนั้นแล้วบันทึกถอดสายก่อน
          </p>
        ) : (
          <>
            <div className="mt-4 mb-2 flex items-baseline justify-between">
              <h2 className="text-base font-extrabold">เตียงว่าง</h2>
              <span className="text-sm font-bold tabular-nums" style={{ color: 'var(--muted)' }}>
                {free.length} เตียง
              </span>
            </div>
            <ul className="grid grid-cols-3 gap-2.5">
              {free.map((bed) => (
                <li key={bed.tag_code}>
                  <Link
                    href={`/bind/${bed.tag_code}`}
                    className="surface flex flex-col items-center gap-0.5 px-2 py-4"
                  >
                    <span
                      className="text-[22px] font-extrabold tabular-nums"
                      style={{ color: 'var(--primary)' }}
                    >
                      {bed.bed_no}
                    </span>
                    <span className="text-[11px]" style={{ color: 'var(--muted)' }}>
                      เตียง
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}

        {occupied.size > 0 && (
          <section className="mt-6">
            <h2 className="mb-2 text-base font-extrabold">เตียงที่มีผู้ป่วยคาสายอยู่</h2>
            <p className="mb-2 text-[13px] leading-relaxed" style={{ color: 'var(--muted)' }}>
              เลือกจากที่นี่ไม่ได้ หากเป็นการเปลี่ยนสายให้ผู้ป่วยเดิม
              ให้สแกน QR ที่เตียงนั้นแล้วบันทึกถอดสายก่อน จึงจะลงทะเบียนสายใหม่ได้
            </p>
            <ul className="grid grid-cols-3 gap-2.5">
              {beds
                .filter((b) => occupied.has(b.bed_no))
                .map((bed) => (
                  <li
                    key={bed.tag_code}
                    className="surface flex flex-col items-center gap-0.5 px-2 py-4"
                    style={{ opacity: 0.5 }}
                  >
                    <span className="text-[22px] font-extrabold tabular-nums">{bed.bed_no}</span>
                    <span className="text-[11px]" style={{ color: 'var(--muted)' }}>
                      คาสายอยู่
                    </span>
                  </li>
                ))}
            </ul>
          </section>
        )}

        <Link href="/" className="home-return mt-6">
          <UiIcon name="home" /> กลับหน้าหลัก
        </Link>
      </main>
    </>
  );
}
