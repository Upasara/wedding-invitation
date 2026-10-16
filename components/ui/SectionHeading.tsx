import React from "react";

interface SectionHeadingProps {
  tag?: string;
  title: string;
  subtitle?: string;
  alignment?: "center" | "left";
  className?: string;
  dark?: boolean;
}

export const SectionHeading: React.FC<SectionHeadingProps> = ({
  tag,
  title,
  subtitle,
  alignment = "center",
  className = "",
  dark = false,
}) => {
  const isCenter = alignment === "center";

  return (
    <div
      className={`mb-12 md:mb-16 ${
        isCenter ? "text-center mx-auto" : "text-left"
      } max-w-2xl ${className}`}
    >
      {tag && (
        <div
          className={`inline-flex items-center gap-2 mb-3 ${
            isCenter ? "justify-center" : "justify-start"
          }`}
        >
          <span className="w-6 h-[1px] bg-gold-400/60" />
          <span className="text-[11px] uppercase tracking-widest font-sans font-medium text-gold-600">
            {tag}
          </span>
          <span className="w-6 h-[1px] bg-gold-400/60" />
        </div>
      )}

      <h2
        className={`font-serif text-3xl sm:text-4xl md:text-5xl font-light tracking-tight ${
          dark ? "text-white" : "text-charcoal-900"
        } leading-tight`}
      >
        {title}
      </h2>

      {subtitle && (
        <p
          className={`mt-4 font-serif text-base sm:text-lg italic ${
            dark ? "text-neutral-300" : "text-neutral-600"
          } leading-relaxed max-w-xl ${isCenter ? "mx-auto" : ""}`}
        >
          {subtitle}
        </p>
      )}
    </div>
  );
};
