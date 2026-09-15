-- ════════════════════════════════════════════════════════════════════
--  Smart CAUTI — Initial schema
--  อ้างอิง: Web Application Specification v1.0 ส่วนที่ 7 (Data Model)
--
--  หลักการสำคัญด้าน PDPA:
--    ตารางในสคีมานี้ "ไม่เก็บ" HN, ชื่อ-สกุล หรือข้อมูลระบุตัวตนผู้ป่วย
--    ใช้ study_code (Study ID) ที่หน่วยงานกำหนดเท่านั้น
--    ตารางเชื่อม study_code ↔ HN เก็บแยกนอกระบบตามนโยบายหน่วยงาน
-- ════════════════════════════════════════════════════════════════════

create extension if not exists "pgcrypto";

-- ── Enums ───────────────────────────────────────────────────────────
create type study_mode   as enum ('BASELINE', 'INTERVENTION');
create type user_role    as enum ('NURSE', 'AUDITOR', 'WARD_HEAD', 'IC_NURSE', 'ADMIN');
create type shift_type   as enum ('MORNING', 'AFTERNOON', 'NIGHT');
create type source_type  as enum ('NURSE', 'AUDITOR');
create type feedback_type as enum ('PASS', 'CORRECT_NOW', 'REVIEW_REMOVAL', 'CLOSED_BREACH');
create type action_status as enum ('CORRECTED', 'ESCALATED', 'UNABLE');


