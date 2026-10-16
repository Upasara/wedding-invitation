import React from "react";

interface GoldDividerProps {
  className?: string;
  withDiamond?: boolean;
}

export const GoldDivider: React.FC<GoldDividerProps> = ({
  className = "",
  withDiamond = true,
}) => {
  return (
    <div
      className={`flex items-center justify-center my-16 md:my-24 max-w-xs mx-auto px-4 ${className}`}
      aria-hidden="true"
    >
      <div className="flex-1 h-[1px] bg-gradient-to-r from-transparent via-gold-400/50 to-gold-400/80" />
      {withDiamond && (
        <div className="mx-3 flex items-center gap-1.5 text-gold-500">
          <span className="w-1.5 h-1.5 rotate-45 border border-gold-500/80 bg-gold-200/40" />
        </div>
      )}
      <div className="flex-1 h-[1px] bg-gradient-to-l from-transparent via-gold-400/50 to-gold-400/80" />
    </div>
  );
};
