/** แสดงโหมดที่ใช้จัดกลุ่มข้อมูล โดยทุกโหมดเปิดผลและคำแนะนำ */
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
        ระบบบันทึกข้อมูลในโหมด BASELINE พร้อมแสดงผลและคำแนะนำหลังส่งแบบประเมิน
      </div>
    </div>
  );
}
