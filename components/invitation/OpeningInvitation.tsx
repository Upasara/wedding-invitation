"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { WeddingData } from "@/types/wedding";
import { useMusic } from "@/context/MusicContext";
import { Mail, Sparkles } from "lucide-react";

interface OpeningInvitationProps {
  wedding: WeddingData;
  onOpened?: () => void;
}

export const OpeningInvitation: React.FC<OpeningInvitationProps> = ({
  wedding,
  onOpened,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isOpening, setIsOpening] = useState(false);
  const { startMusic } = useMusic();

  const handleOpen = async () => {
    if (isOpening || isOpen) return;
    setIsOpening(true);

    // 1. Play background music on user intent
    try {
      await startMusic();
    } catch (e) {
      console.warn("Audio initiation:", e);
    }

    // 2. Allow opening animation to unfold gracefully
    setTimeout(() => {
      setIsOpen(true);
      if (onOpened) onOpened();
    }, 1200);
  };

  return (
    <AnimatePresence>
      {!isOpen && (
        <motion.div
          key="invitation-overlay"
          initial={{ opacity: 1 }}
          exit={{
            opacity: 0,
            scale: 1.04,
            transition: { duration: 1.2, ease: [0.16, 1, 0.3, 1] },
          }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-charcoal-950/90 backdrop-blur-md overflow-hidden select-none"
        >
          {/* Subtle Ambient Background Lighting */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-amber-900/10 via-charcoal-950/80 to-charcoal-950 pointer-events-none" />

          {/* Physical Invitation Envelope / Stationery Card */}
          <motion.div
            initial={{ scale: 0.94, opacity: 0, y: 20 }}
            animate={{
              scale: isOpening ? [1, 1.02, 0.98] : 1,
              opacity: 1,
              y: 0,
              rotateX: isOpening ? -8 : 0,
            }}
            transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full max-w-lg md:max-w-xl bg-ivory-50 text-charcoal-900 shadow-2xl rounded-sm p-8 sm:p-12 md:p-16 border border-gold-300/60 overflow-hidden"
            style={{
              boxShadow:
                "0 25px 60px -15px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(197, 168, 128, 0.4)",
            }}
          >
            {/* Elegant Hairline Double Border */}
            <div className="absolute inset-3 sm:inset-4 border border-gold-400/40 pointer-events-none" />
            <div className="absolute inset-4 sm:inset-5 border border-gold-400/20 pointer-events-none" />

            {/* Corner Decorative Accents */}
            <div className="absolute top-4 left-4 w-3 h-3 border-t-2 border-l-2 border-gold-500/60" />
            <div className="absolute top-4 right-4 w-3 h-3 border-t-2 border-r-2 border-gold-500/60" />
            <div className="absolute bottom-4 left-4 w-3 h-3 border-b-2 border-l-2 border-gold-500/60" />
            <div className="absolute bottom-4 right-4 w-3 h-3 border-b-2 border-r-2 border-gold-500/60" />

            {/* Content Container */}
            <div className="relative z-10 flex flex-col items-center text-center py-4">
              {/* Wax Seal / Monogram Emblem */}
              <motion.div
                animate={
                  isOpening
                    ? {
                        scale: [1, 1.25, 0],
                        opacity: [1, 1, 0],
                        rotate: [0, -10, 15],
                      }
                    : { scale: 1 }
                }
                transition={{ duration: 0.9 }}
                className="w-16 h-16 sm:w-20 sm:h-20 mb-8 rounded-full bg-gradient-to-br from-gold-300 via-gold-500 to-gold-700 flex items-center justify-center shadow-lg border-2 border-ivory-100 ring-2 ring-gold-400/30"
              >
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full border border-gold-200/50 flex flex-col items-center justify-center text-ivory-50">
                  <span className="font-serif text-base sm:text-lg tracking-widest font-bold">
                    {wedding.couple.monogram}
                  </span>
                </div>
              </motion.div>

              {/* Host Line */}
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2, duration: 0.8 }}
                className="font-sans text-xs sm:text-sm uppercase tracking-widest text-neutral-500 font-medium mb-4"
              >
                {wedding.invitation.hostLine}
              </motion.p>

              {/* Couple Names */}
              <motion.h1
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35, duration: 0.9 }}
                className="font-serif text-3xl sm:text-4xl md:text-5xl font-light text-charcoal-900 tracking-tight mb-5 leading-tight"
              >
                {wedding.couple.shortNames}
              </motion.h1>

              {/* Gold Ornament Divider */}
              <div className="flex items-center justify-center w-28 gap-2 my-1">
                <span className="h-[1px] flex-1 bg-gold-400/50" />
                <span className="w-1.5 h-1.5 rotate-45 border border-gold-500 bg-gold-200" />
                <span className="h-[1px] flex-1 bg-gold-400/50" />
              </div>

              {/* Invitation Subtext */}
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5, duration: 0.8 }}
                className="font-serif italic text-base sm:text-lg text-neutral-600 mt-5 mb-8 max-w-sm leading-relaxed"
              >
                {wedding.invitation.headline}
              </motion.p>

              <p className="text-[11px] font-sans uppercase tracking-widest text-gold-700/80 mb-8 font-medium">
                {wedding.invitation.envelopeSubtext}
              </p>

              {/* Open Invitation Action Button */}
              <motion.button
                type="button"
                onClick={handleOpen}
                disabled={isOpening}
                whileHover={!isOpening ? { scale: 1.03 } : {}}
                whileTap={!isOpening ? { scale: 0.97 } : {}}
                className={`group relative inline-flex items-center gap-3 px-8 py-3.5 sm:px-10 sm:py-4 bg-charcoal-900 text-ivory-50 rounded-none border border-gold-400/80 shadow-md hover:bg-charcoal-950 transition-all focus:outline-none focus:ring-2 focus:ring-gold-500 focus:ring-offset-2 ${
                  isOpening ? "opacity-80 cursor-wait" : ""
                }`}
                aria-label="Open Wedding Invitation and Play Music"
              >
                <span className="text-xs sm:text-sm font-sans uppercase tracking-widest text-gold-200 group-hover:text-gold-100 font-medium">
                  {isOpening ? "Opening..." : wedding.invitation.openButtonText}
                </span>
                <span className="w-4 h-4 text-gold-400 transition-transform group-hover:translate-x-0.5">
                  <Mail className="w-4 h-4" />
                </span>

                {/* Subtle sheen highlight */}
                <span className="absolute inset-0 border border-gold-400/20 pointer-events-none" />
              </motion.button>

              <span className="mt-4 text-[10px] uppercase tracking-widest text-neutral-400 font-sans">
                Audio will accompany the invitation
              </span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
