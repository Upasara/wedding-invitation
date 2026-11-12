import { NextResponse } from 'next/server';
import { requireAuthorizedAdmin } from '@/lib/security/admin-guard';
import { parseStrictJsonBody } from '@/lib/security/csrf';
import { storyEntryInputSchema } from '@/lib/validation/schemas';
import {
  deleteAdminStoryEntry,
  listAdminStoryEntries,
  upsertAdminStoryEntry,
} from '@/lib/db/repository';

export const dynamic = 'force-dynamic';

export async function GET() {
  const check = await requireAuthorizedAdmin();
  if (!check.ok) return check.response;
  const storyEntries = await listAdminStoryEntries();
  return NextResponse.json({ storyEntries }, { status: 200 });
}

export async function POST(request: Request) {
  const check = await requireAuthorizedAdmin(request);
  if (!check.ok) return check.response;

  const parsed = await parseStrictJsonBody(request, 32 * 1024);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: parsed.status });
  }

  const validation = storyEntryInputSchema.safeParse(parsed.data);
  if (!validation.success) {
    return NextResponse.json(
      { error: validation.error.issues[0]?.message || 'Invalid story milestone data.' },
      { status: 400 }
    );
  }

  const saved = await upsertAdminStoryEntry(validation.data);
  const storyEntries = await listAdminStoryEntries();
  return NextResponse.json({ ok: true, storyEntry: saved, storyEntries }, { status: 200 });
}

export async function DELETE(request: Request) {
  const check = await requireAuthorizedAdmin(request);
  if (!check.ok) return check.response;

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id')?.trim();
  if (!id) {
    return NextResponse.json({ error: 'Story entry ID is required.' }, { status: 400 });
  }

  await deleteAdminStoryEntry(id);
  const storyEntries = await listAdminStoryEntries();
  return NextResponse.json({ ok: true, storyEntries }, { status: 200 });
}

