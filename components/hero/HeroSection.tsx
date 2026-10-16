"use client";

import React from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { HeroData, CoupleData } from "@/types/wedding";
import { Countdown } from "@/components/hero/Countdown";
import { Calendar, MapPin, ChevronDown } from "lucide-react";

interface HeroSectionProps {
  hero: HeroData;
  couple: CoupleData;
}

export const HeroSection: React.FC<HeroSectionProps> = ({ hero, couple }) => {
  const scrollToNext = () => {
    const storySection = document.getElementById("our-story");
    if (storySection) {
      storySection.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <section
      id="hero"
      aria-label="Wedding Hero"
      className="relative min-h-screen flex flex-col items-center justify-between pt-16 pb-12 px-4 sm:px-6 md:px-12 bg-ivory-50 text-charcoal-900 overflow-hidden"
    >
      {/* Top Header Monogram & Subheading */}
      <motion.div
        initial={{ opacity: 0, y: -15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-4xl text-center pt-4 sm:pt-8"
      >
        <div className="inline-flex items-center gap-3 mb-4">
          <span className="w-8 h-[1px] bg-gold-400/60" />
          <span className="text-[11px] uppercase tracking-widest font-sans font-semibold text-gold-600">
            {hero.tagline}
          </span>
          <span className="w-8 h-[1px] bg-gold-400/60" />
        </div>

        <h1 className="font-serif text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-light text-charcoal-950 tracking-tight leading-none mb-6">
          {hero.coupleNames}
        </h1>

        <p className="font-serif italic text-base sm:text-lg md:text-xl text-neutral-600 max-w-xl mx-auto leading-relaxed">
          {hero.invitationMessage}
        </p>
      </motion.div>

      {/* Hero Editorial Photography Showcase */}
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1.2, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full max-w-4xl my-8 md:my-10"
      >
        <div className="relative aspect-[4/3] sm:aspect-[16/9] md:aspect-[21/9] w-full overflow-hidden shadow-2xl rounded-sm border border-gold-300/40">
          <Image
            src={hero.heroImage}
            alt={`${hero.coupleNames} Wedding Celebration`}
            fill
            priority
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 90vw, 1200px"
            className="object-cover object-center transition-transform duration-1000 hover:scale-105"
          />

          {/* Gentle Gradient Scrim for Editorial Tone */}
          <div className="absolute inset-0 bg-gradient-to-t from-charcoal-950/60 via-charcoal-950/15 to-transparent pointer-events-none" />

          {/* Floating Venue & Date Overlay Badge */}
          <div className="absolute bottom-4 left-4 right-4 sm:bottom-6 sm:left-6 sm:right-auto flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-6 bg-charcoal-950/80 backdrop-blur-md px-5 py-3 border border-gold-400/30 text-white rounded-none">
            <div className="flex items-center gap-2 text-xs sm:text-sm font-sans tracking-wide">
              <Calendar className="w-4 h-4 text-gold-400 shrink-0" />
              <span>{hero.weddingDateDisplay}</span>
            </div>
            <span className="hidden sm:inline text-gold-400/60">•</span>
            <div className="flex items-center gap-2 text-xs sm:text-sm font-sans tracking-wide">
              <MapPin className="w-4 h-4 text-gold-400 shrink-0" />
              <span>
                {hero.mainLocation}, {hero.subLocation}
              </span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Live Countdown & Scroll Anchor */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, delay: 0.45 }}
        className="w-full max-w-3xl flex flex-col items-center text-center"
      >
        <div className="w-full flex items-center justify-center gap-4 my-2">
          <span className="h-[1px] w-12 sm:w-20 bg-gold-400/40" />
          <span className="text-[10px] sm:text-xs uppercase tracking-widest font-sans font-medium text-gold-600">
            Counting Down To Forever
          </span>
          <span className="h-[1px] w-12 sm:w-20 bg-gold-400/40" />
        </div>

        {/* Live dynamic Countdown */}
        <Countdown targetDate={hero.isoWeddingDate} />

        {/* Subtle Scroll Indicator */}
        <button
          type="button"
          onClick={scrollToNext}
          className="group mt-8 inline-flex flex-col items-center gap-2 text-neutral-500 hover:text-charcoal-900 transition-colors focus:outline-none"
          aria-label="Scroll to Our Story section"
        >
          <span className="text-[10px] sm:text-xs uppercase tracking-widest font-sans font-medium text-neutral-500 group-hover:text-charcoal-900 transition-colors">
            {hero.scrollIndicatorText}
          </span>
          <motion.div
            animate={{ y: [0, 6, 0] }}
            transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
          >
            <ChevronDown className="w-4 h-4 text-gold-500" />
          </motion.div>
        </button>
      </motion.div>
    </section>
  );
};
