"use client";

import React from "react";
import Image from "next/image";
import { WeddingPartyMember } from "@/types/wedding";
import { motion } from "framer-motion";

interface WeddingPartyCardProps {
  member: WeddingPartyMember;
  index: number;
}

export const WeddingPartyCard: React.FC<WeddingPartyCardProps> = ({
  member,
  index,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.6, delay: (index % 4) * 0.1, ease: [0.16, 1, 0.3, 1] }}
      className="group flex flex-col bg-white border border-neutral-200/80 hover:border-gold-300/80 transition-all duration-300 overflow-hidden shadow-sm hover:shadow-md"
    >
      {/* Portrait Image */}
      <div className="relative aspect-[3/4] w-full overflow-hidden bg-neutral-100">
        <Image
          src={member.image}
          alt={`${member.name} — ${member.role}`}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          className="object-cover object-top transition-transform duration-700 group-hover:scale-105"
        />
        {/* Subtle Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-charcoal-950/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      </div>

      {/* Member Details */}
      <div className="p-5 sm:p-6 flex flex-col flex-1 text-center">
        {/* Role Tag */}
        <span className="text-[11px] uppercase tracking-widest font-sans font-semibold text-gold-600 mb-1.5">
          {member.role}
        </span>

        {/* Member Name */}
        <h3 className="font-serif text-xl sm:text-2xl font-light text-charcoal-900 tracking-tight mb-2">
          {member.name}
        </h3>

        {/* Short Bio / Description */}
        <p className="font-serif text-sm text-neutral-600 italic leading-relaxed mt-auto pt-2 border-t border-neutral-100">
          {member.description}
        </p>
      </div>
    </motion.div>
  );
};
