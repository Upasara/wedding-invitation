"use client";

import React from "react";
import { RsvpSettings, CoupleData } from "@/types/wedding";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { RSVPForm } from "@/components/rsvp/RSVPForm";
import { GoldDivider } from "@/components/ui/GoldDivider";

interface RSVPSectionProps {
  settings: RsvpSettings;
  couple: CoupleData;
}

export const RSVPSection: React.FC<RSVPSectionProps> = ({
  settings,
  couple,
}) => {
  return (
    <section
      id="rsvp"
      aria-label="RSVP"
      className="py-20 md:py-32 px-4 sm:px-6 md:px-12 bg-ivory-50 text-charcoal-900"
    >
      <div className="max-w-4xl mx-auto">
        <SectionHeading
          tag="Your Presence"
          title="Kindly Respond"
          subtitle={`Please let us know if you can join us by ${settings.deadlineDisplay}.`}
          alignment="center"
        />

        {/* Multi-step Interactive RSVP Flow */}
        <RSVPForm settings={settings} coupleNames={couple.shortNames} />

        <GoldDivider />
      </div>
    </section>
  );
};
