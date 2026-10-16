"use client";

import { mockWeddingData } from "@/data/mockWedding";
import { OpeningInvitation } from "@/components/invitation/OpeningInvitation";
import { HeroSection } from "@/components/hero/HeroSection";
import { OurStorySection } from "@/components/couple/OurStorySection";
import { EventsSection } from "@/components/events/EventsSection";
import { WeddingPartySection } from "@/components/wedding-party/WeddingPartySection";
import { GallerySection } from "@/components/gallery/GallerySection";
import { QASection } from "@/components/qa/QASection";
import { RSVPSection } from "@/components/rsvp/RSVPSection";
import { Footer } from "@/components/ui/Footer";

export default function WeddingPage() {
  const wedding = mockWeddingData;

  return (
    <main className="min-h-screen relative bg-ivory-100 text-charcoal-900 overflow-x-hidden">
      {/* 1. Opening Invitation (Full-screen interactive envelope card) */}
      <OpeningInvitation wedding={wedding} />

      {/* 2. Hero Section (Couple names, invitation message, date, location, countdown) */}
      <HeroSection hero={wedding.hero} couple={wedding.couple} />

      {/* 3. Couple / Our Story Section (Couple photo, names, our story heading, narrative) */}
      <OurStorySection story={wedding.story} couple={wedding.couple} />

      {/* 4. Events Section (Arbitrary events with details and Get Directions buttons) */}
      <EventsSection events={wedding.events} />

      {/* 5. Wedding Party Section (Arbitrary roles and members with categories) */}
      <WeddingPartySection partyMembers={wedding.weddingParty} />

      {/* 6. Gallery Section (Responsive grid with hover/tap effects & fullscreen lightbox) */}
      <GallerySection images={wedding.gallery} />

      {/* 7. Q&A Section (Arbitrary questions with elegant accordion interaction) */}
      <QASection qaList={wedding.qa} />

      {/* 8. RSVP Section (Visual interactive multi-step preview flow) */}
      <RSVPSection settings={wedding.rsvpSettings} couple={wedding.couple} />

      {/* 9. Footer (Couple names, wedding date, small closing message) */}
      <Footer wedding={wedding} />
    </main>
  );
}
