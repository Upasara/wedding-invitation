'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Calendar, MapPin } from 'lucide-react';
import { WeddingContent } from '@/lib/types/domain';

interface HeroSectionProps {
  content: WeddingContent;
}

interface CountdownTime {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isPast: boolean;
}

function calculateCountdown(targetIso: string): CountdownTime {
  const targetMs = Date.parse(targetIso);
  if (Number.isNaN(targetMs)) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, isPast: false };
  }
  const diff = targetMs - Date.now();
  if (diff <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, isPast: true };
  }
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((diff / (1000 * 60)) % 60);
  const seconds = Math.floor((diff / 1000) % 60);
  return { days, hours, minutes, seconds, isPast: false };
}

export function HeroSection({ content }: HeroSectionProps) {
  const [countdown, setCountdown] = useState<CountdownTime>(() =>
    calculateCountdown(content.weddingDateIso)
  );

  useEffect(() => {
    setCountdown(calculateCountdown(content.weddingDateIso));
    const timer = setInterval(() => {
      setCountdown(calculateCountdown(content.weddingDateIso));
    }, 1000);
    return () => clearInterval(timer);
  }, [content.weddingDateIso]);

  return (
    <section
      id="hero"
      className="relative overflow-hidden border-b border-editorialBorder bg-ivory pt-12 pb-20 sm:pt-20 sm:pb-28"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-8">
        {/* Top Tagline */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="text-center"
        >
          <p className="font-montserrat text-[11px] sm:text-xs uppercase tracking-editorial text-softGold mb-4">
            {content.heroTagline}
          </p>

          <h1 className="font-cormorant text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-light text-charcoal tracking-wide leading-none">
            {content.coupleNames.partnerOne}
            <span className="font-playfair italic text-softGold mx-2 sm:mx-5 text-3xl sm:text-5xl md:text-6xl">
              &amp;
            </span>
            {content.coupleNames.partnerTwo}
          </h1>

          <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-8 text-mutedGray font-montserrat text-xs sm:text-sm tracking-luxury uppercase">
            <span className="inline-flex items-center gap-2">
              <Calendar className="h-3.5 w-3.5 text-softGold shrink-0" />
              <span>{content.weddingDateDisplay}</span>
            </span>
            <span className="hidden sm:inline text-softGold">•</span>
            <span className="inline-flex items-center gap-2">
              <MapPin className="h-3.5 w-3.5 text-softGold shrink-0" />
              <span>{content.weddingLocationSummary}</span>
            </span>
          </div>
        </motion.div>

        {/* Main Hero Editorial Portrait Frame */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.15 }}
          className="mt-10 sm:mt-14 mx-auto max-w-3xl"
        >
          <div className="relative border border-softGold/60 bg-warmWhite p-3 sm:p-5 shadow-editorial">
            <div className="relative aspect-[4/5] sm:aspect-[16/11] w-full overflow-hidden bg-ivory">
              <img
                src={content.heroImageUrl}
                alt={`${content.coupleNames.displayTitle} portrait`}
                className="h-full w-full object-cover object-center"
              />
            </div>
          </div>
        </motion.div>

        {/* Live Countdown Timer */}
        <div className="mt-12 sm:mt-16 text-center">
          <p className="font-cormorant italic text-xl sm:text-2xl text-mutedGray mb-6">
            {content.countdownHeading}
          </p>

          {countdown.isPast ? (
            <div className="mx-auto max-w-xl border border-softGold/50 bg-warmWhite px-6 py-6 shadow-card">
              <p className="font-cormorant text-2xl sm:text-3xl text-charcoal">
                {content.postWeddingMessage}
              </p>
            </div>
          ) : (
            <div
              className="mx-auto grid max-w-2xl grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-6"
              aria-label="Countdown to wedding ceremony"
            >
              {[
                { label: 'Days', value: countdown.days },
                { label: 'Hours', value: countdown.hours },
                { label: 'Minutes', value: countdown.minutes },
                { label: 'Seconds', value: countdown.seconds },
              ].map((item) => (
                <div
                  key={item.label}
                  className="border border-softGold/40 bg-warmWhite px-4 py-5 sm:py-6 shadow-card"
                >
                  <div className="font-cormorant text-3xl sm:text-5xl font-light text-charcoal tabular-nums">
                    {String(item.value).padStart(2, '0')}
                  </div>
                  <div className="mt-1.5 font-montserrat text-[10px] sm:text-xs uppercase tracking-editorial text-mutedGray">
                    {item.label}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

