import { NextResponse } from 'next/server';
import { requireAuthorizedAdmin } from '@/lib/security/admin-guard';
import { getDashboardOverviewStats } from '@/lib/db/repository';

export const dynamic = 'force-dynamic';

export async function GET() {
  const check = await requireAuthorizedAdmin();
  if (!check.ok) {
    return check.response;
  }

  const stats = await getDashboardOverviewStats();
  return NextResponse.json({ stats }, { status: 200 });
}

