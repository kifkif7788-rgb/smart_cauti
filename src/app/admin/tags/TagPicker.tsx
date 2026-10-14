'use client';

import { useState } from 'react';
import styles from './tags.module.css';

export interface TagCard {
  /** รหัสป้าย ใช้เป็นคีย์ของการเลือกด้วย */
  code: string;
  /** ข้อความใหญ่กลางการ์ด — เลขเตียง หรือ SET สำหรับป้ายชุดอุปกรณ์ */
  heading: string;
  headingLabel: string;
  headingCaption: string;
  wardCode: string;
  svg: string;
  footerTitle: string;
  footerNote: string;
}

function Card({
  card,
  selected,
  onToggle,
}: {
  card: TagCard;
  selected: boolean;
  onToggle: () => void;
}) {
  return (
    <article className={`${styles.card} ${selected ? '' : styles.unselected}`}>
      {/* แถบเลือกอยู่บนสุดของการ์ด แตะตรงไหนก็ได้ทั้งแถบ เพราะนิ้วแตะช่องเล็กยาก */}
      <label className={`${styles.pick} ${styles.screenOnly}`}>
        <input type="checkbox" checked={selected} onChange={onToggle} />
        <span>{selected ? 'จะพิมพ์' : 'ไม่พิมพ์'}</span>
      </label>
      <div className={styles.cardTop}>
        <span>
          Smart <b>CAUTI</b>
        </span>
        <span className={styles.ward}>{card.wardCode}</span>
      </div>
      <div className={styles.bed}>
        <span>{card.headingLabel}</span>
        <strong>{card.heading}</strong>
        <span className={styles.bedCaption}>{card.headingCaption}</span>
      </div>
      <div className={styles.qrFrame}>
        <div
          className={styles.qr}
          role="img"
          aria-label={`QR ${card.headingLabel} ${card.heading} รหัส ${card.code}`}
          // SVG comes only from the server QR encoder, never from user-supplied markup.
          dangerouslySetInnerHTML={{ __html: card.svg }}
        />
      </div>
      <div className={styles.code}>{card.code}</div>
      <div className={styles.cardFooter}>
        <strong>{card.footerTitle}</strong>
        <span>{card.footerNote}</span>
      </div>
    </article>
  );
}

/**
 * เลือกว่าจะพิมพ์ป้ายใบไหนบ้าง
 *
 * ป้ายชำรุดทีละใบเป็นเรื่องปกติในหอผู้ป่วย การพิมพ์ใหม่ทั้งแผ่นเพื่อเอาใบเดียว
 * เปลืองทั้งกระดาษและวัสดุกันน้ำที่ต้องเคลือบทับ
 *
 * เริ่มต้นเลือกไว้ทุกใบ เพื่อให้การพิมพ์ทั้งชุดครั้งแรกยังกดปุ่มเดียวจบ
 * ใบที่ไม่ได้เลือกจะจางลงบนหน้าจอ และไม่ถูกส่งไปเครื่องพิมพ์เลย
 */
export function TagPicker({ beds, kit }: { beds: TagCard[]; kit: TagCard | null }) {
  const all = [...(kit ? [kit] : []), ...beds];
  const [selected, setSelected] = useState<Set<string>>(() => new Set(all.map((c) => c.code)));

  const toggle = (code: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (!next.delete(code)) next.add(code);
      return next;
    });

  const count = selected.size;

  return (
    <>
      <section className={`${styles.printGuide} ${styles.screenOnly}`} aria-label="คำแนะนำการพิมพ์">
        <div>
          <h2>เตรียมป้ายให้พร้อมใช้งาน</h2>
          <p>
            พิมพ์ A4 ขนาดจริง 100% แล้วตัดตามกรอบ ติดที่หัวเตียงหรือราวเตียงด้วยวัสดุกันน้ำ
            เลือกเฉพาะใบที่ต้องการพิมพ์ได้ เช่น เมื่อต้องพิมพ์ใหม่แทนใบที่ชำรุด
          </p>
          <div className={styles.pickActions}>
            <button type="button" onClick={() => setSelected(new Set(all.map((c) => c.code)))}>
              เลือกทั้งหมด
            </button>
            <button type="button" onClick={() => setSelected(new Set())}>
              ล้างการเลือก
            </button>
            <span aria-live="polite">
              เลือกแล้ว {count} จาก {all.length} ใบ
            </span>
          </div>
        </div>
        <div className={styles.printAction}>
          <button
            type="button"
            onClick={() => window.print()}
            disabled={count === 0}
            className="btn-primary mt-4 w-full px-6 text-[15px] sm:w-auto"
          >
            {count === 0 ? 'ยังไม่ได้เลือกป้าย' : `พิมพ์ป้ายที่เลือก ${count} ใบ`}
          </button>
          <small>จัดหน้าให้อัตโนมัติ · 3 คอลัมน์ต่อแผ่น</small>
        </div>
      </section>

      {kit && (
        <>
          <div className={`${styles.sectionHeading} ${styles.screenOnly}`}>
            <h2>ป้ายชุดอุปกรณ์ใส่สาย</h2>
            <p>ติดบนชุด set kit · พิมพ์ได้หลายใบ ทุกใบใช้รหัสเดียวกัน</p>
          </div>
          <div className={styles.grid}>
            <Card card={kit} selected={selected.has(kit.code)} onToggle={() => toggle(kit.code)} />
          </div>
        </>
      )}

      <div className={`${styles.sectionHeading} ${styles.screenOnly}`}>
        <h2>
          ป้ายประจำเตียงทั้งหมด <span>{beds.length}</span>
        </h2>
        <p>ใช้ซ้ำได้เมื่อเปลี่ยนผู้ป่วย</p>
      </div>

      {beds.length === 0 ? (
        <div className={styles.empty}>
          <h2>ยังไม่มีป้ายในหอผู้ป่วยนี้</h2>
          <p>เมื่อเพิ่มข้อมูลป้ายประจำเตียงในระบบแล้ว ป้าย QR จะแสดงที่นี่</p>
        </div>
      ) : (
        <div className={styles.grid}>
          {beds.map((card) => (
            <Card
              key={card.code}
              card={card}
              selected={selected.has(card.code)}
              onToggle={() => toggle(card.code)}
            />
          ))}
        </div>
      )}
    </>
  );
}
