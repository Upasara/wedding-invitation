import { z } from 'zod';

// ==============================================================================
// Strict Server-Side Zod Validation Schemas
// Every schema uses `.strict()` so unknown/unauthorized fields are rejected.
// ==============================================================================

export const verifyInvitationCodeSchema = z
  .object({
    code: z
      .string()
      .trim()
      .min(4, 'Please enter a valid invitation code.')
      .max(64, 'Invitation code is too long.'),
    turnstileToken: z.string().max(2048).optional(),
  })
  .strict();

export const memberRsvpInputSchema = z
  .object({
    memberId: z.string().trim().min(1).max(64),
    attending: z.boolean(),
    mealOptionId: z.string().trim().max(64).nullable().optional(),
    dietaryNotes: z.string().trim().max(240).optional(),
  })
  .strict();

export const additionalGuestInputSchema = z
  .object({
    id: z.string().trim().max(64).optional(),
    fullName: z
      .string()
      .trim()
      .min(2, 'Please provide the full name of each additional guest.')
      .max(120, 'Guest name cannot exceed 120 characters.'),
    mealOptionId: z.string().trim().max(64).nullable().optional(),
    dietaryNotes: z.string().trim().max(240).optional(),
  })
  .strict();

export const submitRsvpSchema = z
  .object({
    overallStatus: z.enum(['attending', 'declined']),
    memberResponses: z.array(memberRsvpInputSchema).min(1).max(30),
    additionalGuests: z.array(additionalGuestInputSchema).max(15).default([]),
    contactEmail: z
      .string()
      .trim()
      .max(160)
      .refine((val) => val === '' || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val), {
        message: 'Please provide a valid email address or leave this field blank.',
      })
      .optional(),
    contactPhone: z
      .string()
      .trim()
      .max(40)
      .refine((val) => val === '' || /^[0-9+\-() .\s]{6,35}$/.test(val), {
        message: 'Please provide a valid phone number or leave this field blank.',
      })
      .optional(),
    personalMessage: z
      .string()
      .trim()
      .max(1000, 'Personal message must be 1,000 characters or fewer.')
      .optional(),
    expectedVersion: z.number().int().nonnegative().optional(),
    idempotencyKey: z.string().trim().max(128).optional(),
  })
  .strict();

export const adminLoginSchema = z
  .object({
    email: z.string().trim().email('Please enter a valid administrator email.'),
    password: z.string().min(8, 'Password must be at least 8 characters.').max(128),
    firebaseIdToken: z.string().max(4096).optional(),
  })
  .strict();

export const adminPasswordResetRequestSchema = z
  .object({
    email: z.string().trim().email('Please enter a valid administrator email.'),
  })
  .strict();

export const adminAccountUpdateSchema = z
  .object({
    displayName: z.string().trim().min(2).max(100).optional(),
    photoUrl: z.string().trim().max(500).optional(),
    currentPassword: z.string().min(8).max(128).optional(),
    newPassword: z
      .string()
      .min(10, 'New password must be at least 10 characters.')
      .max(128)
      .optional(),
  })
  .strict();

export const weddingContentUpdateSchema = z
  .object({
    isPlaceholderContent: z.boolean().optional(),
    coupleNames: z
      .object({
        partnerOne: z.string().trim().min(1).max(80),
        partnerTwo: z.string().trim().min(1).max(80),
        displayTitle: z.string().trim().min(1).max(160),
        monogram: z.string().trim().min(1).max(16),
      })
      .strict()
      .optional(),
    weddingDateIso: z.string().trim().min(10).max(45).optional(),
    weddingTimezone: z.string().trim().min(2).max(64).optional(),
    weddingDateDisplay: z.string().trim().min(2).max(120).optional(),
    weddingLocationSummary: z.string().trim().min(2).max(180).optional(),
    coverPhrase: z.string().trim().min(1).max(200).optional(),
    coverSubtext: z.string().trim().max(240).optional(),
    heroTagline: z.string().trim().max(240).optional(),
    heroImageUrl: z.string().trim().min(1).max(600).optional(),
    couplePhotoOneUrl: z.string().trim().max(600).optional(),
    couplePhotoTwoUrl: z.string().trim().max(600).optional(),
    partnerOneBio: z.string().trim().max(1500).optional(),
    partnerTwoBio: z.string().trim().max(1500).optional(),
    invitationHeading: z.string().trim().max(240).optional(),
    hostNames: z.array(z.string().trim().min(1).max(140)).max(10).optional(),
    invitationMessageBody: z.string().trim().max(3000).optional(),
    invitationAdditionalText: z.string().trim().max(1500).optional(),
    storySectionTitle: z.string().trim().max(140).optional(),
    storySectionSubtitle: z.string().trim().max(200).optional(),
    storyIntroText: z.string().trim().max(2500).optional(),
    countdownHeading: z.string().trim().max(140).optional(),
    postWeddingMessage: z.string().trim().max(500).optional(),
    audioUrl: z.string().trim().max(600).optional(),
    audioTitle: z.string().trim().max(140).optional(),
    footerClosingMessage: z.string().trim().max(400).optional(),
    footerCopyright: z.string().trim().max(200).optional(),
  })
  .strict();

export const mealOptionSchema = z
  .object({
    id: z.string().trim().min(1).max(64),
    label: z.string().trim().min(1).max(100),
    description: z.string().trim().max(300),
    dietaryTag: z.string().trim().max(60).optional(),
    active: z.boolean(),
  })
  .strict();

