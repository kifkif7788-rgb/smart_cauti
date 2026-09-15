'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { REMOVAL_REASONS } from '@/lib/hn';

interface Bed {
  bedNo: string;
  occupied: boolean;
}

interface Props {
  episodeId: string;
  bedNo: string;
  foleyDay: number;
  beds: Bed[];
  today: string;
  insertDate: string;
}

type Panel = 'none' | 'remove' | 'discharge' | 'transfer';

const DISCHARGE_REASONS = ['จำหน่ายผู้ป่วย', 'ย้ายหอผู้ป่วย', 'ผู้ป่วยเสียชีวิต'];

/**
 * ปุ่มจัดการผู้ป่วยที่เตียงนี้ — ย้ายเตียง ถอดสาย และจำหน่าย
 *
 * วางไว้ท้ายหน้าประเมินโดยตั้งใจ ไม่ใช่ด้านบน เพราะงานหลักของหน้านี้
 * คือการประเมิน CHECK 5 ส่วนปุ่มเหล่านี้ใช้นาน ๆ ครั้ง
 * และการกดพลาดมีผลต่อข้อมูล catheter-days
 */
export function EpisodeActions({
  episodeId,
  bedNo,
  foleyDay,
  beds,
  today,
  insertDate,
}: Props) {
  const router = useRouter();
  const [panel, setPanel] = useState<Panel>('none');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [reason, setReason] = useState<string>('');
  const [removeDate, setRemoveDate] = useState(today);
  const [targetBed, setTargetBed] = useState('');
  const [transferReason, setTransferReason] = useState('');

  const freeBeds = beds.filter((b) => !b.occupied && b.bedNo !== bedNo);

  const isDischarge = panel === 'discharge';
  const closeReasons = REMOVAL_REASONS.filter((item) =>
    isDischarge ? DISCHARGE_REASONS.includes(item) : !DISCHARGE_REASONS.includes(item),
  );

  function openPanel(next: Panel) {
    setError(null);
    setReason(next === 'discharge' ? 'จำหน่ายผู้ป่วย' : '');
    setRemoveDate(today);
    setPanel(next);
  }

  async function closeEpisode() {
    if (busy || !reason || !closeReasons.some((item) => item === reason) || !removeDate) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/episodes/${episodeId}/close`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason, removeDate }),
      });
      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? 'ปิดรายการไม่สำเร็จ');
      }
      router.push('/?closed=1');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'ปิดรายการไม่สำเร็จ');
      setBusy(false);
    }
  }

  async function transferBed() {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/episodes/${episodeId}/transfer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ toBedNo: targetBed, reason: transferReason }),
      });
      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
        tagCode?: string;
      };
      if (!response.ok) throw new Error(data.error ?? 'ย้ายเตียงไม่สำเร็จ');
      router.push(`/assess/${data.tagCode}?moved=${targetBed}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'ย้ายเตียงไม่สำเร็จ');
      setBusy(false);
    }
  }

  const fieldStyle = {
    background: 'var(--surface-2)',
    borderColor: 'var(--border)',
    color: 'var(--text)',
    minHeight: '48px',
  };

  return (
    <section className="mt-6">
      <h2 className="mb-2 text-sm font-extrabold" style={{ color: 'var(--muted)' }}>
        จัดการผู้ป่วยรายนี้
      </h2>

      {panel === 'none' && (
        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => openPanel('transfer')}
            className="surface px-3 py-4 text-center text-[14px] font-bold"
          >
            ย้ายเตียง
          </button>
          <button
            type="button"
            onClick={() => openPanel('remove')}
            className="surface px-3 py-4 text-center text-[14px] font-bold"
          >
            ถอดสาย
          </button>
          <button
            type="button"
            onClick={() => openPanel('discharge')}
            className="surface px-3 py-4 text-center text-[14px] font-bold"
          >
            จำหน่าย
          </button>
        </div>
      )}

      {/* ── ย้ายเตียง ─────────────────────────────────────────────── */}
      {panel === 'transfer' && (
        <div className="surface p-4">
          <h3 className="text-sm font-extrabold">ย้ายเตียง</h3>
          <p
            className="mt-1.5 rounded-lg px-3 py-2.5 text-[12.5px] leading-relaxed"
            style={{ background: 'var(--surface-2)', color: 'var(--muted)' }}
          >
            สายสวนเส้นเดิมยังอยู่ ระบบจะคงจำนวนวันคาสายไว้ที่{' '}
            <strong style={{ color: 'var(--text)' }}>วันที่ {foleyDay}</strong>{' '}
            และไม่เริ่มนับใหม่
          </p>

          <label htmlFor="target-bed" className="mt-3 block text-[13px] font-bold">
            ย้ายไปเตียง
          </label>
          {freeBeds.length === 0 ? (
            <p
              className="mt-1.5 rounded-lg px-3 py-3 text-[13px]"
              style={{ background: 'var(--correct-bg)', color: 'var(--correct)' }}
            >
              ไม่มีเตียงว่างในหอผู้ป่วยนี้ขณะนี้
            </p>
          ) : (
            <div className="mt-1.5 flex flex-wrap gap-2">
              {freeBeds.map((bed) => (
                <button
                  key={bed.bedNo}
                  type="button"
                  onClick={() => setTargetBed(bed.bedNo)}
                  className="rounded-lg border-2 px-3 text-[15px] font-bold tabular-nums"
                  style={{
                    minHeight: '48px',
                    minWidth: '52px',
                    borderColor: targetBed === bed.bedNo ? 'var(--primary)' : 'var(--border)',
                    background:
                      targetBed === bed.bedNo ? 'var(--surface-2)' : 'transparent',
                    color: targetBed === bed.bedNo ? 'var(--primary)' : 'var(--muted)',
                  }}
                >
                  {bed.bedNo}
                </button>
              ))}
            </div>
          )}

          <label htmlFor="transfer-reason" className="mt-3 block text-[13px] font-bold">
            หมายเหตุ <span style={{ color: 'var(--muted)' }}>(ถ้ามี)</span>
          </label>
          <input
            id="transfer-reason"
            value={transferReason}
            onChange={(e) => setTransferReason(e.target.value.slice(0, 200))}
            placeholder="เช่น ย้ายเข้าห้องแยก"
            className="mt-1.5 w-full rounded-lg border px-3.5 text-[15px]"
            style={fieldStyle}
          />

          {error && (
            <p
              role="alert"
              className="mt-3 rounded-lg px-3 py-2.5 text-[13px] font-semibold"
              style={{ background: 'var(--review-bg)', color: 'var(--review)' }}
            >
              {error}
            </p>
          )}

          <div className="mt-4 space-y-2.5">
            <button
              type="button"
              disabled={busy || !targetBed}
              onClick={transferBed}
              className="btn-primary w-full text-[15px]"
            >
              {busy ? 'กำลังย้าย…' : targetBed ? `ย้ายไปเตียง ${targetBed}` : 'เลือกเตียงปลายทาง'}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => { setPanel('none'); setError(null); }}
              className="w-full rounded-[10px] border text-[14px] font-semibold"
              style={{ minHeight: '48px', borderColor: 'var(--border)', color: 'var(--muted)' }}
            >
              ยกเลิก
            </button>
          </div>
        </div>
      )}

      {/* ── ปิดรายการ ─────────────────────────────────────────────── */}
      {(panel === 'remove' || panel === 'discharge') && (
        <div className="surface p-4">
          <h3 className="text-sm font-extrabold">{isDischarge ? 'จำหน่ายผู้ป่วย' : 'ถอดสายสวนปัสสาวะ'}</h3>
          <p
            className="mt-1.5 rounded-lg px-3 py-2.5 text-[12.5px] leading-relaxed"
            style={{ background: 'var(--surface-2)', color: 'var(--muted)' }}
          >
            เมื่อปิดรายการแล้ว เตียง {bedNo} จะว่างและพร้อมรับผู้ป่วยรายใหม่ผ่าน QR ใบเดิม
          </p>

          <span className="mt-3 block text-[13px] font-bold">เหตุผล</span>
          <div className="mt-1.5 flex flex-col gap-2">
            {closeReasons.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setReason(item)}
                className="rounded-lg border px-3 py-3 text-left text-[14px] font-semibold"
                style={{
                  minHeight: '48px',
                  borderColor: reason === item ? 'var(--primary)' : 'var(--border)',
                  background: reason === item ? 'var(--surface-2)' : 'transparent',
                  color: reason === item ? 'var(--primary)' : 'var(--muted)',
                }}
              >
                {item}
              </button>
            ))}
          </div>

          <label htmlFor="remove-date" className="mt-3 block text-[13px] font-bold">
            {isDischarge ? 'วันที่จำหน่าย / ออกจากหอผู้ป่วย' : 'วันที่ถอดสาย'}
          </label>
          <input
            id="remove-date"
            type="date"
            value={removeDate}
            min={insertDate}
            max={today}
            onChange={(e) => setRemoveDate(e.target.value)}
            className="mt-1.5 w-full rounded-lg border px-3.5 text-[16px]"
            style={fieldStyle}
          />
          <p className="mt-1.5 text-[12.5px]" style={{ color: 'var(--muted)' }}>
            {isDischarge
              ? 'ระบุวันที่จำหน่ายหรือออกจากหอผู้ป่วยตามจริง ระบบจะสิ้นสุดการติดตามรายการนี้'
              : 'หากถอดสายไปก่อนหน้านี้แล้วเพิ่งมาบันทึก ให้แก้วันที่ให้ตรงความจริง เพราะจำนวนวันคาสายใช้คำนวณตัวชี้วัดของโครงการ'}
          </p>

          {error && (
            <p
              role="alert"
              className="mt-3 rounded-lg px-3 py-2.5 text-[13px] font-semibold"
              style={{ background: 'var(--review-bg)', color: 'var(--review)' }}
            >
              {error}
            </p>
          )}

          <div className="mt-4 space-y-2.5">
            <button
              type="button"
              disabled={busy || !reason || !removeDate}
              onClick={closeEpisode}
              className="w-full rounded-[10px] text-[15px] font-bold text-white"
              style={{ minHeight: '52px', background: 'var(--review)', opacity: !reason ? 0.45 : 1 }}
            >
              {busy ? 'กำลังบันทึก…' : isDischarge ? 'ยืนยันจำหน่ายผู้ป่วย' : 'ยืนยันถอดสาย'}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => { setPanel('none'); setError(null); }}
              className="w-full rounded-[10px] border text-[14px] font-semibold"
              style={{ minHeight: '48px', borderColor: 'var(--border)', color: 'var(--muted)' }}
            >
              ยกเลิก
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
