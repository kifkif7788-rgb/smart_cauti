import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { InvalidTag } from '@/components/InvalidTag';

// ข้อความมาจากรหัสที่กำหนดไว้เท่านั้น ไม่รับข้อความจาก query โดยตรง
const REASONS: Record<string, string> = {
  signature: 'ป้ายนี้ไม่ผ่านการตรวจสอบความถูกต้อง',
  unknown: 'ไม่พบป้ายนี้ในระบบ หรือป้ายถูกยกเลิกการใช้งานแล้ว',
};

export default async function TagErrorPage(props: PageProps<'/tag-error'>) {
  const session = await getSession();
  if (!session) redirect('/login');

  const search = await props.searchParams;
  const key = typeof search.reason === 'string' ? search.reason : '';

  return <InvalidTag reason={REASONS[key] ?? 'ป้ายนี้ใช้งานไม่ได้'} />;
}
