import { NextResponse } from 'next/server';
import { requireAuthorizedAdmin } from '@/lib/security/admin-guard';
import { parseStrictJsonBody } from '@/lib/security/csrf';
import { householdCreateOrUpdateSchema } from '@/lib/validation/schemas';
import {
  createOrUpdateHousehold,
  deleteAdminHousehold,
  listAdminHouseholdsWithRsvps,
} from '@/lib/db/repository';

export const dynamic = 'force-dynamic';

export async function GET() {
  const check = await requireAuthorizedAdmin();
  if (!check.ok) return check.response;

  const households = await listAdminHouseholdsWithRsvps();
  return NextResponse.json({ households }, { status: 200 });
}

export async function POST(request: Request) {
  const check = await requireAuthorizedAdmin(request);
  if (!check.ok) return check.response;

  const parsed = await parseStrictJsonBody(request, 64 * 1024);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: parsed.status });
  }

  const validation = householdCreateOrUpdateSchema.safeParse(parsed.data);
  if (!validation.success) {
    return NextResponse.json(
      {
        error:
          validation.error.issues[0]?.message || 'Invalid household data.',
      },
      { status: 400 }
    );
  }

  try {
    const result = await createOrUpdateHousehold(validation.data);
    const households = await listAdminHouseholdsWithRsvps();
    return NextResponse.json(
      {
        ok: true,
        household: result.household,
        generatedPlaintextCode: result.generatedPlaintextCode,
        households,
      },
      { status: 200 }
    );
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : 'Unable to save household invitation.',
      },
      { status: 400 }
    );
  }
}

export async function DELETE(request: Request) {
  const check = await requireAuthorizedAdmin(request);
  if (!check.ok) return check.response;

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id')?.trim();
  if (!id) {
    return NextResponse.json(
      { error: 'Household ID is required.' },
      { status: 400 }
    );
  }

  await deleteAdminHousehold(id);
  const households = await listAdminHouseholdsWithRsvps();
  return NextResponse.json({ ok: true, households }, { status: 200 });
}

