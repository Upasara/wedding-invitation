"use client";

import React from "react";
import { WeddingEvent } from "@/types/wedding";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { EventCard } from "@/components/events/EventCard";
import { GoldDivider } from "@/components/ui/GoldDivider";

interface EventsSectionProps {
  events: WeddingEvent[];
}

export const EventsSection: React.FC<EventsSectionProps> = ({ events }) => {
  // Sort events by order
  const sortedEvents = [...events].sort((a, b) => a.order - b.order);

  return (
    <section
      id="events"
      aria-label="Wedding Events"
      className="py-20 md:py-32 px-4 sm:px-6 md:px-12 bg-ivory-50 text-charcoal-900"
    >
      <div className="max-w-6xl mx-auto">
        <SectionHeading
          tag="Order of Celebration"
          title="Events & Itinerary"
          subtitle="We have curated an intimate weekend of celebration across the Côte d'Azur."
          alignment="center"
        />

        {/* Arbitrary number of events responsive grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-10">
          {sortedEvents.map((event, index) => (
            <EventCard key={event.id} event={event} index={index} />
          ))}
        </div>

        <GoldDivider />
      </div>
    </section>
  );
};
