'use client';

import { useState } from 'react';
import {
  NURSE_LEVEL,
  NURSE_LEVEL_COOKIE,
  NURSE_LEVEL_MAX_AGE,
  type NurseLevel,
} from '@/lib/check5';

/**
 * เลือกคุณวุฒิผู้ประเมินครั้งเดียวต่อเวร
 *
 * เก็บเป็น cookie เพื่อให้หน้าประเมินซึ่ง render ฝั่ง server หยิบไปใช้ได้ทันที
 * ไม่ต้องรอ JavaScript ฝั่ง client อ่านค่าก่อน
 */
export function NurseLevelSwitch({ initial }: { initial: NurseLevel | null }) {
  const [level, setLevel] = useState<NurseLevel | null>(initial);

  function pick(next: NurseLevel) {
    document.cookie = `${NURSE_LEVEL_COOKIE}=${next}; path=/; max-age=${NURSE_LEVEL_MAX_AGE}; samesite=lax`;
    setLevel(next);
  }

  return (
    <section className="nurse-switch" aria-label="เลือกคุณวุฒิผู้ประเมิน">
      <div className="text-sm font-bold">ผู้ประเมินเวรนี้</div>
      <div className="mt-2 grid grid-cols-2 gap-2">
        {(Object.keys(NURSE_LEVEL) as NurseLevel[]).map((key) => {
          const active = level === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => pick(key)}
              aria-pressed={active}
              className="rounded-lg border px-3 py-3 text-[15px] font-bold"
              style={{
                background: active ? 'var(--primary)' : 'var(--surface-2)',
                borderColor: active ? 'var(--primary)' : 'var(--border)',
                color: active ? '#fff' : 'var(--text)',
              }}
            >
              {NURSE_LEVEL[key]}
            </button>
          );
        })}
      </div>
      <p className="mt-1.5 text-[12.5px]" style={{ color: 'var(--muted)' }}>
        {level
          ? 'ใช้กับทุกแบบประเมินในเวรนี้ เปลี่ยนได้ที่นี่'
          : 'เลือกก่อนเริ่มประเมิน จะใช้กับทุกเตียงในเวรนี้'}
      </p>
    </section>
  );
}
