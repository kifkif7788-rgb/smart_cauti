-- ════════════════════════════════════════════════════════════════════
--  ตัดอาการเฉพาะผู้ป่วยอายุต่ำกว่า 1 ปี ออกจากแบบฟอร์ม
--  (หยุดหายใจชั่วขณะ, หัวใจเต้นช้าผิดปกติ, ซึม, อาเจียน)
--
--  Postgres ลบค่าออกจาก enum ตรง ๆ ไม่ได้ จึงสร้าง type ใหม่แล้วย้ายคอลัมน์มาใช้
--  ถ้ามีแถวใดใช้ค่าที่ตัดออก คำสั่งแปลงชนิดจะล้มทั้ง transaction โดยไม่ทำข้อมูลเสีย
-- ════════════════════════════════════════════════════════════════════

alter type infection_symptom_code rename to infection_symptom_code_old;

create type infection_symptom_code as enum (
  'FEVER',
  'HYPOTHERMIA',
  'DYSURIA',
  'SEDIMENT',
  'FREQUENCY',
  'URGENCY',
  'SUPRAPUBIC_TENDERNESS',
  'CVA_TENDERNESS'
);

alter table infection_symptom
  alter column code type infection_symptom_code
  using code::text::infection_symptom_code;

drop type infection_symptom_code_old;
