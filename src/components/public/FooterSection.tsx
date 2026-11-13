'use client';

import React from 'react';
import Link from 'next/link';
import { Lock } from 'lucide-react';
import { WeddingContent } from '@/lib/types/domain';

interface FooterSectionProps {
  content: WeddingContent;
}

export function FooterSection({ content }: FooterSectionProps) {
  return (
    <footer className="bg-ivory pt-16 pb-28 sm:pt-24 sm:pb-32 text-center">
      <div className="mx-auto max-w-4xl px-4 sm:px-8">
        <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-full border border-softGold/70 bg-warmWhite">
          <span className="font-cormorant text-lg italic text-charcoal">
            {content.coupleNames.monogram}
          </span>
        </div>

        <h2 className="font-cormorant text-3xl sm:text-4xl font-light text-charcoal">
          {content.coupleNames.displayTitle}
        </h2>

        <p className="mt-2 font-montserrat text-xs uppercase tracking-editorial text-softGold">
          {content.weddingDateDisplay}
        </p>

        <div className="editorial-divider mx-auto w-24 my-6" />

        <p className="mx-auto max-w-lg font-cormorant italic text-xl text-mutedGray">
          {content.footerClosingMessage}
        </p>

        <p className="mt-8 font-montserrat text-[11px] uppercase tracking-wider text-mutedGray/80">
          {content.footerCopyright}
        </p>

        <div className="mt-6">
          <Link
            href="/admin"
            className="inline-flex items-center gap-1.5 font-montserrat text-[10px] uppercase tracking-editorial text-mutedGray/70 hover:text-charcoal transition-colors"
          >
            <Lock className="h-3 w-3 text-softGold" />
            <span>Organizer Administration</span>
          </Link>
        </div>
      </div>
    </footer>
  );
}

