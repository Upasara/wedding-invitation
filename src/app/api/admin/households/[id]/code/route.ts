import { NextResponse } from 'next/server';
import { requireAuthorizedAdmin } from '@/lib/security/admin-guard';
import { parseStrictJsonBody } from '@/lib/security/csrf';
import { householdCodeActionSchema } from '@/lib/validation/schemas';
import {
  listAdminHouseholdsWithRsvps,
  manageHouseholdInvitationCode,
} from '@/lib/db/repository';

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const check = await requireAuthorizedAdmin(request);
  if (!check.ok) return check.response;

  const { id } = await context.params;
  if (!id) {
    return NextResponse.json(
      { error: 'Household ID is required.' },
      { status: 400 }
    );
  }

  const parsed = await parseStrictJsonBody(request, 16 * 1024);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: parsed.status });
  }

  const validation = householdCodeActionSchema.safeParse(parsed.data);
  if (!validation.success) {
    return NextResponse.json(
      {
        error:
          validation.error.issues[0]?.message || 'Invalid invitation code action.',
      },
      { status: 400 }
    );
  }

  const result = await manageHouseholdInvitationCode({
    householdId: id,
    action: validation.data.action,
    adminUid: check.admin.uid,
    reason: validation.data.reason,
    customPlaintextCode: validation.data.customPlaintextCode,
  });

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error || 'Unable to update household invitation code.' },
      { status: 400 }
    );
  }

  const households = await listAdminHouseholdsWithRsvps();
  return NextResponse.json(
    {
      ok: true,
      generatedPlaintextCode: result.generatedPlaintextCode,
      households,
    },
    { status: 200 }
  );
}

