'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { NURSE_LEVEL } from '@/lib/check5';
import { ResetPinButton } from '@/components/ResetPinButton';
import type { NurseLevelDb, UserRoleDb } from '@/types/database';

const ROLE_LABEL: Record<UserRoleDb, string> = {
  NURSE: 'พยาบาล',
  AUDITOR: 'ผู้ประเมิน',
  WARD_HEAD: 'หัวหน้าหอผู้ป่วย',
  IC_NURSE: 'พยาบาล IC',
  ADMIN: 'ผู้ดูแลระบบ',
};

export interface UserRow {
  userId: string;
  employeeId: string;
  fullName: string;
  role: UserRoleDb;
  wardCodes: string[];
  nurseLevel: NurseLevelDb | null;
  isActive: boolean;
  setOwnPin: boolean;
}

interface Issued {
  employeeId: string;
  fullName: string;
  pin: string;
}

/**
 * รายชื่อบัญชีผู้ใช้ พร้อมตั้ง PIN ใหม่ทีละบัญชีหรือหลายบัญชีพร้อมกัน
 *
 * ระบบเก็บเฉพาะ scrypt hash จึงดู PIN เดิมไม่ได้ไม่ว่าจะเป็นใคร
 * ทางเดียวที่ช่วยคนลืม PIN ได้คือตั้งให้ใหม่ ซึ่งแสดงครั้งเดียวตรงนี้
 */
