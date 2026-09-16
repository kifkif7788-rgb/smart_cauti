-- ════════════════════════════════════════════════════════════════════
--  ข้อ 10.2.4 อาการแสดงการติดเชื้อ
--
--  หนึ่งการวินิจฉัยมีได้หลายอาการ แต่ละอาการมีช่วงวันที่ของตัวเอง
--  แยกเป็นตารางแทน jsonb เพื่อให้นับความถี่รายอาการในรายงานวิจัยได้ตรง ๆ
-- ════════════════════════════════════════════════════════════════════

create type infection_symptom_code as enum (
  'FEVER',                  -- 1 มีไข้ > 38 องศาเซลเซียส
  'HYPOTHERMIA',            -- 2 ตัวเย็น อุณหภูมิ < 36 องศาเซลเซียส
  'DYSURIA',                -- 3 ปัสสาวะแสบขัด
  'SEDIMENT',               -- 4 ปัสสาวะมีตะกอน
  'FREQUENCY',              -- 5 ปัสสาวะบ่อย
  'URGENCY',                -- 6 ปัสสาวะเฉียบพลัน
  'SUPRAPUBIC_TENDERNESS',  -- 7 กดเจ็บบริเวณหัวหน่าว
  'CVA_TENDERNESS',         -- 8 ปวดหลัง/กดเจ็บ Costovertebral angle
  'APNEA',                  -- 9 หยุดหายใจชั่วขณะ (อายุ < 1 ปี)
  'BRADYCARDIA',            -- 10 หัวใจเต้นช้าผิดปกติ (อายุ < 1 ปี)
  'LETHARGY',               -- 11 ซึมไม่มีสาเหตุอื่น (อายุ < 1 ปี)
  'VOMITING'                -- 12 อาเจียนไม่มีสาเหตุอื่น (อายุ < 1 ปี)
);

create table infection_symptom (
  symptom_id   uuid not null primary key default gen_random_uuid(),

  -- ลบพร้อมการวินิจฉัย เพราะการบันทึกซ้ำคือการแทนที่ชุดอาการทั้งชุด
  diagnosis_id uuid not null references infection_diagnosis(diagnosis_id) on delete cascade,

  code       infection_symptom_code not null,
  onset_date date not null,
  end_date   date,

  -- หนึ่งอาการบันทึกได้ครั้งเดียวต่อการวินิจฉัย
  constraint infection_symptom_unique unique (diagnosis_id, code),
  constraint infection_symptom_dates_ok check (end_date is null or end_date >= onset_date)
);

create index infection_symptom_diagnosis_idx on infection_symptom(diagnosis_id);
create index infection_symptom_code_idx on infection_symptom(code);

comment on table infection_symptom is
  'อาการแสดงการติดเชื้อตามข้อ 10.2.4 — เลือกได้มากกว่าหนึ่งอาการ';
comment on column infection_symptom.code is
  'ข้อ 3, 5 และ 7 ใช้ได้เฉพาะผู้ป่วยที่ถอดสายสวนแล้ว เพราะผู้ที่ยังคาสายอาจมีอาการเหล่านี้โดยไม่ได้ติดเชื้อ';

alter table infection_symptom enable row level security;
