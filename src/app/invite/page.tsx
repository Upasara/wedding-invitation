import React from 'react';
import { getHouseholdSessionFromCookies } from '@/lib/security/session';
import { getPublicInvitationPayload } from '@/lib/db/repository';
import { InvitationExperience } from '@/components/public/InvitationExperience';

export const dynamic = 'force-dynamic';

export default async function PersonalizedInvitePage() {
  const hhSession = await getHouseholdSessionFromCookies();
  const payload = await getPublicInvitationPayload(
    hhSession
      ? {
          householdId: hhSession.householdId,
          codeDigestPrefix: hhSession.codeDigestPrefix,
        }
      : null
  );

  return <InvitationExperience initialPayload={payload} />;
}

