/**
 * แถบแจ้งเตือนช่วงเก็บข้อมูลพื้นฐาน
 *
 * จำเป็นเพราะถ้าไม่บอก พยาบาลที่บันทึกแล้วไม่เห็นคำแนะนำจะคิดว่าระบบเสีย
 * และเลิกใช้ตั้งแต่สัปดาห์แรก ซึ่งทำให้ไม่มีข้อมูล baseline ไว้เปรียบเทียบ
 *
 * ข้อความต้องย้ำว่าการดูแลผู้ป่วยยังเป็นไปตามมาตรฐานปกติ —
 * ระบบเพียงไม่แสดงคำแนะนำผ่านแอป ไม่ได้ห้ามแก้ไขปัญหาที่พบเห็น
 */
export function BaselineBanner() {
  return (
    <div
      className="flex gap-3 rounded-xl border px-4 py-3"
      style={{
        background: 'var(--surface-2)',
        borderColor: 'var(--border)',
      }}
    >
      <svg
        width="18"
        height="18"
        viewBox="0 0 20 20"
        fill="none"
        className="mt-0.5 shrink-0"
        aria-hidden="true"
      >
        <circle cx="10" cy="10" r="8.5" stroke="var(--muted)" strokeWidth="1.6" />
        <path
          d="M10 6v5M10 13.6v.4"
          stroke="var(--muted)"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>
      <div className="text-[13px] leading-relaxed" style={{ color: 'var(--muted)' }}>
        <strong style={{ color: 'var(--text)' }}>ช่วงเก็บข้อมูลพื้นฐาน</strong>
        {' — '}
        ระบบจะบันทึกคำตอบไว้แต่ยังไม่แสดงคำแนะนำ
        กรุณาดูแลผู้ป่วยตามแนวทางปกติของหน่วยงาน และแก้ไขสิ่งที่พบเห็นได้ตามเดิม
      </div>
    </div>
  );
}
