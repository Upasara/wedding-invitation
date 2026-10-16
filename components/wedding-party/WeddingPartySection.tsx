"use client";

import React, { useState } from "react";
import { WeddingPartyMember } from "@/types/wedding";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { WeddingPartyCard } from "@/components/wedding-party/WeddingPartyCard";
import { GoldDivider } from "@/components/ui/GoldDivider";

interface WeddingPartySectionProps {
  partyMembers: WeddingPartyMember[];
}

export const WeddingPartySection: React.FC<WeddingPartySectionProps> = ({
  partyMembers,
}) => {
  const [activeCategory, setActiveCategory] = useState<string>("all");

  const categories = [
    { id: "all", label: "All Members" },
    { id: "bride", label: "Bride's Party" },
    { id: "groom", label: "Groom's Party" },
    { id: "family", label: "Honored Family" },
  ];

  // Filter and sort members
  const filteredMembers = partyMembers
    .filter((member) => {
      if (activeCategory === "all") return true;
      return member.category === activeCategory;
    })
    .sort((a, b) => a.order - b.order);

  return (
    <section
      id="wedding-party"
      aria-label="Wedding Party"
      className="py-20 md:py-32 px-4 sm:px-6 md:px-12 bg-white text-charcoal-900"
    >
      <div className="max-w-6xl mx-auto">
        <SectionHeading
          tag="Our Cherished Ones"
          title="The Wedding Party"
          subtitle="The family and lifelong companions who stand beside us as we step into our new life together."
          alignment="center"
        />

        {/* Category Filters */}
        <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 mb-12 sm:mb-16">
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setActiveCategory(cat.id)}
              className={`px-4 sm:px-5 py-2 text-xs font-sans uppercase tracking-widest transition-all rounded-none border ${
                activeCategory === cat.id
                  ? "bg-charcoal-900 text-ivory-50 border-charcoal-900 shadow-sm"
                  : "bg-transparent text-neutral-600 border-neutral-200 hover:border-gold-400 hover:text-charcoal-900"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Wedding Party Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {filteredMembers.map((member, index) => (
            <WeddingPartyCard key={member.id} member={member} index={index} />
          ))}
        </div>

        <GoldDivider />
      </div>
    </section>
  );
};
