'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
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
  const router = useRouter();
  const [level, setLevel] = useState<NurseLevel | null>(initial);

  function pick(next: NurseLevel) {
    document.cookie = `${NURSE_LEVEL_COOKIE}=${next}; path=/; max-age=${NURSE_LEVEL_MAX_AGE}; samesite=lax`;
    setLevel(next);
    // ปุ่มสแกนเป็น server component จึงต้อง render ใหม่เพื่อให้ปลดล็อกทันที
    router.refresh();
  }

  return (
    <section className="nurse-switch" aria-label="เลือกคุณวุฒิผู้ประเมิน">
      <div className="nurse-switch-title">ผู้ประเมินเวรนี้</div>
      <div className="nurse-pills">
        {(Object.keys(NURSE_LEVEL) as NurseLevel[]).map((key) => {
          const active = level === key;
          const [code, name] = NURSE_LEVEL[key].split(' · ');
          return (
            <button
              key={key}
              type="button"
              onClick={() => pick(key)}
              aria-pressed={active}
              data-level={key}
              className={`nurse-pill${active ? ' is-active' : ''}`}
            >
              <span className="nurse-pill-code">{code}</span>
              <span className="nurse-pill-name">{name}</span>
              {active && (
                <svg viewBox="0 0 20 20" aria-hidden="true" className="nurse-pill-check">
                  <path
                    d="m4 10.5 4 4 8-9"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </button>
          );
        })}
      </div>
      <p className="nurse-switch-hint">
        {level
          ? 'ใช้กับทุกแบบประเมินในเวรนี้ เปลี่ยนได้ที่นี่'
          : 'เลือกก่อนเริ่มประเมิน จะใช้กับทุกเตียงในเวรนี้'}
      </p>
    </section>
  );
}
