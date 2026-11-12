'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, MailOpen } from 'lucide-react';
import { PublicHouseholdSessionView, WeddingContent } from '@/lib/types/domain';

interface OpeningCoverProps {
  isOpen: boolean;
  onOpen: () => void;
  content: WeddingContent;
  householdSession: PublicHouseholdSessionView | null;
}

export function OpeningCover({
  isOpen,
  onOpen,
  content,
  householdSession,
}: OpeningCoverProps) {
  return (
    <AnimatePresence>
      {!isOpen && (
        <motion.div
          key="invitation-opening-cover"
          initial={{ opacity: 1 }}
          exit={{
            opacity: 0,
            scale: 1.03,
            filter: 'blur(6px)',
            transition: { duration: 0.85, ease: [0.22, 1, 0.36, 1] },
          }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-ivory px-4 py-6 sm:px-8 overflow-y-auto"
          role="dialog"
          aria-modal="true"
          aria-label="Wedding Invitation Cover"
        >
          {/* Outer Luxury Stationery Card */}
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: 'easeOut' }}
            className="relative w-full max-w-2xl bg-warmWhite border border-softGold/60 shadow-editorial p-3 sm:p-5 my-auto"
          >
            {/* Inner Double Hairline Frame */}
            <div className="relative border border-charcoal/15 px-5 py-10 sm:px-12 sm:py-14 text-center flex flex-col items-center">
              {/* Corner Botanical Accents */}
              <span className="pointer-events-none absolute top-2 left-2 h-4 w-4 border-t border-l border-softGold" />
              <span className="pointer-events-none absolute top-2 right-2 h-4 w-4 border-t border-r border-softGold" />
              <span className="pointer-events-none absolute bottom-2 left-2 h-4 w-4 border-b border-l border-softGold" />
              <span className="pointer-events-none absolute bottom-2 right-2 h-4 w-4 border-b border-r border-softGold" />

              {/* Monogram Crest */}
              <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full border border-softGold/80 bg-ivory text-charcoal shadow-sm">
                <span className="font-cormorant text-xl sm:text-2xl italic tracking-widest text-charcoal">
                  {content.coupleNames.monogram}
                </span>
              </div>

              {/* Cover Phrase */}
              <p className="font-montserrat text-[10px] sm:text-xs uppercase tracking-editorial text-mutedGray mb-4">
                {content.coverPhrase}
              </p>

              {/* Couple Names */}
              <h1 className="font-cormorant text-4xl sm:text-6xl md:text-7xl font-light tracking-wide text-charcoal leading-tight mb-4">
                {content.coupleNames.partnerOne}
                <span className="block sm:inline font-playfair italic text-softGold mx-3 text-3xl sm:text-5xl">
                  &amp;
                </span>
                {content.coupleNames.partnerTwo}
              </h1>

              {/* Subtext */}
              <p className="max-w-md font-cormorant italic text-lg sm:text-xl text-mutedGray mb-6">
                {content.coverSubtext}
              </p>

              <div className="editorial-divider w-36 my-4" />

              {/* Personalized Household Greeting Badge (when verified via code) */}
              {householdSession ? (
                <div className="my-4 w-full max-w-md rounded-none border border-softGold/40 bg-ivory/80 px-4 py-4">
                  <p className="font-montserrat text-[10px] uppercase tracking-editorial text-softGold mb-1 flex items-center justify-center gap-1.5">
                    <Sparkles className="h-3 w-3" /> Personal Invitation Reserved For
                  </p>
                  <p className="font-cormorant text-2xl sm:text-3xl font-medium text-charcoal">
                    {householdSession.displayName}
                  </p>
                  <p className="mt-1.5 font-montserrat text-xs text-mutedGray">
                    {householdSession.members.map((m) => m.fullName).join(' • ')}
                  </p>
                </div>
              ) : (
                <div className="my-3 text-center">
                  <p className="font-cormorant text-lg sm:text-xl text-charcoal">
                    {content.weddingDateDisplay}
                  </p>
                  <p className="mt-1 font-montserrat text-xs uppercase tracking-luxury text-mutedGray">
                    {content.weddingLocationSummary}
                  </p>
                </div>
              )}

              {/* Open Invitation Button */}
              <button
                type="button"
                onClick={onOpen}
                className="mt-7 group relative inline-flex items-center justify-center gap-3 border border-charcoal bg-charcoal px-8 py-3.5 text-xs sm:text-sm font-montserrat uppercase tracking-editorial text-ivory transition-all duration-300 hover:bg-transparent hover:text-charcoal focus:outline-none focus:ring-2 focus:ring-softGold"
              >
                <MailOpen className="h-4 w-4 text-softGold transition-transform duration-300 group-hover:scale-110" />
                <span>Open Invitation</span>
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

