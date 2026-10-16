"use client";

import React from "react";
import { QAItem } from "@/types/wedding";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Minus } from "lucide-react";

interface QAItemComponentProps {
  item: QAItem;
  isOpen: boolean;
  onToggle: () => void;
  index: number;
}

export const QAItemComponent: React.FC<QAItemComponentProps> = ({
  item,
  isOpen,
  onToggle,
  index,
}) => {
  const contentId = `qa-content-${item.id}`;
  const buttonId = `qa-header-${item.id}`;

  return (
    <div className="border-b border-neutral-200/80 last:border-b-0">
      <h3>
        <button
          id={buttonId}
          type="button"
          onClick={onToggle}
          aria-expanded={isOpen}
          aria-controls={contentId}
          className="w-full py-5 sm:py-6 flex items-center justify-between text-left gap-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-500 transition-colors group"
        >
          <span className="font-serif text-lg sm:text-xl font-light text-charcoal-900 group-hover:text-gold-700 transition-colors">
            {item.question}
          </span>
          <span
            className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center border transition-all ${
              isOpen
                ? "border-gold-500 bg-gold-50 text-gold-700"
                : "border-neutral-200 text-neutral-400 group-hover:border-gold-300 group-hover:text-charcoal-800"
            }`}
          >
            {isOpen ? (
              <Minus className="w-3.5 h-3.5" />
            ) : (
              <Plus className="w-3.5 h-3.5" />
            )}
          </span>
        </button>
      </h3>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            id={contentId}
            role="region"
            aria-labelledby={buttonId}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="pb-6 pr-6 text-neutral-600 font-serif text-base sm:text-lg leading-relaxed">
              <p>{item.answer}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
