-- ════════════════════════════════════════════════════════════════════
--  แบบวินิจฉัยการติดเชื้อ (ข้อ 7–9 และ 10.2)
--
--  แยกจากตาราง assessment เพราะเป็นคนละกิจกรรม:
--    assessment            = พยาบาลประเมิน CHECK 5 ทุกเวร
--    infection_diagnosis   = IC/หัวหน้าหอสรุปการวินิจฉัยหนึ่งครั้งต่อ episode
-- ════════════════════════════════════════════════════════════════════

-- 10.2.1 สถานะการคาสายสวน ณ วัน DOE
create type catheter_at_doe as enum ('GT_2_DAYS', 'LE_2_DAYS', 'NONE');

-- 10.2.2 / 10.2.3 ผลเพาะเชื้อปัสสาวะ
create type urine_culture_result as enum ('NO_GROWTH', 'SIGNIFICANT');


create table infection_diagnosis (
  diagnosis_id  uuid primary key default gen_random_uuid(),

  -- หนึ่ง episode สรุปผลได้ครั้งเดียว แก้ไขทับของเดิมได้
  episode_id    uuid not null unique references episode(episode_id),

  admit_date    date not null,   -- ข้อ 7 วันแรกของการนอนโรงพยาบาลครั้งนี้
  doe_date      date not null,   -- ข้อ 8 วันแรกที่มีอาการแสดงการติดเชื้อ
  admit_dx      text,            -- ข้อ 9 DX แรกรับ

  -- HAI เมื่อ DOE − Admit ≥ 3 วัน มิฉะนั้นเป็น CI
  -- คำนวณในฐานข้อมูลเพื่อไม่ให้ค่าสรุปขัดกับวันที่ที่บันทึกไว้
  origin text generated always as (
    case when doe_date - admit_date >= 3 then 'HAI' else 'CI' end
  ) stored,

  catheter_at_doe catheter_at_doe      not null,
  uc_result       urine_culture_result not null,

  -- ชื่อเชื้อตรวจสอบกับรายการใน src/lib/infection.ts ก่อนบันทึก
  organisms text[] not null default '{}',

  diagnosed_by uuid not null references app_user(user_id),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),

  constraint infection_doe_after_admit check (doe_date >= admit_date),

  -- ข้อ 10.2.3 พบเชื้อได้ไม่เกิน 2 ชนิด
  -- ไม่พบเชื้อ (10.2.2) ต้องไม่มีรายการเชื้อค้างไว้จากการแก้ไขครั้งก่อน
  constraint infection_organisms_match_result check (
    (uc_result = 'NO_GROWTH'   and cardinality(organisms) = 0) or
    (uc_result = 'SIGNIFICANT' and cardinality(organisms) between 1 and 2)
  )
);

create index infection_diagnosis_origin_idx on infection_diagnosis(origin);

comment on column infection_diagnosis.origin is
  'HAI = ติดเชื้อในโรงพยาบาล, CI = ติดเชื้อในชุมชน — คำนวณจาก DOE ลบ Admit';
comment on column infection_diagnosis.admit_dx is
  'DX แรกรับ — ข้อความอิสระ อาจมีข้อมูลผู้ป่วย จึงไม่รวมในมุมมอง export งานวิจัย';

alter table infection_diagnosis enable row level security;
