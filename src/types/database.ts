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
  bed_no: string;
  is_retired: boolean;
  created_at: string;
}

export type EpisodeRow = {
  episode_id: string;
  study_id: string;
  /** HN ผู้ป่วย — ข้อมูลส่วนบุคคล ห้ามใส่ในไฟล์ export ของงานวิจัย */
  hn: string;
  /** รหัสสำหรับงานวิจัย สร้างอัตโนมัติจาก sequence */
  study_code: string;
  tag_code: string | null;
  ward_code: string;
  bed_no: string;
  insert_date: string;
  remove_date: string | null;
  removal_reason: string | null;
  is_active: boolean;
  created_by: string;
  closed_by: string | null;
  created_at: string;
}

export type BedTransferRow = {
  transfer_id: string;
  episode_id: string;
  from_bed_no: string;
  to_bed_no: string;
  from_tag_code: string | null;
  to_tag_code: string | null;
  reason: string | null;
  moved_by: string;
  moved_at: string;
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

export type CatheterAtDoeDb = 'GT_2_DAYS' | 'LE_2_DAYS' | 'NONE';
export type UrineCultureResultDb = 'NO_GROWTH' | 'SIGNIFICANT';

export type InfectionDiagnosisRow = {
  diagnosis_id: string;
  episode_id: string;
  admit_date: string;
  doe_date: string;
  admit_dx: string | null;
  /** คอลัมน์ generated — ฐานข้อมูลคำนวณจาก doe_date ลบ admit_date */
  origin: 'HAI' | 'CI';
  catheter_at_doe: CatheterAtDoeDb;
  uc_result: UrineCultureResultDb;
  organisms: string[];
  diagnosed_by: string;
  created_at: string;
  updated_at: string;
}

export type InfectionSymptomCodeDb =
  | 'FEVER'
  | 'HYPOTHERMIA'
  | 'DYSURIA'
  | 'SEDIMENT'
  | 'FREQUENCY'
  | 'URGENCY'
  | 'SUPRAPUBIC_TENDERNESS'
  | 'CVA_TENDERNESS'
  | 'APNEA'
  | 'BRADYCARDIA'
  | 'LETHARGY'
  | 'VOMITING';

export type InfectionSymptomRow = {
  symptom_id: string;
  diagnosis_id: string;
  code: InfectionSymptomCodeDb;
  onset_date: string;
  end_date: string | null;
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
      episode: Table<EpisodeRow, Partial<EpisodeRow> & { hn: string }>;
      bed_transfer: Table<BedTransferRow>;
      assessment: Table<AssessmentRow>;
      corrective_action: Table<CorrectiveActionRow>;
      usability_response: Table<UsabilityResponseRow>;
      audit_log: Table<AuditLogRow>;
      // origin เป็นคอลัมน์ generated จึงเขียนค่าเข้าไปเองไม่ได้
      infection_diagnosis: Table<
        InfectionDiagnosisRow,
        Omit<Partial<InfectionDiagnosisRow>, 'origin'>
      >;
      infection_symptom: Table<InfectionSymptomRow>;
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
      catheter_at_doe: CatheterAtDoeDb;
      urine_culture_result: UrineCultureResultDb;
      infection_symptom_code: InfectionSymptomCodeDb;
    };
    CompositeTypes: Record<string, never>;
  };
}
