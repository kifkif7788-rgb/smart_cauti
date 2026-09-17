-- ════════════════════════════════════════════════════════════════════
--  เปลี่ยนรหัสคุณวุฒิผู้ประเมินจาก PN เป็น NA (ผู้ช่วยเหลือคนไข้)
--
--  Postgres ลบค่าออกจาก enum ตรง ๆ ไม่ได้ จึงสร้าง type ใหม่แล้วย้ายคอลัมน์มาใช้
--  ยังไม่มีแถวใดบันทึกค่า PN ไว้ การแปลงชนิดจึงผ่านได้ทั้งหมด
--  ถ้ามีแถวที่ใช้ค่า PN คำสั่งแปลงจะล้มทั้ง transaction โดยไม่ทำข้อมูลเสีย
-- ════════════════════════════════════════════════════════════════════

alter type nurse_level rename to nurse_level_old;

create type nurse_level as enum ('RN', 'NA');

alter table assessment
  alter column nurse_level type nurse_level
  using nurse_level::text::nurse_level;

drop type nurse_level_old;

comment on column assessment.nurse_level is
  'คุณวุฒิของผู้ประเมิน RN = พยาบาลวิชาชีพ, NA = ผู้ช่วยเหลือคนไข้';
