"use client";

import React, { useState } from "react";
import { RsvpSettings, RsvpFormState } from "@/types/wedding";
import { RSVPStepIndicator } from "./RSVPStepIndicator";
import { motion, AnimatePresence } from "framer-motion";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Heart,
  Utensils,
  User,
  Mail,
  Phone,
  Sparkles,
} from "lucide-react";

interface RSVPFormProps {
  settings: RsvpSettings;
  coupleNames: string;
}

const INITIAL_STATE: RsvpFormState = {
  attendance: null,
  guestName: "",
  guestEmail: "",
  guestPhone: "",
  guestCount: 1,
  additionalGuestNames: [],
  mealPreferences: {},
  dietaryRestrictions: "",
  personalMessage: "",
};

export const RSVPForm: React.FC<RSVPFormProps> = ({ settings, coupleNames }) => {
  const [step, setStep] = useState<number>(1);
  const [formData, setFormData] = useState<RsvpFormState>(INITIAL_STATE);
  const [errorMsg, setErrorMsg] = useState<string>("");

  const isDeclining = formData.attendance === "declining";

  // Step definitions based on flow
  // 1: Attendance -> 2: Guest info -> 3: Who is attending -> 4: Guest count -> 5: Meal -> 6: Message -> 7: Review -> 8: Confirmation
  const stepLabels = [
    "Attendance",
    "Contact Info",
    "Attendees",
    "Party Size",
    "Dining",
    "Personal Note",
    "Review",
    "Confirmation",
  ];

  const totalSteps = 8;

  // Validation before advancing
  const handleNext = () => {
    setErrorMsg("");

    if (step === 1) {
      if (!formData.attendance) {
        setErrorMsg("Please indicate whether you will attend.");
        return;
      }
    } else if (step === 2) {
      if (!formData.guestName.trim()) {
        setErrorMsg("Please enter your full name.");
        return;
      }
      if (!formData.guestEmail.trim() || !formData.guestEmail.includes("@")) {
        setErrorMsg("Please provide a valid email address.");
        return;
      }
    } else if (step === 4 && formData.attendance === "attending") {
      // Validate additional guest names if party size > 1
      if (formData.guestCount > 1) {
        const requiredNamesCount = formData.guestCount - 1;
        const validNames = formData.additionalGuestNames.filter(
          (name) => name && name.trim().length > 0
        );
        if (validNames.length < requiredNamesCount) {
          setErrorMsg(`Please provide names for all ${formData.guestCount} guests.`);
          return;
        }
      }
    }

    // If declining, skip directly to Step 6 (Message) from Step 2
    if (isDeclining && step === 2) {
      setStep(6);
      return;
    }

    setStep((prev) => Math.min(prev + 1, totalSteps));
  };

  const handlePrev = () => {
    setErrorMsg("");
    if (isDeclining && step === 6) {
      setStep(2);
      return;
    }
    setStep((prev) => Math.max(prev - 1, 1));
  };

  const handlePartySizeChange = (count: number) => {
    const currentAdditional = [...formData.additionalGuestNames];
    const diff = count - 1;

    let updatedAdditional: string[] = [];
    if (diff > 0) {
      updatedAdditional = Array.from(
        { length: diff },
        (_, i) => currentAdditional[i] || ""
      );
    }

    setFormData((prev) => ({
      ...prev,
      guestCount: count,
      additionalGuestNames: updatedAdditional,
    }));
  };

  const handleAdditionalNameChange = (index: number, name: string) => {
    const updated = [...formData.additionalGuestNames];
    updated[index] = name;
    setFormData((prev) => ({ ...prev, additionalGuestNames: updated }));
  };

  const handleMealChange = (personName: string, mealId: string) => {
    setFormData((prev) => ({
      ...prev,
      mealPreferences: {
        ...prev.mealPreferences,
        [personName]: mealId,
      },
    }));
  };

  const allAttendeeNames = [
    formData.guestName,
    ...formData.additionalGuestNames.filter((n) => n.trim().length > 0),
  ];

  return (
    <div className="w-full max-w-2xl mx-auto bg-white border border-gold-300/60 p-6 sm:p-10 md:p-12 shadow-xl rounded-sm">
      {step < 8 && (
        <RSVPStepIndicator
          currentStep={step}
          totalSteps={totalSteps}
          stepLabels={stepLabels}
        />
      )}

      {errorMsg && (
        <div
          role="alert"
          className="mb-6 p-3 bg-red-50 border border-red-200 text-red-800 text-xs font-sans rounded-none"
        >
          {errorMsg}
        </div>
      )}

      <AnimatePresence mode="wait">
        {/* STEP 1: ATTENDANCE */}
        {step === 1 && (
          <motion.div
            key="step-1"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            <div className="text-center space-y-2">
              <span className="text-[11px] uppercase tracking-widest font-sans font-semibold text-gold-600">
                Response Requested by {settings.deadlineDisplay}
              </span>
              <h3 className="font-serif text-2xl sm:text-3xl text-charcoal-900 font-light">
                Will you be joining us?
              </h3>
              <p className="font-serif text-sm italic text-neutral-500">
                Please let us know if you can celebrate with {coupleNames}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, attendance: "attending" })}
                className={`p-6 text-center border transition-all rounded-none flex flex-col items-center justify-center gap-3 ${
                  formData.attendance === "attending"
                    ? "border-gold-500 bg-gold-50/50 shadow-md ring-1 ring-gold-500"
                    : "border-neutral-200 hover:border-gold-300 bg-neutral-50/50"
                }`}
              >
                <div className="w-10 h-10 rounded-full bg-gold-100 flex items-center justify-center text-gold-700">
                  <Check className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-serif text-lg text-charcoal-900">
                    Joyfully Accepts
                  </h4>
                  <p className="text-xs text-neutral-500 font-sans mt-1">
                    I will be delighted to attend
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setFormData({ ...formData, attendance: "declining" })}
                className={`p-6 text-center border transition-all rounded-none flex flex-col items-center justify-center gap-3 ${
                  formData.attendance === "declining"
                    ? "border-charcoal-900 bg-neutral-100 shadow-md ring-1 ring-charcoal-900"
                    : "border-neutral-200 hover:border-charcoal-300 bg-neutral-50/50"
                }`}
              >
                <div className="w-10 h-10 rounded-full bg-neutral-200 flex items-center justify-center text-charcoal-700">
                  <Heart className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-serif text-lg text-charcoal-900">
                    Regretfully Declines
                  </h4>
                  <p className="text-xs text-neutral-500 font-sans mt-1">
                    I will celebrate from afar
                  </p>
                </div>
              </button>
            </div>
          </motion.div>
        )}

        {/* STEP 2: GUEST / FAMILY INFORMATION */}
        {step === 2 && (
          <motion.div
            key="step-2"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            <div className="text-center space-y-2">
              <span className="text-[11px] uppercase tracking-widest font-sans font-semibold text-gold-600">
                Primary Contact
              </span>
              <h3 className="font-serif text-2xl sm:text-3xl text-charcoal-900 font-light">
                Your Contact Information
              </h3>
              <p className="font-serif text-sm italic text-neutral-500">
                We will send celebration details and updates to this contact.
              </p>
            </div>

            <div className="space-y-4 pt-2">
              <div>
                <label className="block text-xs uppercase tracking-widest font-sans font-medium text-charcoal-700 mb-2">
                  Full Name <span className="text-gold-600">*</span>
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-3 w-4 h-4 text-neutral-400" />
                  <input
                    type="text"
                    required
                    value={formData.guestName}
                    onChange={(e) =>
                      setFormData({ ...formData, guestName: e.target.value })
                    }
                    placeholder="e.g. Lord Julian Sterling"
                    className="w-full pl-10 pr-4 py-2.5 border border-neutral-300 focus:border-gold-500 focus:outline-none text-charcoal-900 text-sm font-serif"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs uppercase tracking-widest font-sans font-medium text-charcoal-700 mb-2">
                  Email Address <span className="text-gold-600">*</span>
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-3 w-4 h-4 text-neutral-400" />
                  <input
                    type="email"
                    required
                    value={formData.guestEmail}
                    onChange={(e) =>
                      setFormData({ ...formData, guestEmail: e.target.value })
                    }
                    placeholder="name@domain.com"
                    className="w-full pl-10 pr-4 py-2.5 border border-neutral-300 focus:border-gold-500 focus:outline-none text-charcoal-900 text-sm font-sans"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs uppercase tracking-widest font-sans font-medium text-charcoal-700 mb-2">
                  Phone Number
                </label>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-3 w-4 h-4 text-neutral-400" />
                  <input
                    type="tel"
                    value={formData.guestPhone}
                    onChange={(e) =>
                      setFormData({ ...formData, guestPhone: e.target.value })
                    }
                    placeholder="+1 (555) 000-0000"
                    className="w-full pl-10 pr-4 py-2.5 border border-neutral-300 focus:border-gold-500 focus:outline-none text-charcoal-900 text-sm font-sans"
                  />
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* STEP 3: WHO IS ATTENDING */}
        {step === 3 && (
          <motion.div
            key="step-3"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            <div className="text-center space-y-2">
              <span className="text-[11px] uppercase tracking-widest font-sans font-semibold text-gold-600">
                Guest Confirmation
              </span>
              <h3 className="font-serif text-2xl sm:text-3xl text-charcoal-900 font-light">
                Who Is Attending?
              </h3>
              <p className="font-serif text-sm italic text-neutral-500">
                Are you attending as a solo guest, or will you be accompanied by family or a partner?
              </p>
            </div>

            <div className="p-4 bg-ivory-50 border border-gold-300/40 text-center">
              <p className="font-serif text-lg text-charcoal-900">
                Primary Attendee: <span className="font-medium text-gold-700">{formData.guestName}</span>
              </p>
              <p className="text-xs font-sans text-neutral-500 mt-1">
                You can specify additional party members in the next step.
              </p>
            </div>
          </motion.div>
        )}

        {/* STEP 4: GUEST COUNT / ADDITIONAL GUESTS */}
        {step === 4 && (
          <motion.div
            key="step-4"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            <div className="text-center space-y-2">
              <span className="text-[11px] uppercase tracking-widest font-sans font-semibold text-gold-600">
                Party Size
              </span>
              <h3 className="font-serif text-2xl sm:text-3xl text-charcoal-900 font-light">
                Total Number in Your Party
              </h3>
              <p className="font-serif text-sm italic text-neutral-500">
                Your invitation accommodates up to {settings.maxPartySize} guests.
              </p>
            </div>

            {/* Party Size Selector */}
            <div className="flex items-center justify-center gap-3 pt-2">
              {Array.from({ length: settings.maxPartySize }, (_, i) => i + 1).map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => handlePartySizeChange(num)}
                  className={`w-12 h-12 flex items-center justify-center text-lg font-serif transition-all border ${
                    formData.guestCount === num
                      ? "bg-charcoal-900 text-ivory-50 border-charcoal-900 shadow-md"
                      : "bg-neutral-50 text-neutral-700 border-neutral-300 hover:border-gold-400"
                  }`}
                >
                  {num}
                </button>
              ))}
            </div>

            {/* Additional Guest Name Inputs */}
            {formData.guestCount > 1 && (
              <div className="space-y-4 pt-4 border-t border-neutral-200">
                <p className="text-xs font-sans uppercase tracking-widest text-charcoal-700 font-medium">
                  Additional Guest Names:
                </p>
                {formData.additionalGuestNames.map((name, index) => (
                  <div key={index}>
                    <label className="block text-[11px] font-sans text-neutral-600 mb-1">
                      Guest #{index + 2} Full Name:
                    </label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) =>
                        handleAdditionalNameChange(index, e.target.value)
                      }
                      placeholder={`Full name for Guest #${index + 2}`}
                      className="w-full px-4 py-2.5 border border-neutral-300 focus:border-gold-500 focus:outline-none text-charcoal-900 text-sm font-serif"
                    />
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* STEP 5: MEAL PREFERENCE */}
        {step === 5 && (
          <motion.div
            key="step-5"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            <div className="text-center space-y-2">
              <span className="text-[11px] uppercase tracking-widest font-sans font-semibold text-gold-600">
                Culinary Selection
              </span>
              <h3 className="font-serif text-2xl sm:text-3xl text-charcoal-900 font-light">
                Dinner Entrée Preferences
              </h3>
              <p className="font-serif text-sm italic text-neutral-500">
                Please select an entrée for each guest in your party.
              </p>
            </div>

            <div className="space-y-6 pt-2">
              {allAttendeeNames.map((person, idx) => (
                <div
                  key={idx}
                  className="p-4 sm:p-5 border border-neutral-200 bg-neutral-50/50 space-y-3"
                >
                  <div className="flex items-center gap-2 text-charcoal-900 font-serif text-base font-medium">
                    <Utensils className="w-4 h-4 text-gold-600" />
                    <span>Entrée for {person || `Guest #${idx + 1}`}:</span>
                  </div>

                  <div className="space-y-2">
                    {settings.mealOptions.map((option) => (
                      <label
                        key={option.id}
                        className={`flex items-start gap-3 p-3 border cursor-pointer transition-colors ${
                          formData.mealPreferences[person] === option.id
                            ? "border-gold-500 bg-gold-50/60"
                            : "border-neutral-200 hover:border-neutral-300 bg-white"
                        }`}
                      >
                        <input
                          type="radio"
                          name={`meal-${idx}`}
                          value={option.id}
                          checked={formData.mealPreferences[person] === option.id}
                          onChange={() => handleMealChange(person, option.id)}
                          className="mt-1 text-gold-600 focus:ring-gold-500"
                        />
                        <div>
                          <p className="text-sm font-serif font-medium text-charcoal-900">
                            {option.name}
                          </p>
                          <p className="text-xs text-neutral-500 font-sans mt-0.5">
                            {option.description}
                          </p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              ))}

              {settings.allowDietaryNotes && (
                <div>
                  <label className="block text-xs uppercase tracking-widest font-sans font-medium text-charcoal-700 mb-2">
                    Dietary Restrictions & Allergies:
                  </label>
                  <textarea
                    rows={2}
                    value={formData.dietaryRestrictions}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        dietaryRestrictions: e.target.value,
                      })
                    }
                    placeholder="e.g. Gluten-free, nut allergy, vegan..."
                    className="w-full px-4 py-2 border border-neutral-300 focus:border-gold-500 focus:outline-none text-charcoal-900 text-sm font-sans"
                  />
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* STEP 6: OPTIONAL MESSAGE */}
        {step === 6 && (
          <motion.div
            key="step-6"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            <div className="text-center space-y-2">
              <span className="text-[11px] uppercase tracking-widest font-sans font-semibold text-gold-600">
                Warm Wishes
              </span>
              <h3 className="font-serif text-2xl sm:text-3xl text-charcoal-900 font-light">
                A Note for the Couple
              </h3>
              <p className="font-serif text-sm italic text-neutral-500">
                Share a heartfelt message, blessings, or favorite memories with {coupleNames}.
              </p>
            </div>

            <div className="pt-2">
              <textarea
                rows={5}
                value={formData.personalMessage}
                onChange={(e) =>
                  setFormData({ ...formData, personalMessage: e.target.value })
                }
                placeholder="Write your wishes here..."
                className="w-full p-4 border border-neutral-300 focus:border-gold-500 focus:outline-none text-charcoal-900 text-sm font-serif leading-relaxed"
              />
            </div>
          </motion.div>
        )}

        {/* STEP 7: REVIEW */}
        {step === 7 && (
          <motion.div
            key="step-7"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            <div className="text-center space-y-2">
              <span className="text-[11px] uppercase tracking-widest font-sans font-semibold text-gold-600">
                Summary
              </span>
              <h3 className="font-serif text-2xl sm:text-3xl text-charcoal-900 font-light">
                Review Your Details
              </h3>
              <p className="font-serif text-sm italic text-neutral-500">
                Please verify your responses before confirming.
              </p>
            </div>

            <div className="p-6 bg-ivory-50 border border-gold-300/60 space-y-4 font-serif text-sm">
              <div className="flex justify-between items-center pb-3 border-b border-neutral-200">
                <span className="text-neutral-500 font-sans text-xs uppercase tracking-widest">
                  Attendance:
                </span>
                <span className="font-medium text-charcoal-900 capitalize">
                  {formData.attendance === "attending"
                    ? "Joyfully Attending"
                    : "Regretfully Declining"}
                </span>
              </div>

              <div className="flex justify-between items-center pb-3 border-b border-neutral-200">
                <span className="text-neutral-500 font-sans text-xs uppercase tracking-widest">
                  Primary Contact:
                </span>
                <span className="font-medium text-charcoal-900">
                  {formData.guestName} ({formData.guestEmail})
                </span>
              </div>

              {formData.attendance === "attending" && (
                <>
                  <div className="flex justify-between items-center pb-3 border-b border-neutral-200">
                    <span className="text-neutral-500 font-sans text-xs uppercase tracking-widest">
                      Total Guests:
                    </span>
                    <span className="font-medium text-charcoal-900">
                      {formData.guestCount} {formData.guestCount === 1 ? "Guest" : "Guests"}
                    </span>
                  </div>

                  {formData.additionalGuestNames.length > 0 && (
                    <div className="flex justify-between items-start pb-3 border-b border-neutral-200">
                      <span className="text-neutral-500 font-sans text-xs uppercase tracking-widest">
                        Additional Guests:
                      </span>
                      <span className="font-medium text-charcoal-900 text-right">
                        {formData.additionalGuestNames.join(", ")}
                      </span>
                    </div>
                  )}

                  {Object.keys(formData.mealPreferences).length > 0 && (
                    <div className="pb-3 border-b border-neutral-200">
                      <span className="text-neutral-500 font-sans text-xs uppercase tracking-widest block mb-1">
                        Meal Choices:
                      </span>
                      {Object.entries(formData.mealPreferences).map(([person, mealId]) => {
                        const meal = settings.mealOptions.find((m) => m.id === mealId);
                        return (
                          <div key={person} className="flex justify-between text-xs text-charcoal-800">
                            <span>{person}:</span>
                            <span className="font-medium">{meal ? meal.name : "None"}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              )}

              {formData.personalMessage && (
                <div>
                  <span className="text-neutral-500 font-sans text-xs uppercase tracking-widest block mb-1">
                    Note:
                  </span>
                  <p className="italic text-charcoal-800 text-xs bg-white p-3 border border-neutral-200">
                    “{formData.personalMessage}”
                  </p>
                </div>
              )}
            </div>

            <div className="p-3 bg-amber-50/60 border border-amber-200/60 text-[11px] text-amber-900 font-sans text-center">
              Phase 1 Preview Mode • No database write is performed until the Firebase backend phase is activated.
            </div>
          </motion.div>
        )}

        {/* STEP 8: CONFIRMATION */}
        {step === 8 && (
          <motion.div
            key="step-8"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.5 }}
            className="text-center py-6 space-y-6"
          >
            <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto rounded-full bg-gradient-to-br from-gold-300 via-gold-500 to-gold-700 flex items-center justify-center shadow-lg border-2 border-white">
              <Check className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
            </div>

            <div className="space-y-3">
              <span className="text-[11px] uppercase tracking-widest font-sans font-semibold text-gold-600">
                Response Received
              </span>
              <h3 className="font-serif text-3xl sm:text-4xl text-charcoal-900 font-light">
                {formData.attendance === "attending"
                  ? "We Look Forward to Celebrating With You"
                  : "Thank You For Letting Us Know"}
              </h3>
              <p className="font-serif text-base sm:text-lg italic text-neutral-600 max-w-md mx-auto leading-relaxed">
                {settings.confirmationMessage}
              </p>
            </div>

            <div className="pt-4">
              <button
                type="button"
                onClick={() => {
                  setStep(1);
                  setFormData(INITIAL_STATE);
                }}
                className="px-6 py-2.5 bg-neutral-100 hover:bg-neutral-200 text-charcoal-800 text-xs font-sans uppercase tracking-widest border border-neutral-300 transition-colors"
              >
                Submit Another Response
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Navigation Buttons */}
      {step < 8 && (
        <div className="flex items-center justify-between pt-8 mt-8 border-t border-neutral-200">
          {step > 1 ? (
            <button
              type="button"
              onClick={handlePrev}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-sans uppercase tracking-widest text-charcoal-700 hover:text-charcoal-950 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
          ) : (
            <div />
          )}

          <button
            type="button"
            onClick={handleNext}
            className="inline-flex items-center gap-2 px-7 py-3 bg-charcoal-900 hover:bg-charcoal-950 text-ivory-50 text-xs font-sans uppercase tracking-widest border border-gold-400/80 transition-all shadow-md focus:outline-none focus:ring-2 focus:ring-gold-500"
          >
            <span>{step === 7 ? "Confirm RSVP" : "Continue"}</span>
            <ChevronRight className="w-4 h-4 text-gold-400" />
          </button>
        </div>
      )}
    </div>
  );
};
