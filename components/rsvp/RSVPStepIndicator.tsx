import React from "react";

interface RSVPStepIndicatorProps {
  currentStep: number;
  totalSteps: number;
  stepLabels: string[];
}

export const RSVPStepIndicator: React.FC<RSVPStepIndicatorProps> = ({
  currentStep,
  totalSteps,
  stepLabels,
}) => {
  return (
    <div className="w-full mb-8 sm:mb-10" aria-label="RSVP Progress">
      {/* Progress Line */}
      <div className="relative w-full h-[2px] bg-neutral-200 mb-3">
        <div
          className="absolute top-0 left-0 h-full bg-gold-500 transition-all duration-500 ease-out"
          style={{
            width: `${((currentStep - 1) / (totalSteps - 1)) * 100}%`,
          }}
        />
      </div>

      {/* Step Numbers & Current Label */}
      <div className="flex items-center justify-between text-xs font-sans">
        <span className="text-[11px] uppercase tracking-widest text-gold-600 font-medium">
          Step {currentStep} of {totalSteps}
        </span>
        <span className="text-xs uppercase tracking-widest text-charcoal-700 font-semibold truncate max-w-[200px] text-right">
          {stepLabels[currentStep - 1]}
        </span>
      </div>
    </div>
  );
};
