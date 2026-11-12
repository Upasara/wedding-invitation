'use client';

import React, { useEffect, useState } from 'react';
import {
  CheckCircle2,
  XCircle,
  KeyRound,
  Plus,
  Trash2,
  Utensils,
  Sparkles,
  AlertCircle,
  LogOut,
  Edit3,
  Send,
  ShieldCheck,
} from 'lucide-react';
import {
  AdditionalGuestResponse,
  MealOption,
  MemberRsvpResponse,
  PublicHouseholdSessionView,
} from '@/lib/types/domain';

interface RsvpSectionProps {
  householdSession: PublicHouseholdSessionView | null;
  onSessionChange: (nextSession: PublicHouseholdSessionView | null) => void;
  settings: {
    rsvpEnabled: boolean;
    rsvpDeadline: string;
    rsvpInstructions: string;
    allowAdditionalGuestsGlobal: boolean;
    enableMealPreferencesGlobal: boolean;
    mealOptions: MealOption[];
    requireInvitationCode: boolean;
    invitationAccessOpen: boolean;
    turnstileEnabled: boolean;
  };
  initialFragmentCode?: string | null;
  isPlaceholderContent?: boolean;
}

export function RsvpSection({
  householdSession,
  onSessionChange,
  settings,
  initialFragmentCode,
  isPlaceholderContent = false,
}: RsvpSectionProps) {
  // Code verification state
  const [codeInput, setCodeInput] = useState('');
  const [turnstileToken, setTurnstileToken] = useState('');
  const [verifyingCode, setVerifyingCode] = useState(false);
  const [codeError, setCodeError] = useState<string | null>(null);

  // RSVP form state
  const [isEditing, setIsEditing] = useState(true);
  const [overallStatus, setOverallStatus] = useState<'attending' | 'declined'>('attending');
  const [memberResponses, setMemberResponses] = useState<MemberRsvpResponse[]>([]);
  const [additionalGuests, setAdditionalGuests] = useState<AdditionalGuestResponse[]>([]);
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [personalMessage, setPersonalMessage] = useState('');
  const [submittingRsvp, setSubmittingRsvp] = useState(false);
  const [rsvpError, setRsvpError] = useState<string | null>(null);
  const [rsvpSuccessMessage, setRsvpSuccessMessage] = useState<string | null>(null);

  const isDevMode = process.env.NODE_ENV !== 'production';
  const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || '';

  // Synchronize form fields whenever householdSession changes
  useEffect(() => {
    if (!householdSession) return;
    const existing = householdSession.existingRsvp;
    const defaultMealId = settings.mealOptions[0]?.id || null;

    if (existing) {
      setIsEditing(false);
      setOverallStatus(existing.overallStatus);
      setMemberResponses(
        householdSession.members.map((m) => {
          const found = existing.memberResponses.find((r) => r.memberId === m.id);
          return found
            ? {
                memberId: m.id,
                memberName: m.fullName,
                attending: found.attending,
                mealOptionId:
                  found.mealOptionId || (found.attending ? defaultMealId : null),
                dietaryNotes: found.dietaryNotes || '',
              }
            : {
                memberId: m.id,
                memberName: m.fullName,
                attending: existing.overallStatus === 'attending',
                mealOptionId:
                  existing.overallStatus === 'attending' &&
                  settings.enableMealPreferencesGlobal
                    ? defaultMealId
                    : null,
                dietaryNotes: '',
              };
        })
      );
      setAdditionalGuests(existing.additionalGuests || []);
      setContactEmail(existing.contactEmail || '');
      setContactPhone(existing.contactPhone || '');
      setPersonalMessage(existing.personalMessage || '');
    } else {
      setIsEditing(true);
      setOverallStatus('attending');
      setMemberResponses(
        householdSession.members.map((m) => ({
          memberId: m.id,
          memberName: m.fullName,
          attending: true,
          mealOptionId: settings.enableMealPreferencesGlobal ? defaultMealId : null,
          dietaryNotes: '',
        }))
      );
      setAdditionalGuests([]);
      setContactEmail('');
      setContactPhone('');
      setPersonalMessage('');
    }
  }, [householdSession, settings.enableMealPreferencesGlobal, settings.mealOptions]);

  // Automatically verify code if provided via URL fragment (/invite#CODE)
  useEffect(() => {
    if (!initialFragmentCode) return;
    handleVerifyCode(initialFragmentCode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialFragmentCode]);

  // Dynamically load Cloudflare Turnstile script when turnstileEnabled and siteKey are present
  useEffect(() => {
    if (!settings.turnstileEnabled || !turnstileSiteKey) return;
    const existingScript = document.querySelector(
      'script[src*="challenges.cloudflare.com/turnstile/v0/api.js"]'
    );
    if (existingScript) return;
    const script = document.createElement('script');
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);
  }, [settings.turnstileEnabled, turnstileSiteKey]);

  async function handleVerifyCode(codeToVerify: string, explicitTurnstileToken?: string) {
    const clean = codeToVerify.trim();
    if (!clean) {
      setCodeError('Please enter your household invitation code.');
      return;
    }
    const tokenToUse = (explicitTurnstileToken ?? turnstileToken).trim();
    setVerifyingCode(true);
    setCodeError(null);
    setRsvpError(null);

    try {
      const res = await fetch('/api/public/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: clean,
          ...(tokenToUse ? { turnstileToken: tokenToUse } : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.householdSession) {
        setCodeError(
          data.error ||
            'We could not verify that invitation code. Please check your invitation card and try again.'
        );
        return;
      }
      setCodeInput('');
      onSessionChange(data.householdSession);
    } catch {
      setCodeError('Unable to reach verification server. Please try again.');
    } finally {
      setVerifyingCode(false);
    }
  }

  async function handleSignOutHousehold() {
    try {
      await fetch('/api/public/session', { method: 'DELETE' });
    } catch {
      // Ignore error
    }
    setRsvpSuccessMessage(null);
    setRsvpError(null);
    onSessionChange(null);
  }

  function handleOverallStatusChange(nextStatus: 'attending' | 'declined') {
    setOverallStatus(nextStatus);
    const defaultMealId = settings.mealOptions[0]?.id || null;
    if (nextStatus === 'declined') {
      setMemberResponses((prev) =>
        prev.map((m) => ({
          ...m,
          attending: false,
          mealOptionId: null,
          dietaryNotes: '',
        }))
      );
      setAdditionalGuests([]);
    } else {
      setMemberResponses((prev) => {
        const anyAttending = prev.some((m) => m.attending);
        if (anyAttending) return prev;
        return prev.map((m) => ({
          ...m,
          attending: true,
          mealOptionId: settings.enableMealPreferencesGlobal ? defaultMealId : null,
        }));
      });
    }
  }

  function handleMemberAttendanceToggle(memberId: string, attending: boolean) {
    const defaultMealId = settings.mealOptions[0]?.id || null;
    setMemberResponses((prev) => {
      const next = prev.map((m) =>
        m.memberId === memberId
          ? {
              ...m,
              attending,
              mealOptionId:
                attending && settings.enableMealPreferencesGlobal
                  ? m.mealOptionId || defaultMealId
                  : null,
              dietaryNotes: attending ? m.dietaryNotes : '',
            }
          : m
      );
      const anyStillAttending = next.some((m) => m.attending);
      if (!anyStillAttending) {
        setOverallStatus('declined');
        setAdditionalGuests([]);
      } else {
        setOverallStatus('attending');
      }
      return next;
    });
  }

  function handleMemberMealChange(memberId: string, mealOptionId: string) {
    setMemberResponses((prev) =>
      prev.map((m) => (m.memberId === memberId ? { ...m, mealOptionId } : m))
    );
  }

  function handleMemberDietaryChange(memberId: string, dietaryNotes: string) {
    setMemberResponses((prev) =>
      prev.map((m) => (m.memberId === memberId ? { ...m, dietaryNotes } : m))
    );
  }

  function handleAddAdditionalGuest() {
    if (!householdSession) return;
    if (
      additionalGuests.length >=
      householdSession.effectiveAdditionalGuestAllowance
    ) {
      return;
    }
    const defaultMealId = settings.mealOptions[0]?.id || null;
    setAdditionalGuests((prev) => [
      ...prev,
      {
        id: `plus_${Date.now()}_${prev.length + 1}`,
        fullName: '',
        mealOptionId: settings.enableMealPreferencesGlobal ? defaultMealId : null,
        dietaryNotes: '',
      },
    ]);
  }

  function handleRemoveAdditionalGuest(index: number) {
    setAdditionalGuests((prev) => prev.filter((_, idx) => idx !== index));
  }

  async function handleSubmitRsvp(e: React.FormEvent) {
    e.preventDefault();
    if (!householdSession) return;

    setSubmittingRsvp(true);
    setRsvpError(null);
    setRsvpSuccessMessage(null);

    const payload = {
      overallStatus,
      memberResponses: memberResponses.map((m) => ({
        memberId: m.memberId,
        attending: overallStatus === 'declined' ? false : m.attending,
        mealOptionId:
          overallStatus === 'attending' &&
          m.attending &&
          settings.enableMealPreferencesGlobal
            ? m.mealOptionId || null
            : null,
        dietaryNotes:
          overallStatus === 'attending' && m.attending ? m.dietaryNotes || '' : '',
      })),
      additionalGuests:
        overallStatus === 'attending' &&
        settings.allowAdditionalGuestsGlobal &&
        householdSession.effectiveAdditionalGuestAllowance > 0
          ? additionalGuests.map((ag) => ({
              id: ag.id,
              fullName: ag.fullName,
              mealOptionId: settings.enableMealPreferencesGlobal
                ? ag.mealOptionId || null
                : null,
              dietaryNotes: ag.dietaryNotes || '',
            }))
          : [],
      contactEmail: contactEmail.trim(),
      contactPhone: contactPhone.trim(),
      personalMessage: personalMessage.trim(),
      expectedVersion: householdSession.existingRsvp?.version ?? 0,
    };

    try {
      const idempotencyKey = `rsvp_${householdSession.householdId}_${
        householdSession.existingRsvp?.version ?? 0
      }_${Date.now()}`;

      const res = await fetch('/api/public/rsvp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': idempotencyKey,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        setRsvpError(data.error || 'Unable to save your RSVP response.');
        return;
      }

      if (data.householdSession) {
        onSessionChange(data.householdSession);
      }
      setIsEditing(false);
      setRsvpSuccessMessage(
        overallStatus === 'attending'
          ? 'Thank you! Your household RSVP has been recorded. We look forward to celebrating with you.'
          : 'Thank you for letting us know. Your response has been recorded with our warmest wishes.'
      );
    } catch {
      setRsvpError('Network error while submitting your RSVP. Please try again.');
    } finally {
      setSubmittingRsvp(false);
    }
  }

  const deadlinePassed =
    Boolean(settings.rsvpDeadline) &&
    !Number.isNaN(Date.parse(settings.rsvpDeadline)) &&
    Date.now() > Date.parse(settings.rsvpDeadline);

  const canModifyRsvp = settings.rsvpEnabled && !deadlinePassed;

  return (
    <section
      id="rsvp"
      className="border-b border-editorialBorder bg-ivory py-20 sm:py-28"
    >
      <div className="mx-auto max-w-4xl px-4 sm:px-8">
        {/* Heading */}
        <div className="mx-auto max-w-2xl text-center">
          <p className="font-montserrat text-xs uppercase tracking-editorial text-softGold mb-3">
            Répondez S’il Vous Plaît
          </p>
          <h2 className="font-cormorant text-4xl sm:text-5xl font-light text-charcoal">
            Household RSVP
          </h2>
          <div className="editorial-divider mx-auto w-24 my-6" />
          <p className="font-cormorant italic text-xl text-mutedGray leading-relaxed">
            {settings.rsvpInstructions}
          </p>
        </div>

        {/* STEP 1: Invitation Code Gate (When No Household Session Is Verified) */}
        {!householdSession ? (
          <div className="mt-12 mx-auto max-w-xl border border-softGold/60 bg-warmWhite p-6 sm:p-12 shadow-editorial">
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-softGold/60 bg-ivory">
                <KeyRound className="h-5 w-5 text-softGold" />
              </div>
              <h3 className="font-cormorant text-2xl sm:text-3xl text-charcoal">
                Enter Your Household Invitation Code
              </h3>
              <p className="mt-2 font-montserrat text-xs leading-relaxed text-mutedGray">
                Please enter the personal invitation code printed on your wedding enclosure card to unlock your household’s personalized invitation and RSVP roster.
              </p>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const cfToken =
                  formData.get('cf-turnstile-response')?.toString() ||
                  turnstileToken;
                handleVerifyCode(codeInput, cfToken);
              }}
              className="mt-7 space-y-4"
            >
              <div>
                <label
                  htmlFor="invitation-code-input"
                  className="block font-montserrat text-[11px] uppercase tracking-editorial text-charcoal mb-2"
                >
                  Household Invitation Code
                </label>
                <input
                  id="invitation-code-input"
                  type="text"
                  value={codeInput}
                  onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
                  placeholder="e.g. PERERA-2026"
                  autoComplete="off"
                  className="w-full border border-editorialBorder bg-ivory px-4 py-3.5 text-center font-montserrat text-sm uppercase tracking-widest text-charcoal placeholder:text-mutedGray/50 focus:border-softGold"
                />
              </div>

              {/* Cloudflare Turnstile Verification Widget (Rendered when turnstileEnabled is active) */}
              {settings.turnstileEnabled && (
                <div className="border border-editorialBorder bg-ivory p-3 text-center">
                  <div className="flex items-center justify-center gap-1.5 font-montserrat text-[11px] text-mutedGray mb-2">
                    <ShieldCheck className="h-3.5 w-3.5 text-softGold" />
                    <span>Security Verification Challenge</span>
                  </div>
                  {turnstileSiteKey ? (
                    <div
                      className="cf-turnstile mx-auto"
                      data-sitekey={turnstileSiteKey}
                    />
                  ) : (
                    <input
                      type="text"
                      value={turnstileToken}
                      onChange={(e) => setTurnstileToken(e.target.value)}
                      placeholder="Enter verification challenge token"
                      aria-label="Cloudflare Turnstile verification token"
                      className="w-full border border-editorialBorder bg-warmWhite px-3 py-2 font-montserrat text-xs text-center"
                    />
                  )}
                </div>
              )}

              {codeError && (
                <div
                  role="alert"
                  className="flex items-start gap-2.5 border border-red-800/30 bg-red-50/70 px-4 py-3 font-montserrat text-xs text-red-900"
                >
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-red-700" />
                  <span>{codeError}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={verifyingCode}
                className="w-full border border-charcoal bg-charcoal px-6 py-3.5 font-montserrat text-xs uppercase tracking-editorial text-ivory transition-colors hover:bg-transparent hover:text-charcoal disabled:opacity-50"
              >
                {verifyingCode
                  ? 'Verifying Invitation...'
                  : 'Access Household Invitation'}
              </button>
            </form>

            {/* Sample Codes Drawer — Strictly Gated to Non-Production Placeholder Mode Only */}
            {isDevMode && isPlaceholderContent && (
              <div className="mt-8 border-t border-editorialBorder pt-5">
                <p className="font-montserrat text-[10px] uppercase tracking-editorial text-mutedGray text-center mb-3">
                  Local Dev Mode — Sample Household Codes
                </p>
                <div className="flex flex-wrap items-center justify-center gap-2">
                  {[
                    { label: 'The Perera Family (4 Members)', code: 'PERERA-2026' },
                    { label: 'Lady Eleanor Vance (+1 Guest)', code: 'VANCE-SOLO' },
                    { label: 'Dr. & Mrs. Sterling (Couple)', code: 'STERLING-DUO' },
                    { label: 'Kensington Household (5 Pending)', code: 'KENSINGTON-5' },
                    { label: 'De Silva Family (3 Pending)', code: 'DESILVA-FAM' },
                  ].map((sample) => (
                    <button
                      key={sample.code}
                      type="button"
                      onClick={() => {
                        setCodeInput(sample.code);
                        handleVerifyCode(sample.code);
                      }}
                      className="border border-editorialBorder bg-ivory px-2.5 py-1.5 font-montserrat text-[11px] text-charcoal hover:border-softGold transition-colors"
                    >
                      <span className="font-medium">{sample.code}</span>{' '}
                      <span className="text-mutedGray">({sample.label})</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          /* STEP 2: Authenticated Household RSVP Portal */
          <div className="mt-12 border border-softGold/60 bg-warmWhite p-6 sm:p-12 shadow-editorial">
            {/* Household Identity Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-editorialBorder pb-6">
              <div>
                <div className="inline-flex items-center gap-1.5 font-montserrat text-[10px] uppercase tracking-editorial text-softGold">
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Verified Household Invitation</span>
                </div>
                <h3 className="mt-1 font-cormorant text-3xl sm:text-4xl text-charcoal">
                  {householdSession.displayName}
                </h3>
                <p className="mt-1 font-montserrat text-xs text-mutedGray">
                  Invited Roster:{' '}
                  {householdSession.members.map((m) => m.fullName).join(' • ')}
                </p>
              </div>

              <button
                type="button"
                onClick={handleSignOutHousehold}
                className="self-start sm:self-center inline-flex items-center gap-1.5 border border-editorialBorder bg-ivory px-3.5 py-2 font-montserrat text-[11px] uppercase tracking-wider text-mutedGray hover:border-charcoal hover:text-charcoal transition-colors"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span>Switch Household</span>
              </button>
            </div>

            {rsvpSuccessMessage && (
              <div
                role="status"
                className="mt-6 flex items-start gap-3 border border-softGold bg-ivory px-5 py-4 font-montserrat text-xs text-charcoal"
              >
                <CheckCircle2 className="h-4 w-4 text-softGold shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">{rsvpSuccessMessage}</p>
                </div>
              </div>
            )}

            {/* Existing RSVP Summary View (when not actively editing) */}
            {!isEditing && householdSession.existingRsvp ? (
              <div className="mt-8 space-y-6">
                <div className="border border-editorialBorder bg-ivory/60 p-6">
                  <div className="flex flex-wrap items-center justify-between gap-4 border-b border-editorialBorder pb-4">
                    <div>
                      <p className="font-montserrat text-[10px] uppercase tracking-editorial text-mutedGray">
                        Current Household Response
                      </p>
                      <p className="mt-1 font-cormorant text-2xl sm:text-3xl text-charcoal">
                        {householdSession.existingRsvp.overallStatus === 'attending'
                          ? 'Joyfully Attending'
                          : 'Regretfully Unable to Attend'}
                      </p>
                    </div>
                    <span className="font-montserrat text-[11px] text-mutedGray">
                      Last updated:{' '}
                      {new Date(
                        householdSession.existingRsvp.updatedAt
                      ).toLocaleDateString()}
                    </span>
                  </div>

                  {/* Member Breakdown Table */}
                  <div className="mt-5 divide-y divide-editorialBorder">
                    {householdSession.existingRsvp.memberResponses.map((mr) => {
                      const mealObj = settings.mealOptions.find(
                        (m) => m.id === mr.mealOptionId
                      );
                      return (
                        <div
                          key={mr.memberId}
                          className="py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 font-montserrat text-xs"
                        >
                          <span className="font-medium text-charcoal">
                            {mr.memberName}
                          </span>
                          <div className="flex flex-wrap items-center gap-3">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-0.5 text-[11px] ${
                                mr.attending
                                  ? 'bg-softGold/20 text-charcoal'
                                  : 'bg-charcoal/5 text-mutedGray'
                              }`}
                            >
                              {mr.attending ? (
                                <>
                                  <CheckCircle2 className="h-3 w-3 text-softGold" />{' '}
                                  Attending
                                </>
                              ) : (
                                <>
                                  <XCircle className="h-3 w-3 text-mutedGray" />{' '}
                                  Unable to Attend
                                </>
                              )}
                            </span>
                            {mr.attending &&
                              settings.enableMealPreferencesGlobal &&
                              mealObj && (
                                <span className="text-mutedGray">
                                  Entrée:{' '}
                                  <strong className="text-charcoal">
                                    {mealObj.label}
                                  </strong>
                                </span>
                              )}
                            {mr.attending && mr.dietaryNotes && (
                              <span className="text-mutedGray">
                                ({mr.dietaryNotes})
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Additional Guests Summary */}
                  {householdSession.existingRsvp.additionalGuests.length > 0 && (
                    <div className="mt-5 border-t border-editorialBorder pt-4">
                      <p className="font-montserrat text-[10px] uppercase tracking-editorial text-softGold mb-2">
                        Additional Guests (+1s)
                      </p>
                      <div className="space-y-2">
                        {householdSession.existingRsvp.additionalGuests.map(
                          (ag) => {
                            const mealObj = settings.mealOptions.find(
                              (m) => m.id === ag.mealOptionId
                            );
                            return (
                              <div
                                key={ag.id}
                                className="flex flex-col sm:flex-row sm:items-center sm:justify-between font-montserrat text-xs"
                              >
                                <span className="font-medium text-charcoal">
                                  {ag.fullName}
                                </span>
                                <div className="flex flex-wrap items-center gap-3">
                                  {settings.enableMealPreferencesGlobal &&
                                    mealObj && (
                                      <span className="text-mutedGray">
                                        Entrée:{' '}
                                        <strong className="text-charcoal">
                                          {mealObj.label}
                                        </strong>
                                      </span>
                                    )}
                                  {ag.dietaryNotes && (
                                    <span className="text-mutedGray">
                                      ({ag.dietaryNotes})
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          }
                        )}
                      </div>
                    </div>
                  )}

                  {householdSession.existingRsvp.personalMessage && (
                    <div className="mt-5 border-t border-editorialBorder pt-4">
                      <p className="font-montserrat text-[10px] uppercase tracking-editorial text-mutedGray mb-1">
                        Your Note to the Couple
                      </p>
                      <p className="font-cormorant italic text-lg text-charcoal">
                        “{householdSession.existingRsvp.personalMessage}”
                      </p>
                    </div>
                  )}
                </div>

                {canModifyRsvp && (
                  <div className="text-center">
                    <button
                      type="button"
                      onClick={() => {
                        setRsvpSuccessMessage(null);
                        setIsEditing(true);
                      }}
                      className="inline-flex items-center gap-2 border border-charcoal bg-transparent px-7 py-3 font-montserrat text-xs uppercase tracking-editorial text-charcoal transition-colors hover:bg-charcoal hover:text-ivory"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                      <span>Update Household RSVP</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              /* Interactive RSVP Form */
              <form onSubmit={handleSubmitRsvp} className="mt-8 space-y-8">
                {/* 1. Overall Household Response */}
                <div>
                  <label className="block font-montserrat text-xs uppercase tracking-editorial text-charcoal mb-3">
                    1. Household Response
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <button
                      type="button"
                      onClick={() => handleOverallStatusChange('attending')}
                      className={`flex items-center justify-center gap-2.5 border p-4 font-montserrat text-xs uppercase tracking-wider transition-all ${
                        overallStatus === 'attending'
                          ? 'border-charcoal bg-charcoal text-ivory shadow-sm'
                          : 'border-editorialBorder bg-ivory/60 text-charcoal hover:border-softGold'
                      }`}
                    >
                      <CheckCircle2 className="h-4 w-4 text-softGold" />
                      <span>Accept with Pleasure</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleOverallStatusChange('declined')}
                      className={`flex items-center justify-center gap-2.5 border p-4 font-montserrat text-xs uppercase tracking-wider transition-all ${
                        overallStatus === 'declined'
                          ? 'border-charcoal bg-charcoal text-ivory shadow-sm'
                          : 'border-editorialBorder bg-ivory/60 text-charcoal hover:border-softGold'
                      }`}
                    >
                      <XCircle className="h-4 w-4 text-softGold" />
                      <span>Regretfully Unable to Attend</span>
                    </button>
                  </div>
                </div>

                {/* 2. Per-Member Individual Attendance & Meal Selection */}
                <div>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 mb-3">
                    <label className="font-montserrat text-xs uppercase tracking-editorial text-charcoal">
                      2. Invited Household Members ({householdSession.members.length})
                    </label>
                    <span className="font-montserrat text-[11px] text-mutedGray">
                      Select attendance individually for each invited member
                    </span>
                  </div>

                  <div className="space-y-4">
                    {memberResponses.map((member) => (
                      <div
                        key={member.memberId}
                        className="border border-editorialBorder bg-ivory/60 p-4 sm:p-5"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                          <div>
                            <p className="font-cormorant text-2xl font-medium text-charcoal">
                              {member.memberName}
                            </p>
                            <p className="font-montserrat text-[10px] uppercase tracking-wider text-mutedGray">
                              Invited Household Member
                            </p>
                          </div>

                          <div className="grid grid-cols-2 gap-2 sm:w-72">
                            <button
                              type="button"
                              onClick={() =>
                                handleMemberAttendanceToggle(
                                  member.memberId,
                                  true
                                )
                              }
                              className={`px-3 py-2 font-montserrat text-xs border transition-colors ${
                                member.attending
                                  ? 'border-charcoal bg-charcoal text-ivory'
                                  : 'border-editorialBorder bg-warmWhite text-mutedGray hover:border-softGold'
                              }`}
                            >
                              Attending
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                handleMemberAttendanceToggle(
                                  member.memberId,
                                  false
                                )
                              }
                              className={`px-3 py-2 font-montserrat text-xs border transition-colors ${
                                !member.attending
                                  ? 'border-charcoal bg-charcoal text-ivory'
                                  : 'border-editorialBorder bg-warmWhite text-mutedGray hover:border-softGold'
                              }`}
                            >
                              Unable to Attend
                            </button>
                          </div>
                        </div>

                        {/* Meal Selection & Dietary Notes for Attending Member */}
                        {member.attending && overallStatus === 'attending' && (
                          <div
                            className={`mt-4 pt-4 border-t border-editorialBorder grid grid-cols-1 ${
                              settings.enableMealPreferencesGlobal &&
                              settings.mealOptions.length > 0
                                ? 'sm:grid-cols-2'
                                : ''
                            } gap-4`}
                          >
                            {settings.enableMealPreferencesGlobal &&
                              settings.mealOptions.length > 0 && (
                                <div>
                                  <label
                                    htmlFor={`meal-${member.memberId}`}
                                    className="flex items-center gap-1.5 font-montserrat text-[11px] uppercase tracking-wider text-charcoal mb-1.5"
                                  >
                                    <Utensils className="h-3 w-3 text-softGold" />
                                    <span>Entrée Preference</span>
                                  </label>
                                  <select
                                    id={`meal-${member.memberId}`}
                                    value={member.mealOptionId || ''}
                                    onChange={(e) =>
                                      handleMemberMealChange(
                                        member.memberId,
                                        e.target.value
                                      )
                                    }
                                    className="w-full border border-editorialBorder bg-warmWhite px-3 py-2.5 font-montserrat text-xs text-charcoal"
                                  >
                                    {settings.mealOptions.map((opt) => (
                                      <option key={opt.id} value={opt.id}>
                                        {opt.label}
                                        {opt.dietaryTag
                                          ? ` (${opt.dietaryTag})`
                                          : ''}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              )}

                            <div>
                              <label
                                htmlFor={`dietary-${member.memberId}`}
                                className="block font-montserrat text-[11px] uppercase tracking-wider text-charcoal mb-1.5"
                              >
                                Dietary Notes / Allergies (Optional)
                              </label>
                              <input
                                id={`dietary-${member.memberId}`}
                                type="text"
                                value={member.dietaryNotes || ''}
                                onChange={(e) =>
                                  handleMemberDietaryChange(
                                    member.memberId,
                                    e.target.value
                                  )
                                }
                                placeholder="e.g. Nut allergy, dairy-free"
                                maxLength={240}
                                className="w-full border border-editorialBorder bg-warmWhite px-3 py-2.5 font-montserrat text-xs text-charcoal"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* 3. Additional Guests / Plus-Ones */}
                {overallStatus === 'attending' &&
                  settings.allowAdditionalGuestsGlobal &&
                  householdSession.effectiveAdditionalGuestAllowance > 0 && (
                    <div className="border-t border-editorialBorder pt-6">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
                        <div>
                          <label className="block font-montserrat text-xs uppercase tracking-editorial text-charcoal">
                            3. Additional Guest Allowance (Up to{' '}
                            {householdSession.effectiveAdditionalGuestAllowance})
                          </label>
                          <p className="font-montserrat text-[11px] text-mutedGray">
                            Your household invitation includes up to{' '}
                            {householdSession.effectiveAdditionalGuestAllowance}{' '}
                            additional guest(s).
                          </p>
                        </div>

                        {additionalGuests.length <
                          householdSession.effectiveAdditionalGuestAllowance && (
                          <button
                            type="button"
                            onClick={handleAddAdditionalGuest}
                            className="self-start inline-flex items-center gap-1.5 border border-charcoal bg-warmWhite px-4 py-2 font-montserrat text-xs uppercase tracking-wider text-charcoal hover:bg-charcoal hover:text-ivory transition-colors"
                          >
                            <Plus className="h-3.5 w-3.5" />
                            <span>Add Additional Guest</span>
                          </button>
                        )}
                      </div>

                      {additionalGuests.length > 0 && (
                        <div className="space-y-4">
                          {additionalGuests.map((guest, idx) => (
                            <div
                              key={guest.id || idx}
                              className="border border-softGold/50 bg-ivory/60 p-4"
                            >
                              <div className="flex items-center justify-between mb-3">
                                <span className="font-montserrat text-[11px] uppercase tracking-wider text-softGold">
                                  Additional Guest #{idx + 1}
                                </span>
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleRemoveAdditionalGuest(idx)
                                  }
                                  className="inline-flex items-center gap-1 font-montserrat text-xs text-red-800 hover:underline"
                                >
                                  <Trash2 className="h-3.5 w-3.5" /> Remove
                                </button>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div>
                                  <label className="block font-montserrat text-[11px] uppercase tracking-wider text-charcoal mb-1">
                                    Full Name of Guest *
                                  </label>
                                  <input
                                    type="text"
                                    required
                                    value={guest.fullName}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      setAdditionalGuests((prev) =>
                                        prev.map((item, i) =>
                                          i === idx
                                            ? { ...item, fullName: val }
                                            : item
                                        )
                                      );
                                    }}
                                    placeholder="Enter guest's full name"
                                    className="w-full border border-editorialBorder bg-warmWhite px-3 py-2.5 font-montserrat text-xs text-charcoal"
                                  />
                                </div>

                                {settings.enableMealPreferencesGlobal &&
                                  settings.mealOptions.length > 0 && (
                                    <div>
                                      <label className="block font-montserrat text-[11px] uppercase tracking-wider text-charcoal mb-1">
                                        Entrée Preference
                                      </label>
                                      <select
                                        value={guest.mealOptionId || ''}
                                        onChange={(e) => {
                                          const val = e.target.value;
                                          setAdditionalGuests((prev) =>
                                            prev.map((item, i) =>
                                              i === idx
                                                ? { ...item, mealOptionId: val }
                                                : item
                                            )
                                          );
                                        }}
                                        className="w-full border border-editorialBorder bg-warmWhite px-3 py-2.5 font-montserrat text-xs text-charcoal"
                                      >
                                        {settings.mealOptions.map((opt) => (
                                          <option key={opt.id} value={opt.id}>
                                            {opt.label}
                                          </option>
                                        ))}
                                      </select>
                                    </div>
                                  )}

                                <div>
                                  <label className="block font-montserrat text-[11px] uppercase tracking-wider text-charcoal mb-1">
                                    Dietary Notes (Optional)
                                  </label>
                                  <input
                                    type="text"
                                    maxLength={240}
                                    value={guest.dietaryNotes || ''}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      setAdditionalGuests((prev) =>
                                        prev.map((item, i) =>
                                          i === idx
                                            ? { ...item, dietaryNotes: val }
                                            : item
                                        )
                                      );
                                    }}
                                    placeholder="e.g. Nut allergy"
                                    className="w-full border border-editorialBorder bg-warmWhite px-3 py-2.5 font-montserrat text-xs text-charcoal"
                                  />
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                {/* 4. Optional Guest Contact Details */}
                <div className="border-t border-editorialBorder pt-6">
                  <label className="block font-montserrat text-xs uppercase tracking-editorial text-charcoal mb-1">
                    Optional Contact Details
                  </label>
                  <p className="font-montserrat text-[11px] text-mutedGray mb-4">
                    Providing an email or telephone number is completely optional and only used if the wedding organizers need to share event updates.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label
                        htmlFor="rsvp-contact-email"
                        className="block font-montserrat text-[11px] uppercase tracking-wider text-charcoal mb-1.5"
                      >
                        Email Address (Optional)
                      </label>
                      <input
                        id="rsvp-contact-email"
                        type="email"
                        value={contactEmail}
                        onChange={(e) => setContactEmail(e.target.value)}
                        placeholder="your.name@example.com"
                        className="w-full border border-editorialBorder bg-ivory px-3.5 py-2.5 font-montserrat text-xs text-charcoal"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="rsvp-contact-phone"
                        className="block font-montserrat text-[11px] uppercase tracking-wider text-charcoal mb-1.5"
                      >
                        Telephone Number (Optional)
                      </label>
                      <input
                        id="rsvp-contact-phone"
                        type="tel"
                        value={contactPhone}
                        onChange={(e) => setContactPhone(e.target.value)}
                        placeholder="+94 77 000 0000"
                        className="w-full border border-editorialBorder bg-ivory px-3.5 py-2.5 font-montserrat text-xs text-charcoal"
                      />
                    </div>
                  </div>
                </div>

                {/* 5. Personal Message to the Couple */}
                <div className="border-t border-editorialBorder pt-6">
                  <div className="flex items-center justify-between mb-1.5">
                    <label
                      htmlFor="rsvp-personal-message"
                      className="font-montserrat text-xs uppercase tracking-editorial text-charcoal"
                    >
                      Personal Note for the Couple (Optional)
                    </label>
                    <span className="font-montserrat text-[11px] text-mutedGray">
                      {personalMessage.length}/1000
                    </span>
                  </div>
                  <textarea
                    id="rsvp-personal-message"
                    rows={3}
                    maxLength={1000}
                    value={personalMessage}
                    onChange={(e) => setPersonalMessage(e.target.value)}
                    placeholder="Share your wishes or a note for the couple..."
                    className="w-full border border-editorialBorder bg-ivory p-3.5 font-montserrat text-xs text-charcoal"
                  />
                </div>

                {rsvpError && (
                  <div
                    role="alert"
                    className="flex items-start gap-2.5 border border-red-800/30 bg-red-50/80 px-4 py-3 font-montserrat text-xs text-red-900"
                  >
                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-red-700" />
                    <span>{rsvpError}</span>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-2">
                  {householdSession.existingRsvp && (
                    <button
                      type="button"
                      onClick={() => setIsEditing(false)}
                      className="w-full sm:w-auto border border-editorialBorder bg-ivory px-6 py-3.5 font-montserrat text-xs uppercase tracking-editorial text-mutedGray hover:text-charcoal"
                    >
                      Cancel
                    </button>
                  )}

                  <button
                    type="submit"
                    disabled={submittingRsvp || !canModifyRsvp}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 border border-charcoal bg-charcoal px-9 py-3.5 font-montserrat text-xs uppercase tracking-editorial text-ivory transition-colors hover:bg-transparent hover:text-charcoal disabled:opacity-50"
                  >
                    <Send className="h-3.5 w-3.5 text-softGold" />
                    <span>
                      {submittingRsvp
                        ? 'Recording Response...'
                        : householdSession.existingRsvp
                        ? 'Save Updated RSVP'
                        : 'Submit Household RSVP'}
                    </span>
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
