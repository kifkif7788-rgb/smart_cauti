-- ════════════════════════════════════════════════════════════════════
--  Smart CAUTI GUARD — Initial schema
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
create table tag (
  tag_code    text primary key,
  ward_code   text        not null,
  is_retired  boolean     not null default false,
  created_at  timestamptz not null default now()
);

comment on column tag.tag_code is
  'รหัสป้าย 8 หลัก ไม่สื่อถึงผู้ป่วย เช่น SM-A17K3Q — QR เข้ารหัสด้วย HMAC';


-- ── episode ─────────────────────────────────────────────────────────
-- ช่วงการคาสายสวนของผู้ป่วยรายหนึ่ง
create table episode (
  episode_id      uuid primary key default gen_random_uuid(),
  study_id        uuid  not null references study(study_id),
  study_code      text  not null,
  tag_code        text  references tag(tag_code),
  ward_code       text  not null,
  bed_no          text  not null,
  insert_date     date  not null,
  remove_date     date,
  removal_reason  text,
  is_active       boolean not null default true,
  created_by      uuid  not null references app_user(user_id),
  created_at      timestamptz not null default now(),

  constraint episode_dates_ok check (remove_date is null or remove_date >= insert_date),
  -- ปิดแล้วต้องมีวันถอดสาย และยัง active ต้องไม่มี
  constraint episode_active_ok check (
    (is_active and remove_date is null) or (not is_active and remove_date is not null)
  )
);

-- ป้ายหนึ่งใบผูกกับ episode ที่ยัง active ได้เพียงรายการเดียว
create unique index episode_active_tag_idx
  on episode(tag_code) where is_active and tag_code is not null;

create index episode_active_ward_idx on episode(ward_code) where is_active;


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
alter table assessment          enable row level security;
alter table corrective_action   enable row level security;
alter table usability_response  enable row level security;
alter table audit_log           enable row level security;