export const weddingSettingsUpdateSchema = z
  .object({
    rsvpEnabled: z.boolean().optional(),
    rsvpDeadline: z.string().trim().min(10).max(45).optional(),
    rsvpInstructions: z.string().trim().max(1200).optional(),
    allowAdditionalGuestsGlobal: z.boolean().optional(),
    enableMealPreferencesGlobal: z.boolean().optional(),
    mealOptions: z.array(mealOptionSchema).max(20).optional(),
    requireInvitationCode: z.boolean().optional(),
    invitationAccessOpen: z.boolean().optional(),
    turnstileEnabled: z.boolean().optional(),
    sectionVisibility: z
      .object({
        hero: z.boolean(),
        invitationMessage: z.boolean(),
        story: z.boolean(),
        events: z.boolean(),
        gallery: z.boolean(),
        weddingParty: z.boolean(),
        rsvp: z.boolean(),
        faq: z.boolean(),
      })
      .strict()
      .optional(),
  })
  .strict();

export const eventInputSchema = z
  .object({
    id: z.string().trim().max(64).optional(),
    title: z.string().trim().min(2).max(140),
    date: z.string().trim().min(2).max(40),
    dateDisplay: z.string().trim().min(2).max(120),
    startTime: z.string().trim().min(1).max(40),
    endTime: z.string().trim().max(40).optional(),
    venueName: z.string().trim().min(2).max(160),
    fullAddress: z.string().trim().min(2).max(300),
    description: z.string().trim().min(2).max(2000),
    imageUrl: z.string().trim().max(600).optional(),
    googleMapsUrl: z
      .string()
      .trim()
      .url('Google Maps URL must be a valid URL.')
      .max(600),
    directionsLabel: z.string().trim().min(1).max(80).default('Get Directions'),
    notes: z.string().trim().max(600).optional(),
    order: z.number().int().nonnegative().default(0),
    active: z.boolean().default(true),
  })
  .strict();

export const storyEntryInputSchema = z
  .object({
    id: z.string().trim().max(64).optional(),
    title: z.string().trim().min(2).max(140),
    dateLabel: z.string().trim().min(1).max(80),
    caption: z.string().trim().max(240),
    description: z.string().trim().min(2).max(2500),
    imageUrl: z.string().trim().max(600).optional(),
    order: z.number().int().nonnegative().default(0),
    active: z.boolean().default(true),
  })
  .strict();

export const galleryImageInputSchema = z
  .object({
    id: z.string().trim().max(64).optional(),
    imageUrl: z.string().trim().min(1).max(600),
    caption: z.string().trim().max(240).optional(),
    altText: z.string().trim().min(1).max(200),
    aspectRatio: z.enum(['portrait', 'landscape', 'square']).default('portrait'),
    order: z.number().int().nonnegative().default(0),
    active: z.boolean().default(true),
  })
  .strict();

export const weddingPartyInputSchema = z
  .object({
    id: z.string().trim().max(64).optional(),
    name: z.string().trim().min(2).max(120),
    role: z.string().trim().min(2).max(100),
    imageUrl: z.string().trim().max(600).optional(),
    description: z.string().trim().max(600).optional(),
    order: z.number().int().nonnegative().default(0),
    active: z.boolean().default(true),
  })
  .strict();

export const faqInputSchema = z
  .object({
    id: z.string().trim().max(64).optional(),
    question: z.string().trim().min(3).max(300),
    answer: z.string().trim().min(2).max(2500),
    order: z.number().int().nonnegative().default(0),
    active: z.boolean().default(true),
  })
  .strict();

export const householdMemberInputSchema = z
  .object({
    id: z.string().trim().max(64).optional(),
    fullName: z.string().trim().min(2).max(120),
    title: z.string().trim().max(40).optional(),
  })
  .strict();

export const householdCreateOrUpdateSchema = z
  .object({
    id: z.string().trim().max(64).optional(),
    displayName: z.string().trim().min(2).max(140),
    category: z.enum(['individual', 'couple', 'family', 'group']).default('family'),
    members: z
      .array(householdMemberInputSchema)
      .min(1, 'At least one invited member is required.')
      .max(25),
    additionalGuestAllowance: z.number().int().min(0).max(15).default(0),
    status: z.enum(['active', 'inactive', 'revoked']).default('active'),
    adminNotes: z.string().trim().max(1000).optional(),
    customPlaintextCode: z
      .string()
      .trim()
      .min(6)
      .max(48)
      .optional(),
  })
  .strict();

export const householdCodeActionSchema = z
  .object({
    action: z.enum(['regenerate', 'revoke', 'activate']),
    reason: z.string().trim().max(300).optional(),
    customPlaintextCode: z.string().trim().min(6).max(48).optional(),
  })
  .strict();

export const adminRsvpUpsertSchema = z
  .object({
    householdId: z.string().trim().min(1).max(64),
    overallStatus: z.enum(['attending', 'declined']),
    memberResponses: z.array(memberRsvpInputSchema).min(1).max(30),
    additionalGuests: z.array(additionalGuestInputSchema).max(15).default([]),
    contactEmail: z.string().trim().max(160).optional(),
    contactPhone: z.string().trim().max(40).optional(),
    personalMessage: z.string().trim().max(1000).optional(),
  })
  .strict();

