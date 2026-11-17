import type { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { validateComment, validateScores } from '@/lib/satisfaction';

/**
 * รับแบบสอบถามความพึงพอใจจากผู้เยี่ยมชมงานนำเสนอ
 *
 * เปิดให้ส่งได้โดยไม่ต้องล็อกอิน เพราะผู้เยี่ยมชมบูธไม่มีบัญชีในระบบ
 * จึงไม่เก็บสิ่งที่ระบุตัวผู้ตอบได้เลย ทั้ง user, IP และ user-agent
 * และไม่เขียน audit log เพราะ audit log มี actor จะทำให้แบบไม่นิรนามอีกต่อไป
 */
export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'รูปแบบข้อมูลไม่ถูกต้อง' }, { status: 400 });
  }

  const { scores, comment, clientUuid } = (body ?? {}) as Record<string, unknown>;

  const scoreProblem = validateScores(scores);
  if (scoreProblem) return Response.json({ error: scoreProblem }, { status: 400 });

  const commentProblem = validateComment(comment);
  if (commentProblem) return Response.json({ error: commentProblem }, { status: 400 });

  if (typeof clientUuid !== 'string' || clientUuid.length < 8 || clientUuid.length > 64) {
    return Response.json({ error: 'คำขอไม่ถูกต้อง' }, { status: 400 });
  }

  const trimmed = typeof comment === 'string' ? comment.trim() : '';

  const { error } = await db()
    .from('satisfaction_response')
    .insert({
      scores: scores as number[],
      comment: trimmed.length > 0 ? trimmed : null,
      client_uuid: clientUuid,
    });

  if (error) {
    // กดส่งซ้ำด้วย client_uuid เดิม ถือว่าสำเร็จ ไม่ใช่ความผิดของผู้ตอบ
    if (error.code === '23505') return Response.json({ ok: true, duplicate: true });
    console.error('[satisfaction] บันทึกไม่สำเร็จ', error);
    return Response.json({ error: 'บันทึกไม่สำเร็จ กรุณาลองใหม่' }, { status: 500 });
  }

  return Response.json({ ok: true });
}
