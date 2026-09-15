'use client';

export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="btn-primary mt-4 w-full px-6 text-[15px] sm:w-auto"
    >
      พิมพ์ป้ายทั้งหมด
    </button>
  );
}
