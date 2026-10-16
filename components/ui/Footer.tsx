import React from "react";
import { WeddingData } from "@/types/wedding";

interface FooterProps {
  wedding: WeddingData;
}

export const Footer: React.FC<FooterProps> = ({ wedding }) => {
  return (
    <footer
      aria-label="Wedding Footer"
      className="bg-charcoal-950 text-white py-16 sm:py-24 px-4 sm:px-6 md:px-12 border-t border-gold-400/20"
    >
      <div className="max-w-4xl mx-auto text-center flex flex-col items-center">
        {/* Monogram Seal */}
        <div className="w-12 h-12 rounded-full border border-gold-400/40 flex items-center justify-center text-gold-300 font-serif text-sm tracking-widest mb-6">
          {wedding.couple.monogram}
        </div>

        {/* Couple Names */}
        <h3 className="font-serif text-3xl sm:text-4xl md:text-5xl font-light tracking-tight text-white mb-3">
          {wedding.couple.formalNames}
        </h3>

        {/* Wedding Date & Location */}
        <p className="font-sans text-xs uppercase tracking-widest text-gold-400 mb-6 font-medium">
          {wedding.hero.weddingDateDisplay} • {wedding.hero.mainLocation}
        </p>

        {/* Closing Message */}
        <p className="font-serif italic text-base sm:text-lg text-neutral-400 max-w-lg mx-auto mb-10 leading-relaxed">
          {wedding.footer.closingMessage}
        </p>

        {/* Hairline Separator */}
        <div className="w-24 h-[1px] bg-gold-400/30 mb-8" />

        {/* Subtext */}
        <p className="font-sans text-[11px] uppercase tracking-widest text-neutral-400">
          {wedding.footer.subtext}
        </p>
      </div>
    </footer>
  );
};