export function UserList({ users }: { users: UserRow[] }) {
  const router = useRouter();
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [issued, setIssued] = useState<Issued[] | null>(null);
  const [failed, setFailed] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const toggle = (id: string) =>
    setPicked((prev) => {
      const next = new Set(prev);
      if (!next.delete(id)) next.add(id);
      return next;
    });

  async function resetPicked() {
    if (busy || picked.size === 0) return;
    const names = users.filter((u) => picked.has(u.userId)).map((u) => u.employeeId);
    if (!window.confirm(`ตั้ง PIN ใหม่ให้ ${names.length} บัญชี?\n${names.join(', ')}\n\nPIN เดิมของบัญชีเหล่านี้จะใช้ไม่ได้ทันที`)) return;

    setBusy(true);
    setError(null);
    try {
      const response = await fetch('/api/admin/users/reset-pins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userIds: [...picked] }),
      });
      const data = (await response.json().catch(() => ({}))) as {
        issued?: Issued[];
        failed?: string[];
        error?: string;
      };
      if (!response.ok || !data.issued) {
        setError(data.error ?? 'ตั้ง PIN ใหม่ไม่สำเร็จ');
        setBusy(false);
        return;
      }
      setIssued(data.issued);
      setFailed(data.failed ?? []);
      setPicked(new Set());
      router.refresh();
    } catch {
      setError('เชื่อมต่อเซิร์ฟเวอร์ไม่ได้');
    }
    setBusy(false);
  }

  return (
    <>
      {/* ── แผง PIN ที่เพิ่งตั้งให้ — แสดงครั้งเดียว ───────────────── */}
      {issued && (
        <section
          className="mt-4 rounded-xl border-l-4 px-4 py-3"
          style={{ background: 'var(--correct-bg)', borderColor: 'var(--correct)' }}
        >
          <h2 className="text-[14px] font-extrabold" style={{ color: 'var(--correct)' }}>
            ตั้ง PIN ใหม่ให้ {issued.length} บัญชีแล้ว
          </h2>
          <p className="mt-1 text-[12.5px] leading-relaxed" style={{ color: 'var(--correct)' }}>
            จดหรือแจกให้เจ้าตัวเดี๋ยวนี้ หน้านี้แสดงครั้งเดียวและดูย้อนหลังไม่ได้
            เพราะระบบเก็บเฉพาะค่าที่เข้ารหัสแล้ว
          </p>
          <ul className="mt-2.5 space-y-1">
            {issued.map((row) => (
              <li
                key={row.employeeId}
                className="flex items-center gap-3 rounded-lg px-3 py-2"
                style={{ background: 'var(--surface)' }}
              >
                <span className="min-w-0 flex-1 truncate text-[13px] font-bold">
                  {row.employeeId}
                  <span className="font-normal" style={{ color: 'var(--muted)' }}>
                    {' · '}
                    {row.fullName}
                  </span>
                </span>
                <span className="shrink-0 text-[17px] font-extrabold tracking-[0.2em] tabular-nums">
                  {row.pin}
                </span>
              </li>
            ))}
          </ul>
          {failed.length > 0 && (
            <p className="mt-2 text-[12.5px] font-semibold" style={{ color: 'var(--review)' }}>
              ตั้งไม่สำเร็จ {failed.length} บัญชี: {failed.join(', ')} — PIN เดิมยังใช้ได้อยู่
            </p>
          )}
          <button
            type="button"
            onClick={() => {
              setIssued(null);
              setFailed([]);
            }}
            className="mt-2.5 text-[12.5px] font-bold underline"
            style={{ color: 'var(--correct)' }}
          >
            รับทราบแล้ว ปิดรายการนี้
          </button>
        </section>
      )}

      {/* ── ตั้ง PIN ใหม่หลายบัญชีพร้อมกัน ───────────────────────── */}
      <section className="surface mt-4 px-4 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="min-w-0 flex-1 text-[13px] font-bold">
            เลือกแล้ว {picked.size} บัญชี
          </span>
          <button
            type="button"
            onClick={() => setPicked(new Set(users.map((u) => u.userId)))}
            className="rounded-lg px-3 py-2 text-[12.5px] font-bold"
            style={{ background: 'var(--surface-2)', color: 'var(--primary)' }}
          >
            เลือกทั้งหมด
          </button>
          <button
            type="button"
            onClick={() => setPicked(new Set())}
            className="rounded-lg px-3 py-2 text-[12.5px] font-bold"
            style={{ background: 'var(--surface-2)', color: 'var(--muted)' }}
          >
            ล้างการเลือก
          </button>
        </div>
        <button
          type="button"
          onClick={resetPicked}
          disabled={busy || picked.size === 0}
          className="btn-primary mt-2.5 w-full text-[15px]"
        >
          {busy
            ? 'กำลังตั้ง PIN ใหม่…'
            : picked.size === 0
              ? 'เลือกบัญชีเพื่อตั้ง PIN ใหม่'
              : `ตั้ง PIN ใหม่ให้ ${picked.size} บัญชี`}
        </button>
        {error && (
          <p role="alert" className="mt-2 text-[12.5px] font-semibold" style={{ color: 'var(--review)' }}>
            {error}
          </p>
        )}
      </section>

      <ul className="mt-4 space-y-2">
        {users.map((user) => (
          <li key={user.userId}>
            <div className="surface px-4 py-3" style={{ opacity: user.isActive ? 1 : 0.55 }}>
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={picked.has(user.userId)}
                  onChange={() => toggle(user.userId)}
                  aria-label={`เลือก ${user.employeeId} เพื่อตั้ง PIN ใหม่`}
                  className="h-5 w-5 shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <div className="truncate font-bold">
                    {user.employeeId}
                    <span className="font-normal" style={{ color: 'var(--muted)' }}>
                      {' · '}
                      {user.fullName}
                    </span>
                  </div>
                  <div className="text-[12.5px]" style={{ color: 'var(--muted)' }}>
                    {ROLE_LABEL[user.role]}
                    {user.wardCodes.length > 0 && ` · ${user.wardCodes.join(', ')}`}
                    {!user.isActive && ' · ปิดใช้งาน'}
                  </div>
                </div>
                {user.nurseLevel && (
                  <span
                    className="shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold"
                    style={{
                      background:
                        user.nurseLevel === 'RN' ? 'var(--surface-2)' : 'var(--pass-bg)',
                      color: user.nurseLevel === 'RN' ? 'var(--primary)' : 'var(--pass)',
                    }}
                    title={NURSE_LEVEL[user.nurseLevel]}
                  >
                    {user.nurseLevel}
                  </span>
                )}
              </div>

              <div
                className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 border-t pt-2"
                style={{ borderColor: 'var(--border)' }}
              >
                <span
                  className="min-w-0 flex-1 text-[12px]"
                  style={{ color: user.setOwnPin ? 'var(--muted)' : 'var(--correct)' }}
                >
                  {user.setOwnPin ? 'ตั้ง PIN เองแล้ว' : 'ยังใช้ PIN ที่ระบบตั้งให้'}
                </span>
                <ResetPinButton userId={user.userId} employeeId={user.employeeId} />
              </div>
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
