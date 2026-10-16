"use client";

import React, { useState } from "react";
import { QAItem } from "@/types/wedding";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { QAItemComponent } from "@/components/qa/QAItemComponent";
import { GoldDivider } from "@/components/ui/GoldDivider";

interface QASectionProps {
  qaList: QAItem[];
}

export const QASection: React.FC<QASectionProps> = ({ qaList }) => {
  const [openId, setOpenId] = useState<string | null>(qaList[0]?.id || null);

  const sortedQA = [...qaList].sort((a, b) => a.order - b.order);

  const handleToggle = (id: string) => {
    setOpenId((prev) => (prev === id ? null : id));
  };

  return (
    <section
      id="qa"
      aria-label="Frequently Asked Questions"
      className="py-20 md:py-32 px-4 sm:px-6 md:px-12 bg-white text-charcoal-900"
    >
      <div className="max-w-4xl mx-auto">
        <SectionHeading
          tag="Information & Guidance"
          title="Questions & Details"
          subtitle="Everything you need to know to ensure a seamless and delightful weekend celebration."
          alignment="center"
        />

        <div className="bg-ivory-50/60 p-6 sm:p-10 md:p-12 rounded-sm border border-neutral-200/80 shadow-sm">
          {sortedQA.map((item, index) => (
            <QAItemComponent
              key={item.id}
              item={item}
              isOpen={openId === item.id}
              onToggle={() => handleToggle(item.id)}
              index={index}
            />
          ))}
        </div>

        <GoldDivider />
      </div>
    </section>
  );
};
