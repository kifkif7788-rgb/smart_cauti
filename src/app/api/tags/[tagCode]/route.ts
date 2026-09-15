import type { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { getActiveStudy } from '@/lib/study';
import { isValidTagCode, verifyTagSignature } from '@/lib/qr';
import { foleyDay, currentShiftWindow } from '@/lib/shift';

/**
 * ตรวจป้าย QR แล้วบอกว่าควรพาไปหน้าไหน
 *
 *   unbound → หน้าผูกป้ายกับผู้ป่วย
 *   bound   → หน้าประเมิน CHECK 5
 *   invalid → ป้ายปลอมหรือลายเซ็นไม่ตรง
 */
export async function GET(request: NextRequest, ctx: RouteContext<'/api/tags/[tagCode]'>) {
  const session = await getSession();
  if (!session) {
    return Response.json({ error: 'กรุณาเข้าสู่ระบบ' }, { status: 401 });
  }

  const { tagCode } = await ctx.params;
  const signature = request.nextUrl.searchParams.get('k');

  if (!isValidTagCode(tagCode)) {
    return Response.json({ status: 'invalid', error: 'รูปแบบรหัสป้ายไม่ถูกต้อง' }, { status: 400 });
  }

  if (!verifyTagSignature(tagCode, signature)) {
    return Response.json(
      { status: 'invalid', error: 'ป้ายนี้ไม่ผ่านการตรวจสอบ กรุณาติดต่อผู้ดูแลระบบ' },
      { status: 400 },
    );
  }

  const { data: tag } = await db()
    .from('tag')
    .select('*')
    .eq('tag_code', tagCode)
    .maybeSingle();

  if (!tag || tag.is_retired) {
    return Response.json(
      { status: 'invalid', error: 'ไม่พบป้ายนี้ในระบบ หรือป้ายถูกยกเลิกการใช้งาน' },
      { status: 404 },
    );
  }

  const { data: episode } = await db()
    .from('episode')
    .select('*')
    .eq('tag_code', tagCode)
    .eq('is_active', true)
    .maybeSingle();

  if (!episode) {
    return Response.json({ status: 'unbound', tagCode, wardCode: tag.ward_code });
  }

  // ประเมินในเวรนี้ไปแล้วหรือยัง
  const { start, end } = currentShiftWindow();
  const { count } = await db()
    .from('assessment')
    .select('assessment_id', { count: 'exact', head: true })
    .eq('episode_id', episode.episode_id)
    .eq('source', session.role === 'AUDITOR' ? 'AUDITOR' : 'NURSE')
    .gte('assessed_at', start.toISOString())
    .lt('assessed_at', end.toISOString());

  const study = await getActiveStudy();

  return Response.json({
    status: 'bound',
    tagCode,
    episode: {
      episodeId: episode.episode_id,
      studyCode: episode.study_code,
      wardCode: episode.ward_code,
      bedNo: episode.bed_no,
      insertDate: episode.insert_date,
      foleyDay: foleyDay(episode.insert_date),
    },
    assessedThisShift: (count ?? 0) > 0,
    studyMode: study.current_mode,
  });
}
