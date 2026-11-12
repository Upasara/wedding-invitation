import { NextResponse } from 'next/server';
import { requireAuthorizedAdmin } from '@/lib/security/admin-guard';
import { getAdminUserByUid } from '@/lib/db/repository';

export const dynamic = 'force-dynamic';

export async function GET() {
  const check = await requireAuthorizedAdmin();
  if (!check.ok) {
    return check.response;
  }

  const fullUser = await getAdminUserByUid(check.admin.uid);
  return NextResponse.json(
    {
      admin: {
        uid: check.admin.uid,
        email: check.admin.email,
        displayName: fullUser?.displayName || check.admin.displayName,
        role: check.admin.role,
        photoUrl: fullUser?.photoUrl || '',
        lastLoginAt: fullUser?.lastLoginAt,
      },
    },
    { status: 200 }
  );
}

