import { NextResponse } from 'next/server';
import { requireAuthorizedAdmin } from '@/lib/security/admin-guard';
import { parseStrictJsonBody } from '@/lib/security/csrf';
import { faqInputSchema } from '@/lib/validation/schemas';
import {
  deleteAdminFaq,
  listAdminFaqs,
  upsertAdminFaq,
} from '@/lib/db/repository';

export const dynamic = 'force-dynamic';

export async function GET() {
  const check = await requireAuthorizedAdmin();
  if (!check.ok) return check.response;
  const faqs = await listAdminFaqs();
  return NextResponse.json({ faqs }, { status: 200 });
}

export async function POST(request: Request) {
  const check = await requireAuthorizedAdmin(request);
  if (!check.ok) return check.response;

  const parsed = await parseStrictJsonBody(request, 32 * 1024);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: parsed.status });
  }

  const validation = faqInputSchema.safeParse(parsed.data);
  if (!validation.success) {
    return NextResponse.json(
      { error: validation.error.issues[0]?.message || 'Invalid Q&A entry data.' },
      { status: 400 }
    );
  }

  const saved = await upsertAdminFaq(validation.data);
  const faqs = await listAdminFaqs();
  return NextResponse.json({ ok: true, faq: saved, faqs }, { status: 200 });
}

export async function DELETE(request: Request) {
  const check = await requireAuthorizedAdmin(request);
  if (!check.ok) return check.response;

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id')?.trim();
  if (!id) {
    return NextResponse.json({ error: 'Q&A entry ID is required.' }, { status: 400 });
  }

  await deleteAdminFaq(id);
  const faqs = await listAdminFaqs();
  return NextResponse.json({ ok: true, faqs }, { status: 200 });
}

