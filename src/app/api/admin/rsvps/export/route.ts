import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { requireAuthorizedAdmin } from '@/lib/security/admin-guard';
import {
  getAdminFullContentAndSettings,
  listAdminHouseholdsWithRsvps,
} from '@/lib/db/repository';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const check = await requireAuthorizedAdmin(request);
  if (!check.ok) return check.response;

  const { searchParams } = new URL(request.url);
  const format = (searchParams.get('format') || 'xlsx').toLowerCase();

  const [households, { settings }] = await Promise.all([
    listAdminHouseholdsWithRsvps(),
    getAdminFullContentAndSettings(),
  ]);

  const mealLabelMap = new Map(
    settings.mealOptions.map((m) => [m.id, m.label])
  );

  // Sheet 1: Detailed Individual Guest & Plus-One Roster
  const guestRows: Array<Record<string, string | number>> = [];
  // Sheet 2: Household Summary
  const householdRows: Array<Record<string, string | number>> = [];

  for (const hh of households) {
    const rsvp = hh.rsvp;
    const rsvpStatus = !rsvp
      ? 'Pending'
      : rsvp.overallStatus === 'attending'
      ? 'Attending'
      : 'Declined';

    householdRows.push({
      'Household ID': hh.id,
      'Household Name': hh.displayName,
      Category: hh.category,
      'Invitation Status': hh.status,
      'Code Hint': hh.codeHint,
      'RSVP Status': rsvpStatus,
      'Invited Members': hh.maxInvitedMembers,
      'Attending Members': rsvp ? rsvp.attendingMembersCount : 0,
      'Additional Guest Allowance': hh.additionalGuestAllowance,
      'Additional Guests Attending': rsvp ? rsvp.additionalGuestsCount : 0,
      'Total Expected Attendees': rsvp ? rsvp.totalAttendingCount : 0,
      'Contact Email': rsvp?.contactEmail || '',
      'Contact Phone': rsvp?.contactPhone || '',
      'Personal Message': rsvp?.personalMessage || '',
      'Submitted At': rsvp?.submittedAt || '',
      'Last Updated At': rsvp?.updatedAt || '',
      'Admin Notes': hh.adminNotes || '',
    });

    for (const member of hh.members) {
      const mr = rsvp?.memberResponses.find((m) => m.memberId === member.id);
      const attendance = !rsvp
        ? 'Pending'
        : mr?.attending
        ? 'Attending'
        : 'Unable to Attend';
      const mealLabel =
        mr?.attending && mr.mealOptionId
          ? mealLabelMap.get(mr.mealOptionId) || mr.mealOptionId
          : '';

      guestRows.push({
        'Household Name': hh.displayName,
        'Guest Type': 'Invited Household Member',
        'Guest Name': member.fullName,
        'Attendance Status': attendance,
        'Meal Selection': mealLabel,
        'Dietary Notes': mr?.dietaryNotes || '',
        'Contact Email': rsvp?.contactEmail || '',
        'Contact Phone': rsvp?.contactPhone || '',
        'Household Message': rsvp?.personalMessage || '',
        'Last Updated': rsvp?.updatedAt || '',
      });
    }

    if (rsvp && rsvp.additionalGuests.length > 0) {
      for (const ag of rsvp.additionalGuests) {
        const mealLabel = ag.mealOptionId
          ? mealLabelMap.get(ag.mealOptionId) || ag.mealOptionId
          : '';
        guestRows.push({
          'Household Name': hh.displayName,
          'Guest Type': 'Additional Guest (+1)',
          'Guest Name': ag.fullName,
          'Attendance Status': 'Attending',
          'Meal Selection': mealLabel,
          'Dietary Notes': ag.dietaryNotes || '',
          'Contact Email': rsvp.contactEmail || '',
          'Contact Phone': rsvp.contactPhone || '',
          'Household Message': rsvp.personalMessage || '',
          'Last Updated': rsvp.updatedAt || '',
        });
      }
    }
  }

  const wb = XLSX.utils.book_new();
  const wsGuests = XLSX.utils.json_to_sheet(guestRows);
  const wsHouseholds = XLSX.utils.json_to_sheet(householdRows);

  XLSX.utils.book_append_sheet(wb, wsGuests, 'Guest Attendance Roster');
  XLSX.utils.book_append_sheet(wb, wsHouseholds, 'Household Summary');

  if (format === 'csv') {
    const csvContent = XLSX.utils.sheet_to_csv(wsGuests);
    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition':
          'attachment; filename="wedding-rsvp-roster.csv"',
      },
    });
  }

  const xlsxBuffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  return new NextResponse(xlsxBuffer, {
    status: 200,
    headers: {
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition':
        'attachment; filename="wedding-rsvps-and-households.xlsx"',
    },
  });
}

