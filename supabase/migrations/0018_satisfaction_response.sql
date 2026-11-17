-- ── satisfaction_response ───────────────────────────────────────────
-- แบบสอบถามความพึงพอใจสำหรับงานนำเสนอผลงาน
--
-- คนละชุดกับ usability_response ซึ่งเป็น SUS 10 ข้อของเจ้าหน้าที่ที่ใช้แอปจริง
-- แบบนี้ผู้เยี่ยมชมบูธตอบได้โดยไม่ต้องมีบัญชี จึงผูกกับ app_user ไม่ได้
-- และไม่เก็บสิ่งที่ระบุตัวผู้ตอบได้เลย เป็นแบบนิรนามจริง

create table satisfaction_response (
  response_id  uuid        primary key default gen_random_uuid(),

  -- คะแนน 1–5 เรียงตามลำดับข้อใน SATISFACTION_ITEMS
  -- เก็บเป็น array เพราะข้อคำถามอาจปรับก่อนงานถัดไป การเพิ่มคอลัมน์ทุกครั้งไม่คุ้ม
  scores       smallint[]  not null,
  comment      text,

  -- กันบันทึกซ้ำเมื่อกดสองครั้งหรือเครือข่ายสะดุดแล้วส่งใหม่
  client_uuid  text        not null unique,
  submitted_at timestamptz not null default now(),

  constraint satisfaction_scores_len check (array_length(scores, 1) = 5),
  constraint satisfaction_scores_range check (scores <@ array[1,2,3,4,5]::smallint[]),
  constraint satisfaction_comment_len check (comment is null or length(comment) <= 1000)
);

create index satisfaction_time_idx on satisfaction_response(submitted_at desc);

comment on table satisfaction_response is
  'ความพึงพอใจต่อแอป ชุดอุปกรณ์ โปสเตอร์ และบูธ — นิรนาม ไม่มีผู้ตอบและไม่มีข้อมูลผู้ป่วย';

alter table satisfaction_response enable row level security;
