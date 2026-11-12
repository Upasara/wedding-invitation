import { NextResponse } from 'next/server';
import { requireAuthorizedAdmin } from '@/lib/security/admin-guard';
import { parseStrictJsonBody } from '@/lib/security/csrf';
import { weddingSettingsUpdateSchema } from '@/lib/validation/schemas';
import {
  getAdminFullContentAndSettings,
  updateWeddingSettings,
} from '@/lib/db/repository';

export const dynamic = 'force-dynamic';

export async function GET() {
  const check = await requireAuthorizedAdmin();
  if (!check.ok) {
    return check.response;
  }

  const { settings } = await getAdminFullContentAndSettings();
  return NextResponse.json({ settings }, { status: 200 });
}

export async function PUT(request: Request) {
  const check = await requireAuthorizedAdmin(request);
  if (!check.ok) {
    return check.response;
  }

  const parsed = await parseStrictJsonBody(request, 64 * 1024);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: parsed.status });
  }

  const validation = weddingSettingsUpdateSchema.safeParse(parsed.data);
  if (!validation.success) {
    return NextResponse.json(
      {
        error:
          validation.error.issues[0]?.message || 'Invalid wedding settings payload.',
      },
      { status: 400 }
    );
  }

  const updated = await updateWeddingSettings(validation.data);
  return NextResponse.json({ ok: true, settings: updated }, { status: 200 });
}

