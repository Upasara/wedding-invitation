import { NextResponse } from 'next/server';
import { requireAuthorizedAdmin } from '@/lib/security/admin-guard';
import { parseStrictJsonBody } from '@/lib/security/csrf';
import { weddingPartyInputSchema } from '@/lib/validation/schemas';
import {
  deleteAdminWeddingPartyMember,
  listAdminWeddingParty,
  upsertAdminWeddingPartyMember,
} from '@/lib/db/repository';

export const dynamic = 'force-dynamic';

export async function GET() {
  const check = await requireAuthorizedAdmin();
  if (!check.ok) return check.response;
  const weddingParty = await listAdminWeddingParty();
  return NextResponse.json({ weddingParty }, { status: 200 });
}

export async function POST(request: Request) {
  const check = await requireAuthorizedAdmin(request);
  if (!check.ok) return check.response;

  const parsed = await parseStrictJsonBody(request, 32 * 1024);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: parsed.status });
  }

  const validation = weddingPartyInputSchema.safeParse(parsed.data);
  if (!validation.success) {
    return NextResponse.json(
      { error: validation.error.issues[0]?.message || 'Invalid wedding party member data.' },
      { status: 400 }
    );
  }

  const saved = await upsertAdminWeddingPartyMember(validation.data);
  const weddingParty = await listAdminWeddingParty();
  return NextResponse.json({ ok: true, member: saved, weddingParty }, { status: 200 });
}

export async function DELETE(request: Request) {
  const check = await requireAuthorizedAdmin(request);
  if (!check.ok) return check.response;

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id')?.trim();
  if (!id) {
    return NextResponse.json({ error: 'Wedding party member ID is required.' }, { status: 400 });
  }

  await deleteAdminWeddingPartyMember(id);
  const weddingParty = await listAdminWeddingParty();
  return NextResponse.json({ ok: true, weddingParty }, { status: 200 });
}

