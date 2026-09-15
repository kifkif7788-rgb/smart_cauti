/**
 * Type สำหรับตารางใน Supabase
 * ตรงกับ supabase/migrations/0001_init.sql
 */

export type StudyMode = 'BASELINE' | 'INTERVENTION';
export type UserRoleDb = 'NURSE' | 'AUDITOR' | 'WARD_HEAD' | 'IC_NURSE' | 'ADMIN';
export type ShiftDb = 'MORNING' | 'AFTERNOON' | 'NIGHT';
export type SourceDb = 'NURSE' | 'AUDITOR';
export type FeedbackDb = 'PASS' | 'CORRECT_NOW' | 'REVIEW_REMOVAL' | 'CLOSED_BREACH';
export type ActionStatusDb = 'CORRECTED' | 'ESCALATED' | 'UNABLE';

export type StudyRow = {
  study_id: string;
  name: string;
  ward_code: string;
  current_mode: StudyMode;
  baseline_start: string;
  intervention_start: string | null;
  study_end: string;
  created_at: string;
  updated_at: string;
}

export type AppUserRow = {
  user_id: string;
  employee_id: string;
  full_name: string;
  role: UserRoleDb;
  ward_codes: string[];
  pin_hash: string;
  line_user_id: string | null;
  is_active: boolean;
  created_at: string;
}

export type TagRow = {
  tag_code: string;
  ward_code: string;
  is_retired: boolean;
  created_at: string;
}

export type EpisodeRow = {
  episode_id: string;
  study_id: string;
  study_code: string;
  tag_code: string | null;
  ward_code: string;
  bed_no: string;
  insert_date: string;
  remove_date: string | null;
  removal_reason: string | null;
  is_active: boolean;
  created_by: string;
  created_at: string;
}

export type AssessmentRow = {
  assessment_id: string;
  client_uuid: string;
  episode_id: string;
  assessor_id: string;
  source: SourceDb;
  study_mode: StudyMode;
  assessed_at: string;
  shift: ShiftDb;
  foley_day: number;
  need: boolean;
  fix: boolean;
  flow: boolean;
  below: boolean;
  closed: boolean;
  all_pass: boolean;
  feedback: FeedbackDb;
  notes: string | null;
  created_at: string;
}

export type CorrectiveActionRow = {
  action_id: string;
  assessment_id: string;
  items_corrected: string[];
  status: ActionStatusDb;
  unable_reason: string | null;
  performed_by: string;
  performed_at: string;
}

export type UsabilityResponseRow = {
  response_id: string;
  user_id: string;
  scores: number[];
  comment: string | null;
  submitted_at: string;
}

export type AuditLogRow = {
  audit_id: string;
  actor_id: string | null;
  action: string;
  entity: string;
  entity_id: string | null;
  detail: Record<string, unknown> | null;
  created_at: string;
}

export type StudyModeLogRow = {
  log_id: string;
  study_id: string;
  from_mode: StudyMode;
  to_mode: StudyMode;
  reason: string;
  changed_by: string;
  changed_at: string;
}

type Table<Row, Insert = Partial<Row>> = {
  Row: Row;
  Insert: Insert;
  Update: Partial<Row>;
  Relationships: [];
};

export interface Database {
  public: {
    Tables: {
      study: Table<StudyRow>;
      study_mode_log: Table<StudyModeLogRow>;
      app_user: Table<AppUserRow>;
      tag: Table<TagRow>;
      episode: Table<EpisodeRow>;
      assessment: Table<AssessmentRow>;
      corrective_action: Table<CorrectiveActionRow>;
      usability_response: Table<UsabilityResponseRow>;
      audit_log: Table<AuditLogRow>;
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      study_mode: StudyMode;
      user_role: UserRoleDb;
      shift_type: ShiftDb;
      source_type: SourceDb;
      feedback_type: FeedbackDb;
      action_status: ActionStatusDb;
    };
    CompositeTypes: Record<string, never>;
  };
}
