'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Calendar, Clock, MapPin, ExternalLink, Info } from 'lucide-react';
import { WeddingEvent } from '@/lib/types/domain';

interface EventsSectionProps {
  events: WeddingEvent[];
}

export function EventsSection({ events }: EventsSectionProps) {
  if (!events || events.length === 0) return null;

  return (
    <section
      id="events"
      className="border-b border-editorialBorder bg-warmWhite py-20 sm:py-28"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="font-montserrat text-xs uppercase tracking-editorial text-softGold mb-3">
            The Schedule of Celebrations
          </p>
          <h2 className="font-cormorant text-4xl sm:text-5xl font-light text-charcoal">
            Wedding Events
          </h2>
          <div className="editorial-divider mx-auto w-24 my-6" />
        </div>

        <div className="mt-12 grid grid-cols-1 lg:grid-cols-3 gap-8">
          {events.map((evt, index) => (
            <motion.article
              key={evt.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.08 }}
              className="flex flex-col justify-between border border-softGold/50 bg-ivory/60 p-6 sm:p-8 shadow-card"
            >
              <div>
                {evt.imageUrl && (
                  <div className="mb-6 aspect-[16/10] w-full overflow-hidden border border-editorialBorder bg-warmWhite">
                    <img
                      src={evt.imageUrl}
                      alt={evt.title}
                      className="h-full w-full object-cover"
                    />
                  </div>
                )}

                <span className="font-montserrat text-[10px] uppercase tracking-editorial text-softGold">
                  Event 0{index + 1}
                </span>

                <h3 className="mt-2 font-cormorant text-2xl sm:text-3xl font-medium text-charcoal">
                  {evt.title}
                </h3>

                <div className="mt-5 space-y-2.5 border-t border-b border-editorialBorder py-4 font-montserrat text-xs text-charcoal">
                  <div className="flex items-start gap-2.5">
                    <Calendar className="h-4 w-4 text-softGold shrink-0 mt-0.5" />
                    <span>{evt.dateDisplay || evt.date}</span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <Clock className="h-4 w-4 text-softGold shrink-0 mt-0.5" />
                    <span>
                      {evt.startTime}
                      {evt.endTime ? ` – ${evt.endTime}` : ''}
                    </span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <MapPin className="h-4 w-4 text-softGold shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-charcoal">{evt.venueName}</p>
                      <p className="text-mutedGray mt-0.5">{evt.fullAddress}</p>
                    </div>
                  </div>
                </div>

                <p className="mt-5 font-montserrat text-xs sm:text-sm leading-relaxed text-mutedGray">
                  {evt.description}
                </p>

                {evt.notes && (
                  <div className="mt-4 flex items-start gap-2 bg-warmWhite/80 border border-editorialBorder p-3 text-xs text-charcoal/85 font-montserrat">
                    <Info className="h-3.5 w-3.5 text-softGold shrink-0 mt-0.5" />
                    <span>{evt.notes}</span>
                  </div>
                )}
              </div>

              {evt.googleMapsUrl && (
                <div className="mt-7 pt-2">
                  <a
                    href={evt.googleMapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex w-full items-center justify-center gap-2 border border-charcoal bg-transparent px-5 py-3 font-montserrat text-xs uppercase tracking-editorial text-charcoal transition-colors hover:bg-charcoal hover:text-ivory"
                  >
                    <span>{evt.directionsLabel || 'View Directions'}</span>
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </div>
              )}
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}

