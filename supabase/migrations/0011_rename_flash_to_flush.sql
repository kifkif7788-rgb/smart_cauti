-- ════════════════════════════════════════════════════════════════════
--  แก้ชื่อข้อ FLASH เป็น FLUSH ให้ตรงกับคำที่ถูกต้อง
--
--  เปลี่ยนชื่อคอลัมน์ด้วย ไม่ใช่แค่ป้ายบนหน้าจอ เพื่อให้ไฟล์ export
--  ของงานวิจัยใช้ชื่อเดียวกับที่ผู้ใช้เห็น
--  มุมมอง research_assessment อ้างถึงคอลัมน์นี้ ต้องสร้างคืนหลังเปลี่ยนชื่อ
-- ════════════════════════════════════════════════════════════════════

drop view research_assessment;

alter table assessment rename column flash to flush;

comment on column assessment.flush is
  'ข้อที่เพิ่มภายหลัง — null คือการประเมินครั้งนั้นยังไม่มีข้อนี้';

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
  a.hand, a.flush, a.drain,
  a.all_pass,
  a.feedback,
  e.ward_code,
  e.insert_date,
  e.remove_date
from assessment a
join episode e on e.episode_id = a.episode_id;

comment on view research_assessment is
  'ข้อมูลการประเมินสำหรับวิเคราะห์สถิติ — ไม่มี HN, เตียง หรือหมายเหตุที่อาจระบุตัวผู้ป่วย';
