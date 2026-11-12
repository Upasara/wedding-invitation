import { NextResponse } from 'next/server';
import { requireAuthorizedAdmin } from '@/lib/security/admin-guard';
import { parseStrictJsonBody } from '@/lib/security/csrf';
import { adminRsvpUpsertSchema } from '@/lib/validation/schemas';
import {
  getAdminFullContentAndSettings,
  listAdminHouseholdsWithRsvps,
  submitOrUpdateHouseholdRsvp,
} from '@/lib/db/repository';

export const dynamic = 'force-dynamic';

export async function GET() {
  const check = await requireAuthorizedAdmin();
  if (!check.ok) return check.response;

  const [households, { settings }] = await Promise.all([
    listAdminHouseholdsWithRsvps(),
    getAdminFullContentAndSettings(),
  ]);

  return NextResponse.json(
    {
      households,
      mealOptions: settings.mealOptions,
      enableMealPreferencesGlobal: settings.enableMealPreferencesGlobal,
      allowAdditionalGuestsGlobal: settings.allowAdditionalGuestsGlobal,
    },
    { status: 200 }
  );
}

export async function POST(request: Request) {
  const check = await requireAuthorizedAdmin(request);
  if (!check.ok) return check.response;

  const parsed = await parseStrictJsonBody(request, 64 * 1024);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: parsed.status });
  }

  const validation = adminRsvpUpsertSchema.safeParse(parsed.data);
  if (!validation.success) {
    return NextResponse.json(
      {
        error:
          validation.error.issues[0]?.message || 'Invalid RSVP correction data.',
      },
      { status: 400 }
    );
  }

  const result = await submitOrUpdateHouseholdRsvp({
    householdId: validation.data.householdId,
    overallStatus: validation.data.overallStatus,
    memberResponses: validation.data.memberResponses,
    additionalGuests: validation.data.additionalGuests,
    contactEmail: validation.data.contactEmail,
    contactPhone: validation.data.contactPhone,
    personalMessage: validation.data.personalMessage,
    updatedBy: 'admin',
  });

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error || 'Failed to update RSVP record.' },
      { status: result.statusCode }
    );
  }

  const households = await listAdminHouseholdsWithRsvps();
  return NextResponse.json(
    { ok: true, rsvp: result.rsvp, households },
    { status: 200 }
  );
}

