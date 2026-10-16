"use client";

import React, { useEffect, useCallback } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { GalleryImage } from "@/types/wedding";
import { X, ChevronLeft, ChevronRight } from "lucide-react";

interface LightboxProps {
  images: GalleryImage[];
  currentIndex: number | null;
  onClose: () => void;
  onNavigate: (index: number) => void;
}

export const Lightbox: React.FC<LightboxProps> = ({
  images,
  currentIndex,
  onClose,
  onNavigate,
}) => {
  const isOpen = currentIndex !== null;
  const currentImage = isOpen ? images[currentIndex] : null;

  const handlePrev = useCallback(() => {
    if (currentIndex === null) return;
    const prevIndex = (currentIndex - 1 + images.length) % images.length;
    onNavigate(prevIndex);
  }, [currentIndex, images.length, onNavigate]);

  const handleNext = useCallback(() => {
    if (currentIndex === null) return;
    const nextIndex = (currentIndex + 1) % images.length;
    onNavigate(nextIndex);
  }, [currentIndex, images.length, onNavigate]);

  // Keyboard navigation & body scroll lock
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") handlePrev();
      if (e.key === "ArrowRight") handleNext();
    };

    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "auto";
    };
  }, [isOpen, onClose, handlePrev, handleNext]);

  return (
    <AnimatePresence>
      {isOpen && currentImage && (
        <motion.div
          key="lightbox-modal"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-charcoal-950/95 backdrop-blur-lg select-none p-4 sm:p-6 md:p-10"
          role="dialog"
          aria-modal="true"
          aria-label="Image gallery lightbox"
        >
          {/* Close Button */}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-5 right-5 sm:top-8 sm:right-8 z-50 p-2.5 rounded-full bg-charcoal-900/80 hover:bg-charcoal-800 text-neutral-300 hover:text-white border border-neutral-700 transition-colors focus:outline-none focus:ring-2 focus:ring-gold-400"
            aria-label="Close lightbox"
          >
            <X className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>

          {/* Previous Button */}
          <button
            type="button"
            onClick={handlePrev}
            className="absolute left-3 sm:left-6 z-50 p-2.5 sm:p-3 rounded-full bg-charcoal-900/80 hover:bg-charcoal-800 text-neutral-300 hover:text-white border border-neutral-700 transition-colors focus:outline-none focus:ring-2 focus:ring-gold-400"
            aria-label="Previous photograph"
          >
            <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>

          {/* Next Button */}
          <button
            type="button"
            onClick={handleNext}
            className="absolute right-3 sm:right-6 z-50 p-2.5 sm:p-3 rounded-full bg-charcoal-900/80 hover:bg-charcoal-800 text-neutral-300 hover:text-white border border-neutral-700 transition-colors focus:outline-none focus:ring-2 focus:ring-gold-400"
            aria-label="Next photograph"
          >
            <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>

          {/* Image & Caption Display */}
          <div className="relative max-w-5xl max-h-[85vh] w-full flex flex-col items-center justify-center">
            <motion.div
              key={currentImage.id}
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.25 }}
              className="relative w-full h-[60vh] sm:h-[70vh] max-h-[750px] overflow-hidden rounded-sm"
            >
              <Image
                src={currentImage.imageUrl}
                alt={currentImage.caption || "Wedding photograph"}
                fill
                sizes="(max-width: 1200px) 100vw, 1200px"
                className="object-contain"
                priority
              />
            </motion.div>

            {/* Caption & Counter Bar */}
            <div className="mt-4 text-center max-w-xl px-4">
              <p className="font-serif italic text-base sm:text-lg text-neutral-200">
                {currentImage.caption}
              </p>
              <p className="font-sans text-[11px] uppercase tracking-widest text-gold-400 mt-1">
                {currentIndex + 1} of {images.length}
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
