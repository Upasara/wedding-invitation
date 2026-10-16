"use client";

import React, { useState } from "react";
import { useMusic } from "@/context/MusicContext";
import { Volume2, VolumeX, Music } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export const FloatingMusicController: React.FC = () => {
  const { isPlaying, isMuted, hasStarted, toggleMute, togglePlay, trackInfo } =
    useMusic();
  const [showTooltip, setShowTooltip] = useState(false);

  // Only show after the opening invitation interaction has occurred
  if (!hasStarted) return null;

  const isSilenced = isMuted || !isPlaying;

  const handleToggle = () => {
    if (isMuted) {
      toggleMute();
      if (!isPlaying) togglePlay();
    } else if (!isPlaying) {
      togglePlay();
    } else {
      toggleMute();
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-40 flex items-center gap-3">
      <AnimatePresence>
        {showTooltip && (
          <motion.div
            initial={{ opacity: 0, x: 10, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="hidden sm:flex flex-col items-end bg-charcoal-900/95 backdrop-blur-md border border-gold-400/30 text-white px-3.5 py-1.5 rounded-full shadow-xl pointer-events-none"
          >
            <span className="text-[10px] uppercase tracking-widest text-gold-300 font-sans">
              Background Music
            </span>
            <span className="text-xs text-white/90 font-serif italic max-w-[200px] truncate">
              {trackInfo.title}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        type="button"
        onClick={handleToggle}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        aria-label={isSilenced ? "Unmute background music" : "Mute background music"}
        aria-pressed={!isSilenced}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        transition={{ duration: 0.3 }}
        className="group relative flex items-center justify-center w-12 h-12 rounded-full bg-charcoal-950/85 hover:bg-charcoal-900 text-gold-300 border border-gold-400/40 shadow-lg backdrop-blur-md transition-colors focus:outline-none focus:ring-2 focus:ring-gold-400 focus:ring-offset-2 focus:ring-offset-charcoal-950"
      >
        {/* Subtle pulsating glow when playing */}
        {!isSilenced && (
          <span
            className="absolute inset-0 rounded-full border border-gold-400/40 animate-ping pointer-events-none opacity-40"
            style={{ animationDuration: "3s" }}
          />
        )}

        {/* Audio wave indicator dots */}
        {!isSilenced ? (
          <div className="relative flex items-center justify-center">
            <Volume2 className="w-5 h-5 transition-transform group-hover:scale-110" />
            <span className="absolute -top-1 -right-1 flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-gold-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-gold-400"></span>
            </span>
          </div>
        ) : (
          <VolumeX className="w-5 h-5 text-neutral-400 transition-transform group-hover:scale-110" />
        )}
      </motion.button>
    </div>
  );
};
