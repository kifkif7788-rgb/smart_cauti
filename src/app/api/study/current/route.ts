import { getSession, canAlwaysSeeDashboard } from '@/lib/auth';
import { getActiveStudy, nurseCanSeeDashboard } from '@/lib/study';

/**
 * สถานะโครงการปัจจุบัน — client ใช้ตัดสินใจว่าจะแสดงแถบ baseline
 * และเปิดทางลัด dashboard หรือไม่
 */
export async function GET() {
  const session = await getSession();
  if (!session) {
    return Response.json({ error: 'กรุณาเข้าสู่ระบบ' }, { status: 401 });
  }

  const study = await getActiveStudy();

  return Response.json({
    studyId: study.study_id,
    name: study.name,
    wardCode: study.ward_code,
    mode: study.current_mode,
    baselineStart: study.baseline_start,
    interventionStart: study.intervention_start,
    studyEnd: study.study_end,
    canSeeDashboard:
      canAlwaysSeeDashboard(session.role) || nurseCanSeeDashboard(study.current_mode),
  });
}
