'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { FaqEntry } from '@/lib/types/domain';

interface QaSectionProps {
  faqs: FaqEntry[];
}

export function QaSection({ faqs }: QaSectionProps) {
  const [openId, setOpenId] = useState<string | null>(faqs[0]?.id || null);

  if (!faqs || faqs.length === 0) return null;

  return (
    <section
      id="qa"
      className="border-b border-editorialBorder bg-warmWhite py-20 sm:py-28"
    >
      <div className="mx-auto max-w-4xl px-4 sm:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="font-montserrat text-xs uppercase tracking-editorial text-softGold mb-3">
            Guest Details &amp; Guidance
          </p>
          <h2 className="font-cormorant text-4xl sm:text-5xl font-light text-charcoal">
            Questions &amp; Answers
          </h2>
          <div className="editorial-divider mx-auto w-24 my-6" />
        </div>

        <div className="mt-12 divide-y divide-editorialBorder border-t border-b border-editorialBorder">
          {faqs.map((faq) => {
            const isOpen = openId === faq.id;
            return (
              <div key={faq.id} className="py-5">
                <button
                  type="button"
                  onClick={() => setOpenId(isOpen ? null : faq.id)}
                  className="flex w-full items-center justify-between gap-4 text-left py-2 focus:outline-none"
                  aria-expanded={isOpen}
                >
                  <span className="font-cormorant text-2xl sm:text-3xl text-charcoal">
                    {faq.question}
                  </span>
                  <ChevronDown
                    className={`h-5 w-5 text-softGold shrink-0 transition-transform duration-300 ${
                      isOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25 }}
                      className="overflow-hidden"
                    >
                      <p className="pt-3 pb-2 font-montserrat text-sm leading-relaxed text-mutedGray">
                        {faq.answer}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

