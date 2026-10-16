"use client";

import React from "react";
import { WeddingEvent } from "@/types/wedding";
import { Calendar, Clock, MapPin, Navigation } from "lucide-react";
import { motion } from "framer-motion";

interface EventCardProps {
  event: WeddingEvent;
  index: number;
}

export const EventCard: React.FC<EventCardProps> = ({ event, index }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.7, delay: index * 0.1, ease: [0.16, 1, 0.3, 1] }}
      className="group relative bg-white border border-neutral-200/90 hover:border-gold-400/80 transition-all duration-300 p-6 sm:p-8 md:p-10 shadow-sm hover:shadow-xl rounded-sm flex flex-col justify-between"
    >
      {/* Delicate Gold Top Border Accent on Hover */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-gold-300 via-gold-500 to-gold-300 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

      <div>
        {/* Header: Event Order Tag & Attire */}
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <span className="text-[11px] font-sans uppercase tracking-widest text-gold-600 font-semibold flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-gold-500" />
            Event {index + 1}
          </span>
          {event.attire && (
            <span className="text-[10px] font-sans uppercase tracking-widest px-2.5 py-1 bg-neutral-100 text-neutral-700 border border-neutral-200/80 rounded-none">
              {event.attire}
            </span>
          )}
        </div>

        {/* Event Title */}
        <h3 className="font-serif text-2xl sm:text-3xl font-light text-charcoal-900 tracking-tight mb-4 group-hover:text-charcoal-950 transition-colors">
          {event.name}
        </h3>

        {/* Date, Time, Venue Meta */}
        <div className="space-y-2.5 mb-6 text-sm text-neutral-600 font-sans">
          <div className="flex items-center gap-2.5">
            <Calendar className="w-4 h-4 text-gold-600 shrink-0" />
            <span className="font-medium text-charcoal-800">{event.date}</span>
          </div>
          <div className="flex items-center gap-2.5">
            <Clock className="w-4 h-4 text-gold-600 shrink-0" />
            <span>{event.time}</span>
          </div>
          <div className="flex items-start gap-2.5">
            <MapPin className="w-4 h-4 text-gold-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-charcoal-800">{event.venue}</p>
              <p className="text-xs text-neutral-500 mt-0.5">{event.address}</p>
            </div>
          </div>
        </div>

        {/* Event Narrative Description */}
        <p className="font-serif text-base text-neutral-600 leading-relaxed mb-8">
          {event.description}
        </p>
      </div>

      {/* Action: Get Directions Button */}
      <div className="pt-4 border-t border-neutral-100">
        <a
          href={event.googleMapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-between w-full sm:w-auto gap-3 px-5 py-2.5 bg-neutral-50 hover:bg-charcoal-900 text-charcoal-800 hover:text-white border border-neutral-200 hover:border-charcoal-900 transition-all text-xs font-sans uppercase tracking-widest font-medium focus:outline-none focus:ring-2 focus:ring-gold-500"
          aria-label={`Get directions to ${event.venue} on Google Maps`}
        >
          <span>Get Directions</span>
          <Navigation className="w-3.5 h-3.5 text-gold-500 group-hover:text-gold-400" />
        </a>
      </div>
    </motion.div>
  );
};
