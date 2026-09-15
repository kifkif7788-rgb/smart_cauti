import { redirect, notFound } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { db } from '@/lib/db';
import { isValidTagCode } from '@/lib/qr';
import { bangkokDateString } from '@/lib/shift';
import { AppHeader } from '@/components/AppHeader';
import { BindTagForm } from '@/components/BindTagForm';

export default async function BindPage(props: PageProps<'/bind/[tagCode]'>) {
  const session = await getSession();
  if (!session) redirect('/login');

  const { tagCode } = await props.params;
  if (!isValidTagCode(tagCode)) notFound();

  const { data: tag } = await db()
    .from('tag')
    .select('*')
    .eq('tag_code', tagCode)
    .maybeSingle();

  if (!tag || tag.is_retired) notFound();

  // ถ้าผูกไปแล้วระหว่างที่เปิดหน้านี้ ให้ไปหน้าประเมินเลย
  const { data: existing } = await db()
    .from('episode')
    .select('episode_id')
    .eq('tag_code', tagCode)
    .eq('is_active', true)
    .maybeSingle();

  if (existing) redirect(`/assess/${tagCode}`);

  return (
    <>
      <AppHeader title="ผูกป้ายกับผู้ป่วย" backHref="/" subtitle={tagCode} />
      <BindTagForm
        tagCode={tagCode}
        wardCode={tag.ward_code}
        today={bangkokDateString()}
      />
    </>
  );
}
