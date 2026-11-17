/**
 * ข้อมูลสมมติสำหรับหน้าทดลองใช้และหน้าตรวจดีไซน์
 *
 * ไม่มีข้อมูลผู้ป่วยจริงแม้แต่รายการเดียว — HN เป็น DEMO ทั้งหมด
 * และไม่มีเส้นทางใดจากข้อมูลชุดนี้ไปถึงฐานข้อมูล
 * ผู้เยี่ยมชมบูธจึงกดดูได้ทุกหน้าโดยไม่เห็นข้อมูลของผู้ป่วยในหอผู้ป่วย
 */

import type { AssessmentRow, EpisodeRow } from '@/types/database';

export const DEMO_WARD = 'หอผู้ป่วยตัวอย่าง';

/** ผู้ป่วยสมมติ 12 เตียง สำหรับแดชบอร์ดและรายการเตียง */
export function demoEpisodes(): EpisodeRow[] {
  return Array.from({ length: 12 }, (_, i) => ({
    episode_id: `preview-${i}`,
    study_id: 'preview',
    hn: 'DEMO',
    study_code: `DEMO-${i}`,
    tag_code: null,
    ward_code: DEMO_WARD,
    bed_no: String(i + 1),
    insert_date: '2026-09-14',
    remove_date: null,
    removal_reason: null,
    is_active: true,
    created_by: 'preview',
    closed_by: null,
    created_at: '2026-09-14T00:00:00Z',
  }));
}

/** การประเมินสมมติ คละผลให้เห็นทั้งผ่าน ต้องแก้ไข และต้องทบทวน */
export function demoAssessments(episodes: EpisodeRow[]): AssessmentRow[] {
  return episodes.map((e, i) => ({
    assessment_id: e.episode_id,
    client_uuid: e.episode_id,
    episode_id: e.episode_id,
    assessor_id: 'preview',
    source: 'NURSE',
    nurse_level: i % 2 === 0 ? 'RN' : 'NA',
    study_mode: 'INTERVENTION',
    assessed_at: '2026-09-15T00:00:00Z',
    shift: 'MORNING',
    foley_day: 2,
    need: i !== 0,
    fix: i !== 1,
    flow: i !== 2,
    below: true,
    closed: true,
    hand: i !== 3,
    flush: true,
    drain: i !== 4,
    document: i !== 5,
    all_pass: i > 5,
    feedback: i === 0 ? 'REVIEW_REMOVAL' : i < 3 ? 'CORRECT_NOW' : 'PASS',
    notes: null,
    created_at: '2026-09-15T00:00:00Z',
  }));
}

/** เตียงสมมติที่ใช้เปิดแบบประเมิน CHECK 9 */
export const DEMO_EPISODE_FOR_FORM = {
  episodeId: 'design-preview',
  hn: 'DEMO-001',
  studyCode: 'DEMO-001',
  bedNo: '3',
  wardCode: 'ศัลยกรรมชาย',
  insertDate: '2026-09-13',
  insertDateTh: '13 ก.ย. 2569',
  foleyDay: 3,
} as const;

export const DEMO_TODAY = '2026-09-16';

/** จำนวนผู้ป่วยคาสายย้อนหลัง 7 วัน */
export function demoTrend(): { date: string; count: number }[] {
  return [10, 11, 12, 12, 11, 12, 12].map((count, i) => ({
    date: `2026-09-${9 + i}`,
    count,
  }));
}

export const DEMO_PASS_TREND = [
  { label: 'เวรดึก', total: 3, passed: 2, percent: 67 },
  { label: 'เวรเช้า', total: 4, passed: 3, percent: 75 },
  { label: 'เวรบ่าย', total: 5, passed: 4, percent: 80 },
];

export const DEMO_CHART_COLORS = ['#2ebd87', '#389df4', '#ffbe2b', '#9770e4', '#ef7e9f'];
