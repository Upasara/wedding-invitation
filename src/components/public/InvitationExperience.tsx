'use client';

import React, { useEffect, useState } from 'react';
import {
  PublicHouseholdSessionView,
  PublicInvitationPayload,
} from '@/lib/types/domain';
import { OpeningCover } from '@/components/public/OpeningCover';
import { AudioPlayer } from '@/components/public/AudioPlayer';
import { HeroSection } from '@/components/public/HeroSection';
import { FormalMessageSection } from '@/components/public/FormalMessageSection';
import { StorySection } from '@/components/public/StorySection';
import { EventsSection } from '@/components/public/EventsSection';
import { GallerySection } from '@/components/public/GallerySection';
import { WeddingPartySection } from '@/components/public/WeddingPartySection';
import { RsvpSection } from '@/components/public/RsvpSection';
import { QaSection } from '@/components/public/QaSection';
import { FooterSection } from '@/components/public/FooterSection';

interface InvitationExperienceProps {
  initialPayload: PublicInvitationPayload;
}

export function InvitationExperience({
  initialPayload,
}: InvitationExperienceProps) {
  const [isCoverOpen, setIsCoverOpen] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [householdSession, setHouseholdSession] =
    useState<PublicHouseholdSessionView | null>(initialPayload.householdSession);
  const [fragmentCode, setFragmentCode] = useState<string | null>(null);

  // Extract invitation code from URL fragment (e.g. /invite#PERERA-2026)
  // and immediately scrub it from visible browser URL/history
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const rawHash = window.location.hash;
    if (rawHash && rawHash.length > 1) {
      const extracted = decodeURIComponent(rawHash.slice(1)).trim();
      // Remove fragment from browser URL/history immediately
      window.history.replaceState(
        null,
        '',
        window.location.pathname + window.location.search
      );
      if (extracted.length >= 4 && ! extracted.startsWith('section-')) {
        setFragmentCode(extracted);
      }
    }
  }, []);

  const handleOpenCover = () => {
    setHasInteracted(true);
    setIsCoverOpen(true);
  };

  const { content, settings, events, storyEntries, galleryImages, weddingParty, faqs } =
    initialPayload;
  const vis = settings.sectionVisibility;

  return (
    <div className="min-h-screen bg-ivory text-charcoal">
      {/* Interactive Luxury Opening Cover */}
      <OpeningCover
        isOpen={isCoverOpen}
        onOpen={handleOpenCover}
        content={content}
        householdSession={householdSession}
      />

      {/* Persistent Background Music Controller (only renders if client has configured an audioUrl) */}
      <AudioPlayer
        audioUrl={content.audioUrl}
        audioTitle={content.audioTitle}
        hasInteracted={hasInteracted}
      />

      {/* Sticky Minimal Editorial Navigation Bar */}
      <header className="sticky top-0 z-30 border-b border-editorialBorder bg-ivory/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3.5 sm:px-8">
          <a
            href="#hero"
            className="font-cormorant text-xl sm:text-2xl italic tracking-wider text-charcoal"
          >
            {content.coupleNames.monogram}
          </a>

          <nav
            aria-label="Invitation sections"
            className="flex items-center gap-3 sm:gap-7 overflow-x-auto py-1 font-montserrat text-[10px] sm:text-xs uppercase tracking-luxury text-mutedGray"
          >
            {vis.invitationMessage && (
              <a
                href="#invitation-message"
                className="whitespace-nowrap hover:text-charcoal transition-colors"
              >
                Invitation
              </a>
            )}
            {vis.story && (
              <a
                href="#our-story"
                className="whitespace-nowrap hover:text-charcoal transition-colors"
              >
                Our Story
              </a>
            )}
            {vis.events && events.length > 0 && (
              <a
                href="#events"
                className="whitespace-nowrap hover:text-charcoal transition-colors"
              >
                Events
              </a>
            )}
            {vis.gallery && galleryImages.length > 0 && (
              <a
                href="#gallery"
                className="whitespace-nowrap hover:text-charcoal transition-colors"
              >
                Gallery
              </a>
            )}
            {vis.weddingParty && weddingParty.length > 0 && (
              <a
                href="#wedding-party"
                className="whitespace-nowrap hover:text-charcoal transition-colors"
              >
                Wedding Party
              </a>
            )}
            {vis.rsvp && (
              <a
                href="#rsvp"
                className="whitespace-nowrap border border-softGold bg-warmWhite px-3 py-1 text-charcoal hover:bg-charcoal hover:text-ivory transition-colors"
              >
                RSVP
              </a>
            )}
            {vis.faq && faqs.length > 0 && (
              <a
                href="#qa"
                className="whitespace-nowrap hover:text-charcoal transition-colors"
              >
                Q&amp;A
              </a>
            )}
          </nav>
        </div>
      </header>

      {/* Main Continuous Editorial Experience */}
      <main>
        {vis.hero && <HeroSection content={content} />}

        {vis.invitationMessage && (
          <FormalMessageSection
            content={content}
            householdSession={householdSession}
          />
        )}

        {vis.story && (
          <StorySection content={content} storyEntries={storyEntries} />
        )}

        {vis.events && <EventsSection events={events} />}

        {vis.gallery && <GallerySection images={galleryImages} />}

        {vis.weddingParty && <WeddingPartySection members={weddingParty} />}

        {vis.rsvp && (
          <RsvpSection
            householdSession={householdSession}
            onSessionChange={setHouseholdSession}
            settings={settings}
            initialFragmentCode={fragmentCode}
            isPlaceholderContent={content.isPlaceholderContent}
          />
        )}

        {/* Q&A Section MUST appear near the end, immediately before the Footer */}
        {vis.faq && <QaSection faqs={faqs} />}
      </main>

      {/* Minimal Luxury Footer */}
      <FooterSection content={content} />
    </div>
  );
}

