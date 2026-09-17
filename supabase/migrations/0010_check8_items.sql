-- ════════════════════════════════════════════════════════════════════
--  ขยาย CHECK 5 เป็น CHECK 8
--    hand  — การล้างมือก่อนและหลังสัมผัสระบบ
--    flash — การทำความสะอาดอวัยวะสืบพันธุ์และรอบสาย
--    drain — การเทปัสสาวะและบันทึกปริมาณ
--
--  คอลัมน์ใหม่เปิดให้ว่างได้ เพราะการประเมินที่บันทึกไว้ก่อนหน้านี้ไม่มีข้อเหล่านี้
--  ค่าว่างจึงแปลว่า "ยังไม่เคยถาม" ซึ่งต่างจาก false ที่แปลว่า "ตอบว่าไม่ผ่าน"
-- ════════════════════════════════════════════════════════════════════

alter table assessment
  add column hand  boolean,
  add column flash boolean,
  add column drain boolean;

comment on column assessment.hand is
  'ข้อที่เพิ่มภายหลัง — null คือการประเมินครั้งนั้นยังไม่มีข้อนี้';
comment on column assessment.flash is
  'ข้อที่เพิ่มภายหลัง — null คือการประเมินครั้งนั้นยังไม่มีข้อนี้';
comment on column assessment.drain is
  'ข้อที่เพิ่มภายหลัง — null คือการประเมินครั้งนั้นยังไม่มีข้อนี้';

-- all_pass เป็นคอลัมน์ generated จึงต้องสร้างใหม่เพื่อรวมข้อที่เพิ่มเข้ามา
-- มุมมอง research_assessment อ้างถึงคอลัมน์นี้ ต้องถอดออกก่อนแล้วสร้างคืน
drop view research_assessment;

alter table assessment drop column all_pass;

-- coalesce ทำให้แถวเก่าคงค่าเดิม ไม่ถูกตีว่าไม่ผ่านย้อนหลัง
-- ความหมายของ all_pass คือ "ผ่านทุกข้อที่ถูกถามในการประเมินครั้งนั้น"
alter table assessment
  add column all_pass boolean generated always as (
    need and fix and flow and below and closed
    and coalesce(hand, true)
    and coalesce(flash, true)
    and coalesce(drain, true)
  ) stored;

-- สร้างมุมมองคืน พร้อมสามข้อใหม่เพื่อให้วิเคราะห์แยกรายข้อได้
create view research_assessment as
select
  a.assessment_id,
  e.study_code,
  a.source,
  a.nurse_level,
  a.study_mode,
  a.assessed_at,
  a.shift,
  a.foley_day,
  a.need, a.fix, a.flow, a.below, a.closed,
  a.hand, a.flash, a.drain,
  a.all_pass,
  a.feedback,
  e.ward_code,
  e.insert_date,
  e.remove_date
from assessment a
join episode e on e.episode_id = a.episode_id;

comment on view research_assessment is
  'ข้อมูลการประเมินสำหรับวิเคราะห์สถิติ — ไม่มี HN, เตียง หรือหมายเหตุที่อาจระบุตัวผู้ป่วย';
