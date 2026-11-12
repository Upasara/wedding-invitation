import { NextResponse } from 'next/server';
import { requireAuthorizedAdmin } from '@/lib/security/admin-guard';
import { parseStrictJsonBody } from '@/lib/security/csrf';
import { eventInputSchema } from '@/lib/validation/schemas';
import {
  deleteAdminEvent,
  listAdminEvents,
  upsertAdminEvent,
} from '@/lib/db/repository';

export const dynamic = 'force-dynamic';

export async function GET() {
  const check = await requireAuthorizedAdmin();
  if (!check.ok) return check.response;
  const events = await listAdminEvents();
  return NextResponse.json({ events }, { status: 200 });
}

export async function POST(request: Request) {
  const check = await requireAuthorizedAdmin(request);
  if (!check.ok) return check.response;

  const parsed = await parseStrictJsonBody(request, 32 * 1024);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: parsed.status });
  }

  const validation = eventInputSchema.safeParse(parsed.data);
  if (!validation.success) {
    return NextResponse.json(
      { error: validation.error.issues[0]?.message || 'Invalid event data.' },
      { status: 400 }
    );
  }

  const saved = await upsertAdminEvent(validation.data);
  const events = await listAdminEvents();
  return NextResponse.json({ ok: true, event: saved, events }, { status: 200 });
}

export async function DELETE(request: Request) {
  const check = await requireAuthorizedAdmin(request);
  if (!check.ok) return check.response;

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id')?.trim();
  if (!id) {
    return NextResponse.json({ error: 'Event ID is required.' }, { status: 400 });
  }

  await deleteAdminEvent(id);
  const events = await listAdminEvents();
  return NextResponse.json({ ok: true, events }, { status: 200 });
}

