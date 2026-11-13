"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, MailOpen } from "lucide-react";
import { PublicHouseholdSessionView, WeddingContent } from "@/lib/types/domain";

const INTRO_VIDEO_SRC = "/videos/wedding-intro.mp4";

interface OpeningCoverProps {
  isOpen: boolean;
  onOpen: () => void;
  onInteract?: () => void;
  content: WeddingContent;
  householdSession: PublicHouseholdSessionView | null;
}

export function OpeningCover({
  isOpen,
  onOpen,
  onInteract,
  content,
  householdSession,
}: OpeningCoverProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const isPlayingRef = useRef(false);
  const hasCompletedRef = useRef(false);

  const [isPlayingVideo, setIsPlayingVideo] = useState(false);
  const [hasVideoError, setHasVideoError] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  // Detect prefers-reduced-motion
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mediaQuery.matches);

    const handleChange = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches);
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => {
      mediaQuery.removeEventListener("change", handleChange);
    };
  }, []);

  // Ensure video pauses and cleans up on unmount or when cover opens
  useEffect(() => {
    const videoEl = videoRef.current;
    return () => {
      if (videoEl) {
        videoEl.pause();
      }
    };
  }, []);

  const completeCoverTransition = useCallback(() => {
    if (hasCompletedRef.current) return;
    hasCompletedRef.current = true;
    isPlayingRef.current = false;
    onOpen();
  }, [onOpen]);

  // Display a suitable initial still frame (0.01s) before any interaction without autoplaying
  const handleLoadedMetadata = () => {
    const videoEl = videoRef.current;
    if (!videoEl || isPlayingRef.current) return;
    try {
      videoEl.pause();
      if (videoEl.currentTime === 0) {
        videoEl.currentTime = 0.01;
      }
    } catch {
      // Ignore seek restrictions prior to decode
    }
  };

  const handleVideoError = () => {
    setHasVideoError(true);
    if (isPlayingRef.current) {
      completeCoverTransition();
    }
  };

  const handleVideoEnded = () => {
    completeCoverTransition();
  };

  const handleOpenButtonClick = () => {
    // Prevent duplicate playback when clicked repeatedly
    if (isPlayingRef.current || hasCompletedRef.current) return;

    // Trigger user-interaction callback immediately so AudioPlayer can start within the user gesture
    onInteract?.();

    const videoEl = videoRef.current;
    if (prefersReducedMotion || hasVideoError || !videoEl) {
      completeCoverTransition();
      return;
    }

    isPlayingRef.current = true;
    setIsPlayingVideo(true);

    try {
      videoEl.currentTime = 0;
      const playPromise = videoEl.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {
          setHasVideoError(true);
          completeCoverTransition();
        });
      }
    } catch {
      setHasVideoError(true);
      completeCoverTransition();
    }
  };

  return (
    <AnimatePresence>
      {!isOpen && (
        <motion.div
          key="invitation-opening-cover"
          initial={{ opacity: 1 }}
          exit={
            prefersReducedMotion
              ? { opacity: 0, transition: { duration: 0.3, ease: "easeOut" } }
              : {
                  opacity: 0,
                  scale: 1.03,
                  filter: "blur(6px)",
                  transition: { duration: 0.9, ease: [0.22, 1, 0.36, 1] },
                }
          }
          className="fixed inset-0 z-50 flex items-center justify-center bg-ivory px-4 py-6 sm:px-8 overflow-y-auto"
          role="dialog"
          aria-modal="true"
          aria-label="Wedding Invitation Cover"
        >
          {/* Full-Screen Cinematic Intro Video Background (with graceful fallback to bg-ivory on error) */}
          {!hasVideoError && (
            <div
              className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-charcoal/90"
              aria-hidden="true"
            >
              <video
                ref={videoRef}
                src={INTRO_VIDEO_SRC}
                muted
                playsInline
                preload="auto"
                onLoadedMetadata={handleLoadedMetadata}
                onEnded={handleVideoEnded}
                onError={handleVideoError}
                className="h-full w-full object-cover object-[50%_38%] sm:object-center"
              />
              {/* Subtle luxury vignette overlay to ensure readability before opening and cinematic warmth during playback */}
              <div
                className={` inset-0 absolute transition-opacity duration-700 ${
                  isPlayingVideo
                    ? "bg-gradient-to-b from-charcoal/20 via-transparent to-charcoal/30 opacity-70"
                    : "bg-gradient-to-b from-charcoal/45 via-charcoal/25 to-charcoal/50 opacity-100"
                }`}
              />
            </div>
          )}

          {/* Outer Luxury Stationery Card — gracefully fades out when video starts playing */}
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={
              isPlayingVideo
                ? {
                    opacity: 0,
                    scale: 0.97,
                    y: -8,
                    transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] },
                  }
                : {
                    opacity: 1,
                    scale: 1,
                    y: 0,
                    transition: { duration: 0.7, ease: "easeOut" },
                  }
            }
            className={`relative z-10 w-full max-w-2xl bg-warmWhite/80 backdrop-blur-[2px] border border-softGold/60 shadow-editorial p-3 sm:p-5 my-auto ${
              isPlayingVideo ? "pointer-events-none select-none" : ""
            }`}
          >
            {/* Inner Double Hairline Frame */}
            <div className="relative border border-charcoal/15 px-5 py-10 sm:px-12 sm:py-14 text-center flex flex-col items-center">
              {/* Corner Botanical Accents */}
              <span className="pointer-events-none absolute top-2 left-2 h-4 w-4 border-t border-l border-softGold" />
              <span className="pointer-events-none absolute top-2 right-2 h-4 w-4 border-t border-r border-softGold" />
              <span className="pointer-events-none absolute bottom-2 left-2 h-4 w-4 border-b border-l border-softGold" />
              <span className="pointer-events-none absolute bottom-2 right-2 h-4 w-4 border-b border-r border-softGold" />

              {/* Monogram Crest */}
              <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full border border-softGold/80 bg-ivory text-charcoal shadow-sm">
                <span className="font-cormorant text-xl sm:text-2xl italic tracking-widest text-charcoal">
                  {content.coupleNames.monogram}
                </span>
              </div>

              {/* Cover Phrase */}
              <p className="font-montserrat text-[10px] sm:text-xs uppercase tracking-editorial text-mutedGray mb-4">
                {content.coverPhrase}
              </p>

              {/* Couple Names */}
              <h1 className="font-cormorant text-4xl sm:text-6xl md:text-7xl font-light tracking-wide text-charcoal leading-tight mb-4">
                {content.coupleNames.partnerOne}
                <span className="block sm:inline font-playfair italic text-softGold mx-3 text-3xl sm:text-5xl">
                  &amp;
                </span>
                {content.coupleNames.partnerTwo}
              </h1>

              {/* Subtext */}
              <p className="max-w-md font-cormorant italic text-lg sm:text-xl text-mutedGray mb-6">
                {content.coverSubtext}
              </p>

              <div className="editorial-divider w-36 my-4" />

              {/* Personalized Household Greeting Badge (when verified via code) */}
              {householdSession ? (
                <div className="my-4 w-full max-w-md rounded-none border border-softGold/40 bg-ivory/80 px-4 py-4">
                  <p className="font-montserrat text-[10px] uppercase tracking-editorial text-softGold mb-1 flex items-center justify-center gap-1.5">
                    <Sparkles className="h-3 w-3" /> Personal Invitation
                    Reserved For
                  </p>
                  <p className="font-cormorant text-2xl sm:text-3xl font-medium text-charcoal">
                    {householdSession.displayName}
                  </p>
                  <p className="mt-1.5 font-montserrat text-xs text-mutedGray">
                    {householdSession.members
                      .map((m) => m.fullName)
                      .join(" • ")}
                  </p>
                </div>
              ) : (
                <div className="my-3 text-center">
                  <p className="font-cormorant text-lg sm:text-xl text-charcoal">
                    {content.weddingDateDisplay}
                  </p>
                  <p className="mt-1 font-montserrat text-xs uppercase tracking-luxury text-mutedGray">
                    {content.weddingLocationSummary}
                  </p>
                </div>
              )}

              {/* Open Invitation Button */}
              <button
                type="button"
                onClick={handleOpenButtonClick}
                disabled={isPlayingVideo}
                aria-busy={isPlayingVideo}
                className="mt-7 group relative inline-flex items-center justify-center gap-3 border border-charcoal bg-charcoal px-8 py-3.5 text-xs sm:text-sm font-montserrat uppercase tracking-editorial text-ivory transition-all duration-300 hover:bg-transparent hover:text-charcoal focus:outline-none focus:ring-2 focus:ring-softGold disabled:pointer-events-none"
              >
                <MailOpen className="h-4 w-4 text-softGold transition-transform duration-300 group-hover:scale-110" />
                <span>Open Invitation</span>
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
