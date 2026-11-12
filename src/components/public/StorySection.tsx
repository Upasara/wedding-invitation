'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { StoryEntry, WeddingContent } from '@/lib/types/domain';

interface StorySectionProps {
  content: WeddingContent;
  storyEntries: StoryEntry[];
}

export function StorySection({ content, storyEntries }: StorySectionProps) {
  return (
    <section
      id="our-story"
      className="border-b border-editorialBorder bg-ivory py-20 sm:py-28"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-8">
        {/* Section Heading */}
        <div className="mx-auto max-w-2xl text-center">
          <p className="font-montserrat text-xs uppercase tracking-editorial text-softGold mb-3">
            {content.storySectionSubtitle}
          </p>
          <h2 className="font-cormorant text-4xl sm:text-5xl font-light text-charcoal">
            {content.storySectionTitle}
          </h2>
          <div className="editorial-divider mx-auto w-24 my-6" />
          <p className="font-cormorant text-xl sm:text-2xl italic text-mutedGray leading-relaxed">
            {content.storyIntroText}
          </p>
        </div>

        {/* Couple Individual Editorial Bios */}
        <div className="mt-14 grid grid-cols-1 md:grid-cols-2 gap-8 sm:gap-12">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="border border-editorialBorder bg-warmWhite p-5 sm:p-8 shadow-card"
          >
            {content.couplePhotoOneUrl && (
              <div className="mb-6 aspect-[4/5] w-full overflow-hidden bg-ivory border border-softGold/30">
                <img
                  src={content.couplePhotoOneUrl}
                  alt={content.coupleNames.partnerOne}
                  className="h-full w-full object-cover"
                />
              </div>
            )}
            <p className="font-montserrat text-[10px] uppercase tracking-editorial text-softGold">
              The Bride
            </p>
            <h3 className="mt-1 font-cormorant text-3xl text-charcoal">
              {content.coupleNames.partnerOne}
            </h3>
            <p className="mt-3 font-montserrat text-sm leading-relaxed text-mutedGray">
              {content.partnerOneBio}
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="border border-editorialBorder bg-warmWhite p-5 sm:p-8 shadow-card"
          >
            {content.couplePhotoTwoUrl && (
              <div className="mb-6 aspect-[4/5] w-full overflow-hidden bg-ivory border border-softGold/30">
                <img
                  src={content.couplePhotoTwoUrl}
                  alt={content.coupleNames.partnerTwo}
                  className="h-full w-full object-cover"
                />
              </div>
            )}
            <p className="font-montserrat text-[10px] uppercase tracking-editorial text-softGold">
              The Groom
            </p>
            <h3 className="mt-1 font-cormorant text-3xl text-charcoal">
              {content.coupleNames.partnerTwo}
            </h3>
            <p className="mt-3 font-montserrat text-sm leading-relaxed text-mutedGray">
              {content.partnerTwoBio}
            </p>
          </motion.div>
        </div>

        {/* Editorial Milestones */}
        {storyEntries.length > 0 && (
          <div className="mt-20 space-y-16 sm:space-y-24">
            {storyEntries.map((entry, idx) => {
              const isReversed = idx % 2 === 1;
              return (
                <motion.article
                  key={entry.id}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.7 }}
                  className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center"
                >
                  <div
                    className={`lg:col-span-6 ${
                      isReversed ? 'lg:order-2' : 'lg:order-1'
                    }`}
                  >
                    {entry.imageUrl && (
                      <div className="border border-softGold/50 bg-warmWhite p-3 shadow-card">
                        <div className="aspect-[16/11] w-full overflow-hidden bg-ivory">
                          <img
                            src={entry.imageUrl}
                            alt={entry.title}
                            className="h-full w-full object-cover"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  <div
                    className={`lg:col-span-6 ${
                      isReversed ? 'lg:order-1 lg:pr-6' : 'lg:order-2 lg:pl-6'
                    }`}
                  >
                    <span className="inline-block border-b border-softGold pb-1 font-montserrat text-xs uppercase tracking-editorial text-softGold">
                      {entry.dateLabel}
                    </span>
                    <h3 className="mt-4 font-cormorant text-3xl sm:text-4xl font-light text-charcoal">
                      {entry.title}
                    </h3>
                    {entry.caption && (
                      <p className="mt-2 font-cormorant italic text-lg text-mutedGray">
                        {entry.caption}
                      </p>
                    )}
                    <p className="mt-4 font-montserrat text-sm leading-relaxed text-charcoal/85">
                      {entry.description}
                    </p>
                  </div>
                </motion.article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

