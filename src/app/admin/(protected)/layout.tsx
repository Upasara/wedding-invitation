import React from 'react';
import { redirect } from 'next/navigation';
import { getAdminSessionFromCookies } from '@/lib/security/session';
import { getAdminUserByUid } from '@/lib/db/repository';
import { AdminShell } from '@/components/admin/AdminShell';

export const dynamic = 'force-dynamic';

export default async function ProtectedAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getAdminSessionFromCookies();
  if (
    !session ||
    (session.role !== 'admin' && session.role !== 'super_admin')
  ) {
    redirect('/admin/login');
  }

  const dbAdmin = await getAdminUserByUid(session.uid);
  if (
    !dbAdmin ||
    !dbAdmin.active ||
    (dbAdmin.role !== 'admin' && dbAdmin.role !== 'super_admin')
  ) {
    redirect('/admin/login');
  }

  if (
    dbAdmin.passwordHash &&
    (!session.pwdVer || !dbAdmin.passwordHash.startsWith(session.pwdVer))
  ) {
    redirect('/admin/login');
  }

  return (
    <AdminShell
      admin={{
        uid: dbAdmin.uid,
        email: dbAdmin.email,
        displayName: dbAdmin.displayName,
        role: dbAdmin.role,
      }}
    >
      {children}
    </AdminShell>
  );
}

