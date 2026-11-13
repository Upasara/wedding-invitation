'use client';

import React, { useEffect, useState } from 'react';
import {
  PublicHouseholdSessionView,
  PublicInvitationPayload,
} from '@/lib/types/domain';
import { OpeningCover } from '@/components/public/OpeningCover';
import { AudioPlayer } from '@/components/public/AudioPlayer';
import { FloatingNav } from '@/components/public/FloatingNav';
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

  const handleStartCoverInteraction = () => {
    setHasInteracted(true);
  };

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
        onInteract={handleStartCoverInteraction}
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

      {/* Floating Bottom-Centre Glassmorphism Navigation Pill (visible only after opening cover) */}
      <FloatingNav
        visible={isCoverOpen}
        monogram={content.coupleNames.monogram}
        visibility={{
          hero: vis.hero,
          invitationMessage: vis.invitationMessage,
          story: vis.story,
          events: vis.events,
          gallery: vis.gallery,
          weddingParty: vis.weddingParty,
          rsvp: vis.rsvp,
          faq: vis.faq,
        }}
        counts={{
          events: events.length,
          gallery: galleryImages.length,
          weddingParty: weddingParty.length,
          faqs: faqs.length,
        }}
      />

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

