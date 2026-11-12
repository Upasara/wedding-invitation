'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles, CheckCircle2 } from 'lucide-react';
import { PublicHouseholdSessionView, WeddingContent } from '@/lib/types/domain';

interface FormalMessageSectionProps {
  content: WeddingContent;
  householdSession: PublicHouseholdSessionView | null;
}

export function FormalMessageSection({
  content,
  householdSession,
}: FormalMessageSectionProps) {
  return (
    <section
      id="invitation-message"
      className="border-b border-editorialBorder bg-warmWhite py-16 sm:py-24"
    >
      <div className="mx-auto max-w-4xl px-4 sm:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="relative border border-softGold/50 bg-ivory/60 px-5 py-12 sm:px-14 sm:py-16 text-center"
        >
          {/* Personalized Household Invitation Card */}
          {householdSession && (
            <div className="mb-10 border border-softGold bg-warmWhite px-5 py-6 shadow-card">
              <div className="flex items-center justify-center gap-2 text-softGold font-montserrat text-[10px] sm:text-xs uppercase tracking-editorial mb-2">
                <Sparkles className="h-3.5 w-3.5" />
                <span>Personalized Household Invitation</span>
              </div>
              <p className="font-cormorant text-2xl sm:text-3xl text-charcoal">
                Together with their families, we warmly invite{' '}
                <span className="font-semibold italic">
                  {householdSession.displayName}
                </span>
              </p>
              <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                {householdSession.members.map((member) => (
                  <span
                    key={member.id}
                    className="inline-flex items-center gap-1.5 border border-editorialBorder bg-ivory px-3 py-1 font-montserrat text-xs text-charcoal"
                  >
                    <CheckCircle2 className="h-3 w-3 text-softGold" />
                    {member.fullName}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Heading */}
          <p className="font-montserrat text-xs uppercase tracking-editorial text-softGold mb-4">
            {content.invitationHeading}
          </p>

          {/* Host / Parents Names */}
          {content.hostNames && content.hostNames.length > 0 && (
            <div className="mb-6 space-y-1.5">
              {content.hostNames.map((host, idx) => (
                <p
                  key={idx}
                  className="font-cormorant text-xl sm:text-2xl font-medium text-charcoal"
                >
                  {host}
                </p>
              ))}
            </div>
          )}

          <div className="editorial-divider mx-auto w-28 my-6" />

          {/* Main Invitation Message */}
          <p className="mx-auto max-w-2xl font-cormorant text-xl sm:text-2xl leading-relaxed text-charcoal/90">
            {content.invitationMessageBody}
          </p>

          {/* Additional Text */}
          {content.invitationAdditionalText && (
            <p className="mt-8 font-montserrat text-xs uppercase tracking-luxury text-mutedGray">
              {content.invitationAdditionalText}
            </p>
          )}
        </motion.div>
      </div>
    </section>
  );
}