-- ── study ───────────────────────────────────────────────────────────
-- การตั้งค่าโครงการ มีแถวเดียวต่อหนึ่งโครงการนำร่อง
create table study (
  study_id            uuid primary key default gen_random_uuid(),
  name                text        not null,
  ward_code           text        not null,
  current_mode        study_mode  not null default 'BASELINE',
  baseline_start      date        not null,
  intervention_start  date,
  study_end           date        not null,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

comment on column study.current_mode is
  'BASELINE = เก็บข้อมูลโดยไม่แสดง feedback; INTERVENTION = แสดง feedback เต็มรูปแบบ';


-- ── study_mode_log ──────────────────────────────────────────────────
-- Audit trail ของการสลับโหมด (spec ส่วนที่ 3)
create table study_mode_log (
  log_id       uuid primary key default gen_random_uuid(),
  study_id     uuid not null references study(study_id),
  from_mode    study_mode not null,
  to_mode      study_mode not null,
  reason       text       not null,
  changed_by   uuid       not null,
  changed_at   timestamptz not null default now()
);


-- ── app_user ────────────────────────────────────────────────────────
-- ใช้ชื่อ app_user เพราะ "user" เป็นคำสงวนของ Postgres
create table app_user (
  user_id       uuid primary key default gen_random_uuid(),
  employee_id   text        not null unique,
  full_name     text        not null,
  role          user_role   not null default 'NURSE',
  ward_codes    text[]      not null default '{}',
  pin_hash      text        not null,
  line_user_id  text,
  is_active     boolean     not null default true,
  created_at    timestamptz not null default now()
);

create index app_user_employee_idx on app_user(employee_id) where is_active;


-- ── tag ─────────────────────────────────────────────────────────────
-- ป้าย QR กันน้ำ ผูกกับ episode ได้ครั้งละหนึ่ง และนำกลับมาใช้ซ้ำได้
-- ป้าย QR หนึ่งใบต่อหนึ่งเตียง ติดถาวรที่หัวเตียง ไม่ผูกกับผู้ป่วยรายใด
create table tag (
  tag_code    text primary key,
  ward_code   text        not null,
  bed_no      text        not null,
  is_retired  boolean     not null default false,
  created_at  timestamptz not null default now(),

  -- หนึ่งเตียงมีป้ายได้ใบเดียว และหนึ่งป้ายใช้กับเตียงเดียว
  constraint tag_one_per_bed unique (ward_code, bed_no)
);

comment on table tag is
  'ป้าย QR ประจำเตียง เช่น SM-B01 = เตียง 1 — QR บรรจุเพียงรหัสเตียงกับ HMAC '
  'ไม่มีข้อมูลผู้ป่วยใด ๆ เพราะป้ายอยู่ในตำแหน่งที่ผู้อื่นมองเห็นได้';


-- ── study_code sequence ─────────────────────────────────────────────
-- Study ID สร้างอัตโนมัติเรียงลำดับ (SM-001, SM-002, …)
-- ใช้ใน export ข้อมูลวิจัยแทน HN เพื่อให้ชุดข้อมูลที่ส่งออกเป็น de-identified
create sequence study_code_seq start 1;


-- ── episode ─────────────────────────────────────────────────────────
-- ช่วงการคาสายสวนของผู้ป่วยรายหนึ่ง ณ เตียงหนึ่ง
create table episode (
  episode_id      uuid  primary key default gen_random_uuid(),
  study_id        uuid  not null references study(study_id),

  -- HN ใช้ในงานประจำวันเพื่อยืนยันตัวผู้ป่วยและเชื่อมข้อมูลกับ HIS
  -- เก็บในฐานข้อมูลเท่านั้น ไม่เคยปรากฏใน QR และไม่อยู่ในไฟล์ export ของงานวิจัย
  hn              text  not null,

  -- Study ID สร้างอัตโนมัติ ใช้แทน HN ในทุกการวิเคราะห์และรายงาน
  study_code      text  not null unique
                    default 'SM-' || lpad(nextval('study_code_seq')::text, 3, '0'),

  tag_code        text  references tag(tag_code),
  ward_code       text  not null,
  bed_no          text  not null,
  insert_date     date  not null,
  remove_date     date,
  removal_reason  text,
  is_active       boolean not null default true,
  created_by      uuid  not null references app_user(user_id),
  closed_by       uuid  references app_user(user_id),
  created_at      timestamptz not null default now(),

  constraint episode_dates_ok check (remove_date is null or remove_date >= insert_date),
  -- ปิดแล้วต้องมีวันถอดสาย และยัง active ต้องไม่มี
  constraint episode_active_ok check (
    (is_active and remove_date is null) or (not is_active and remove_date is not null)
  ),
  constraint episode_hn_ok check (hn ~ '^[A-Za-z0-9-]{4,15}$')
);

comment on column episode.hn is
  'HN ผู้ป่วย — ข้อมูลส่วนบุคคล จำกัดการเข้าถึงตาม role และบันทึก audit log';
comment on column episode.study_code is
  'รหัสสำหรับงานวิจัย สร้างอัตโนมัติ — ใช้แทน HN ในทุกไฟล์ export';

-- หนึ่งเตียงมีผู้ป่วยที่คาสายอยู่ได้รายเดียว
-- ป้องกันการเปิด episode ใหม่ทับรายเดิมที่ยังไม่ได้ปิด
create unique index episode_active_bed_idx
  on episode(ward_code, bed_no) where is_active;

create index episode_active_ward_idx on episode(ward_code) where is_active;
create index episode_hn_idx on episode(hn);


-- ── bed_transfer ────────────────────────────────────────────────────
-- ประวัติการย้ายเตียงของผู้ป่วยที่ยังคาสายอยู่
--
-- การย้ายเตียงไม่ใช่การเริ่ม episode ใหม่ — สายสวนเส้นเดิมยังอยู่
-- จึงต้องคง insert_date และ study_code ไว้ มิฉะนั้น catheter-days
-- จะถูกรีเซ็ตและตัวเลข Foley Day จะต่ำกว่าความจริง
create table bed_transfer (
  transfer_id   uuid primary key default gen_random_uuid(),
  episode_id    uuid not null references episode(episode_id),
  from_bed_no   text not null,
  to_bed_no     text not null,
  from_tag_code text,
  to_tag_code   text,
  reason        text,
  moved_by      uuid not null references app_user(user_id),
  moved_at      timestamptz not null default now(),

  constraint bed_transfer_different check (from_bed_no <> to_bed_no)
);

create index bed_transfer_episode_idx on bed_transfer(episode_id, moved_at desc);


-- ── assessment ──────────────────────────────────────────────────────
-- การประเมิน CHECK 5 รายครั้ง
create table assessment (
  assessment_id  uuid primary key default gen_random_uuid(),
  client_uuid    text        not null unique,  -- idempotent offline sync
  episode_id     uuid        not null references episode(episode_id),
  assessor_id    uuid        not null references app_user(user_id),
  source         source_type not null default 'NURSE',
  study_mode     study_mode  not null,         -- บันทึกจริง ไม่อนุมานย้อนหลัง
  assessed_at    timestamptz not null default now(),
  shift          shift_type  not null,
  foley_day      integer     not null,

  need    boolean not null,
  fix     boolean not null,
  flow    boolean not null,
  below   boolean not null,
  closed  boolean not null,

  all_pass boolean generated always as (need and fix and flow and below and closed) stored,
  feedback feedback_type not null,
  notes    text,

  created_at timestamptz not null default now(),

  constraint assessment_notes_len check (notes is null or length(notes) <= 500),
  constraint assessment_foley_day_ok check (foley_day >= 0)
);

create index assessment_episode_idx on assessment(episode_id, assessed_at desc);
create index assessment_mode_idx    on assessment(study_mode, source, assessed_at);


-- ── corrective_action ───────────────────────────────────────────────
create table corrective_action (
  action_id      uuid primary key default gen_random_uuid(),
  assessment_id  uuid          not null references assessment(assessment_id),
  items_corrected text[]       not null default '{}',
  status         action_status not null,
  unable_reason  text,
  performed_by   uuid          not null references app_user(user_id),
  performed_at   timestamptz   not null default now(),

  -- ถ้าแก้ไขไม่ได้ ต้องระบุเหตุผล เพื่อให้ corrective action rate สะท้อนความจริง
  constraint corrective_unable_reason_ok check (
    status <> 'UNABLE' or (unable_reason is not null and length(trim(unable_reason)) > 0)
  )
);

create index corrective_assessment_idx on corrective_action(assessment_id);


-- ── usability_response ──────────────────────────────────────────────
create table usability_response (
  response_id  uuid primary key default gen_random_uuid(),
  user_id      uuid      not null unique references app_user(user_id),
  scores       smallint[] not null,
  comment      text,
  submitted_at timestamptz not null default now(),

  constraint usability_scores_len check (array_length(scores, 1) = 10)
);


-- ── audit_log ───────────────────────────────────────────────────────
create table audit_log (
  audit_id    uuid primary key default gen_random_uuid(),
  actor_id    uuid,
  action      text        not null,
  entity      text        not null,
  entity_id   text,
  detail      jsonb,
  created_at  timestamptz not null default now()
);

create index audit_log_created_idx on audit_log(created_at desc);


-- ── RLS ─────────────────────────────────────────────────────────────
-- ทุกการเข้าถึงผ่าน service role ฝั่ง server เท่านั้น (ไม่มี client key)
-- เปิด RLS แบบไม่มี policy = ปฏิเสธทุก request จาก anon/authenticated key
alter table study               enable row level security;
alter table study_mode_log      enable row level security;
alter table app_user            enable row level security;
alter table tag                 enable row level security;
alter table episode             enable row level security;
alter table bed_transfer        enable row level security;
alter table assessment          enable row level security;
alter table corrective_action   enable row level security;
alter table usability_response  enable row level security;
alter table audit_log           enable row level security;


-- ── มุมมองสำหรับ export งานวิจัย ─────────────────────────────────────
-- ไม่มีคอลัมน์ hn โดยตั้งใจ — ใช้ study_code แทน
-- เพื่อให้ชุดข้อมูลที่ส่งออกไปวิเคราะห์เป็น de-identified ตั้งแต่ต้นทาง
create view research_assessment as
select
  a.assessment_id,
  e.study_code,
  a.source,
  a.study_mode,
  a.assessed_at,
  a.shift,
  a.foley_day,
  a.need, a.fix, a.flow, a.below, a.closed,
  a.all_pass,
  a.feedback,
  e.ward_code,
  e.insert_date,
  e.remove_date
from assessment a
join episode e on e.episode_id = a.episode_id;

comment on view research_assessment is
  'ข้อมูลการประเมินสำหรับวิเคราะห์สถิติ — ไม่มี HN, เตียง หรือหมายเหตุที่อาจระบุตัวผู้ป่วย';
