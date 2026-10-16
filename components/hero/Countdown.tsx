"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";

interface CountdownProps {
  targetDate: string; // ISO string e.g. "2026-10-24T16:00:00"
  className?: string;
  dark?: boolean;
}

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isPast: boolean;
}

export const Countdown: React.FC<CountdownProps> = ({
  targetDate,
  className = "",
  dark = false,
}) => {
  const [timeLeft, setTimeLeft] = useState<TimeLeft>({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    isPast: false,
  });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    const calculateTime = () => {
      const difference = +new Date(targetDate) - +new Date();

      if (difference <= 0) {
        setTimeLeft({
          days: 0,
          hours: 0,
          minutes: 0,
          seconds: 0,
          isPast: true,
        });
        return;
      }

      setTimeLeft({
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((difference / 1000 / 60) % 60),
        seconds: Math.floor((difference / 1000) % 60),
        isPast: false,
      });
    };

    calculateTime();
    const interval = setInterval(calculateTime, 1000);

    return () => clearInterval(interval);
  }, [targetDate]);

  // Prevent SSR hydration mismatch for current time
  if (!mounted) {
    return (
      <div className={`flex items-center justify-center gap-4 sm:gap-6 py-6 ${className}`}>
        {["DAYS", "HOURS", "MINS", "SECS"].map((label) => (
          <div key={label} className="flex flex-col items-center">
            <span
              className={`font-serif text-3xl sm:text-4xl md:text-5xl font-light ${
                dark ? "text-white" : "text-charcoal-900"
              }`}
            >
              00
            </span>
            <span className="text-[10px] tracking-widest uppercase font-sans text-gold-500 mt-1">
              {label}
            </span>
          </div>
        ))}
      </div>
    );
  }

  if (timeLeft.isPast) {
    return (
      <div className={`text-center py-6 ${className}`}>
        <p className="font-serif italic text-2xl text-gold-500">
          The celebration has begun
        </p>
      </div>
    );
  }

  const units = [
    { label: "DAYS", value: timeLeft.days },
    { label: "HOURS", value: timeLeft.hours },
    { label: "MINUTES", value: timeLeft.minutes },
    { label: "SECONDS", value: timeLeft.seconds },
  ];

  return (
    <div
      role="timer"
      aria-label="Time remaining until the wedding"
      className={`inline-flex items-center justify-center gap-3 sm:gap-6 md:gap-8 px-4 py-4 ${className}`}
    >
      {units.map((unit, index) => (
        <React.Fragment key={unit.label}>
          <div className="flex flex-col items-center min-w-[54px] sm:min-w-[72px] md:min-w-[84px]">
            <motion.span
              key={unit.value}
              initial={{ opacity: 0.85, y: -2 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              className={`font-serif text-2xl sm:text-4xl md:text-5xl font-light tracking-tight tabular-nums ${
                dark ? "text-white" : "text-charcoal-900"
              }`}
            >
              {String(unit.value).padStart(2, "0")}
            </motion.span>
            <span className="text-[9px] sm:text-[11px] uppercase tracking-widest font-sans font-medium text-gold-600 mt-1 sm:mt-2">
              {unit.label}
            </span>
          </div>

          {index < units.length - 1 && (
            <span
              className={`font-serif text-xl sm:text-2xl font-light -mt-4 opacity-40 ${
                dark ? "text-gold-200" : "text-gold-700"
              }`}
            >
              :
            </span>
          )}
        </React.Fragment>
      ))}
    </div>
  );
};
