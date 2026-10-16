"use client";

import React from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { StoryData, CoupleData } from "@/types/wedding";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { GoldDivider } from "@/components/ui/GoldDivider";

interface OurStorySectionProps {
  story: StoryData;
  couple: CoupleData;
}

export const OurStorySection: React.FC<OurStorySectionProps> = ({
  story,
  couple,
}) => {
  return (
    <section
      id="our-story"
      aria-label="Our Story"
      className="py-20 md:py-32 px-4 sm:px-6 md:px-12 bg-white text-charcoal-900 overflow-hidden"
    >
      <div className="max-w-6xl mx-auto">
        <SectionHeading
          tag="Our Journey"
          title={story.heading}
          subtitle={story.subheading}
          alignment="center"
        />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
          {/* Couple Editorial Portrait */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
            className="lg:col-span-6 relative"
          >
            {/* Layered Accent Frame */}
            <div className="absolute -inset-3 sm:-inset-4 border border-gold-300/40 rounded-sm pointer-events-none -rotate-1 hidden sm:block" />

            <div className="relative aspect-[3/4] sm:aspect-[4/5] w-full overflow-hidden rounded-sm shadow-xl border border-gold-200/60 bg-neutral-100">
              <Image
                src={story.coupleImage}
                alt={`${couple.formalNames}`}
                fill
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-cover object-center transition-transform duration-700 hover:scale-105"
              />

              {/* Delicate Gold Monogram Badge on bottom corner */}
              <div className="absolute bottom-4 right-4 bg-charcoal-950/80 backdrop-blur-md px-3.5 py-1.5 border border-gold-400/40 text-gold-300 text-xs font-serif tracking-widest">
                {couple.monogram}
              </div>
            </div>

            {story.coupleImageCaption && (
              <p className="mt-3 text-center sm:text-left text-xs font-serif italic text-neutral-500">
                {story.coupleImageCaption}
              </p>
            )}
          </motion.div>

          {/* Narrative Content */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 1, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
            className="lg:col-span-6 flex flex-col justify-center space-y-6"
          >
            <div className="space-y-2">
              <span className="text-[11px] uppercase tracking-widest font-sans font-semibold text-gold-600">
                A Love Written in the Stars
              </span>
              <h3 className="font-serif text-2xl sm:text-3xl md:text-4xl font-light text-charcoal-900 tracking-tight">
                {couple.formalNames}
              </h3>
            </div>

            <div className="space-y-5 text-neutral-600 font-serif text-base sm:text-lg leading-relaxed font-light">
              {story.paragraphs.map((paragraph, index) => (
                <p key={index} className="leading-relaxed">
                  {paragraph}
                </p>
              ))}
            </div>

            {/* Quote Callout */}
            {story.quote && (
              <div className="pt-4 border-t border-gold-300/40">
                <blockquote className="font-serif italic text-lg sm:text-xl text-charcoal-800 border-l-2 border-gold-400 pl-4 py-1">
                  “{story.quote}”
                </blockquote>
                {story.quoteAuthor && (
                  <p className="mt-2 pl-4 text-xs font-sans uppercase tracking-widest text-gold-700 font-medium">
                    — {story.quoteAuthor}
                  </p>
                )}
              </div>
            )}
          </motion.div>
        </div>

        <GoldDivider />
      </div>
    </section>
  );
};
