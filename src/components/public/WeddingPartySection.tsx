'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { WeddingPartyMember } from '@/lib/types/domain';

interface WeddingPartySectionProps {
  members: WeddingPartyMember[];
}

export function WeddingPartySection({ members }: WeddingPartySectionProps) {
  if (!members || members.length === 0) return null;

  return (
    <section
      id="wedding-party"
      className="border-b border-editorialBorder bg-warmWhite py-20 sm:py-28"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="font-montserrat text-xs uppercase tracking-editorial text-softGold mb-3">
            Standing By Our Side
          </p>
          <h2 className="font-cormorant text-4xl sm:text-5xl font-light text-charcoal">
            The Wedding Party
          </h2>
          <div className="editorial-divider mx-auto w-24 my-6" />
        </div>

        <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {members.map((person, index) => (
            <motion.div
              key={person.id}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: (index % 3) * 0.08 }}
              className="border border-editorialBorder bg-ivory/50 p-6 text-center shadow-card"
            >
              {person.imageUrl && (
                <div className="mx-auto mb-5 aspect-[4/5] max-w-[240px] overflow-hidden border border-softGold/40 bg-warmWhite p-2">
                  <img
                    src={person.imageUrl}
                    alt={person.name}
                    loading="lazy"
                    className="h-full w-full object-cover"
                  />
                </div>
              )}

              <p className="font-montserrat text-[10px] uppercase tracking-editorial text-softGold">
                {person.role}
              </p>

              <h3 className="mt-1.5 font-cormorant text-2xl sm:text-3xl text-charcoal">
                {person.name}
              </h3>

              {person.description && (
                <p className="mt-3 font-montserrat text-xs leading-relaxed text-mutedGray">
                  {person.description}
                </p>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

