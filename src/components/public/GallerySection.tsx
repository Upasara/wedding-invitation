'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, X, Maximize2 } from 'lucide-react';
import { GalleryImage } from '@/lib/types/domain';

interface GallerySectionProps {
  images: GalleryImage[];
}

export function GallerySection({ images }: GallerySectionProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);

  const closeLightbox = useCallback(() => {
    setActiveIndex(null);
  }, []);

  const showPrev = useCallback(() => {
    setActiveIndex((prev) => {
      if (prev === null || images.length === 0) return null;
      return (prev - 1 + images.length) % images.length;
    });
  }, [images.length]);

  const showNext = useCallback(() => {
    setActiveIndex((prev) => {
      if (prev === null || images.length === 0) return null;
      return (prev + 1) % images.length;
    });
  }, [images.length]);

  useEffect(() => {
    if (activeIndex === null) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowLeft') showPrev();
      if (e.key === 'ArrowRight') showNext();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeIndex, closeLightbox, showPrev, showNext]);

  if (!images || images.length === 0) return null;

  const currentImage = activeIndex !== null ? images[activeIndex] : null;

  return (
    <section
      id="gallery"
      className="border-b border-editorialBorder bg-ivory py-20 sm:py-28"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="font-montserrat text-xs uppercase tracking-editorial text-softGold mb-3">
            Captured Moments
          </p>
          <h2 className="font-cormorant text-4xl sm:text-5xl font-light text-charcoal">
            Portrait Gallery
          </h2>
          <div className="editorial-divider mx-auto w-24 my-6" />
        </div>

        {/* Responsive Editorial Grid */}
        <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 items-start">
          {images.map((img, index) => {
            const aspectClass =
              img.aspectRatio === 'landscape'
                ? 'aspect-[16/11]'
                : img.aspectRatio === 'square'
                ? 'aspect-square'
                : 'aspect-[4/5]';

            return (
              <motion.div
                key={img.id}
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: (index % 3) * 0.08 }}
                className="group relative border border-softGold/40 bg-warmWhite p-3 shadow-card"
              >
                <button
                  type="button"
                  onClick={() => setActiveIndex(index)}
                  className={`relative block ${aspectClass} w-full overflow-hidden bg-ivory text-left focus:outline-none`}
                  aria-label={`View full size photograph: ${
                    img.altText || img.caption || `Image ${index + 1}`
                  }`}
                >
                  <img
                    src={img.imageUrl}
                    alt={img.altText}
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  <div className="inset-0 absolute bg-charcoal/0 transition-colors duration-300 group-hover:bg-charcoal/20 flex items-center justify-center">
                    <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 inline-flex items-center gap-1.5 bg-warmWhite/95 px-3 py-1.5 font-montserrat text-[10px] uppercase tracking-editorial text-charcoal shadow-sm">
                      <Maximize2 className="h-3 w-3 text-softGold" /> View
                    </span>
                  </div>
                </button>
                {img.caption && (
                  <p className="mt-3 font-cormorant italic text-base text-mutedGray text-center truncate px-2">
                    {img.caption}
                  </p>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Full-Screen Accessible Lightbox Modal */}
      <AnimatePresence>
        {currentImage && activeIndex !== null && (
          <motion.div
            key="gallery-lightbox"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-charcoal/95 p-4 sm:p-8"
            role="dialog"
            aria-modal="true"
            aria-label="Photo gallery lightbox"
            onTouchStart={(e) => setTouchStartX(e.touches[0]?.clientX ?? null)}
            onTouchEnd={(e) => {
              if (touchStartX === null) return;
              const endX = e.changedTouches[0]?.clientX ?? touchStartX;
              const delta = endX - touchStartX;
              if (delta > 50) showPrev();
              else if (delta < -50) showNext();
              setTouchStartX(null);
            }}
          >
            {/* Close Button */}
            <button
              type="button"
              onClick={closeLightbox}
              className="absolute top-3 right-3 sm:top-6 sm:right-6 z-20 flex h-10 w-10 items-center justify-center border border-ivory/30 bg-charcoal/90 text-ivory transition-colors hover:border-softGold hover:text-softGold"
              aria-label="Close lightbox"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Previous Button */}
            <button
              type="button"
              onClick={showPrev}
              className="absolute left-2 sm:left-6 z-20 flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center border border-ivory/30 bg-charcoal/90 text-ivory transition-colors hover:border-softGold hover:text-softGold"
              aria-label="Previous image"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>

            {/* Next Button */}
            <button
              type="button"
              onClick={showNext}
              className="absolute right-2 sm:right-6 z-20 flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center border border-ivory/30 bg-charcoal/90 text-ivory transition-colors hover:border-softGold hover:text-softGold"
              aria-label="Next image"
            >
              <ChevronRight className="h-5 w-5" />
            </button>

            {/* Active Image & Caption */}
            <div className="relative z-10 max-h-[85vh] max-w-4xl w-full px-8 sm:px-14 flex flex-col items-center">
              <div className="relative overflow-hidden border border-softGold/50 bg-warmWhite p-2 shadow-editorial max-h-[75vh]">
                <img
                  src={currentImage.imageUrl}
                  alt={currentImage.altText}
                  className="max-h-[68vh] w-auto object-contain mx-auto"
                />
              </div>
              <div className="mt-4 text-center">
                {currentImage.caption && (
                  <p className="font-cormorant italic text-lg sm:text-xl text-ivory">
                    {currentImage.caption}
                  </p>
                )}
                <p className="mt-1 font-montserrat text-[11px] uppercase tracking-editorial text-softGold">
                  {activeIndex + 1} of {images.length}
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
