"use client";

import React, { useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { GalleryImage } from "@/types/wedding";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Lightbox } from "@/components/gallery/Lightbox";
import { GoldDivider } from "@/components/ui/GoldDivider";
import { Maximize2 } from "lucide-react";

interface GallerySectionProps {
  images: GalleryImage[];
}

export const GallerySection: React.FC<GallerySectionProps> = ({ images }) => {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const sortedImages = [...images].sort((a, b) => a.order - b.order);

  return (
    <section
      id="gallery"
      aria-label="Photo Gallery"
      className="py-20 md:py-32 px-4 sm:px-6 md:px-12 bg-ivory-50 text-charcoal-900"
    >
      <div className="max-w-6xl mx-auto">
        <SectionHeading
          tag="Memories & Moments"
          title="Captured Reflections"
          subtitle="A glimpse into the quiet smiles, scenic travels, and cherished milestones leading to this day."
          alignment="center"
        />

        {/* Responsive Editorial Gallery Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {sortedImages.map((image, index) => {
            // Editorial variation: feature specific photos with larger span on desktop
            const isFeatured = index === 0 || index === 7;

            return (
              <motion.div
                key={image.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.6, delay: (index % 4) * 0.1 }}
                className={`group relative overflow-hidden rounded-sm cursor-pointer border border-neutral-200/80 hover:border-gold-400/80 transition-all duration-300 shadow-sm hover:shadow-xl ${
                  isFeatured ? "sm:col-span-2 aspect-[16/10]" : "aspect-[4/5]"
                }`}
                onClick={() => setLightboxIndex(index)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setLightboxIndex(index);
                  }
                }}
                tabIndex={0}
                role="button"
                aria-label={`View photo: ${image.caption}`}
              >
                <Image
                  src={image.imageUrl}
                  alt={image.caption}
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                  className="object-cover object-center transition-transform duration-700 ease-out group-hover:scale-105"
                />

                {/* Dark Vignette Overlay on Hover */}
                <div className="absolute inset-0 bg-charcoal-950/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-between p-4 sm:p-5">
                  <div className="flex justify-end">
                    <span className="p-2 rounded-full bg-charcoal-950/70 text-gold-300 border border-gold-400/40">
                      <Maximize2 className="w-3.5 h-3.5" />
                    </span>
                  </div>
                  <div>
                    <p className="font-serif italic text-sm text-white drop-shadow-md">
                      {image.caption}
                    </p>
                    <span className="text-[10px] font-sans uppercase tracking-widest text-gold-300 mt-1 block">
                      Tap to enlarge
                    </span>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Fullscreen Lightbox Modal */}
        <Lightbox
          images={sortedImages}
          currentIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onNavigate={(newIndex) => setLightboxIndex(newIndex)}
        />

        <GoldDivider />
      </div>
    </section>
  );
};
