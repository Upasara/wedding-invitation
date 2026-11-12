// ==============================================================================
// Canonical Domain Model & Firestore Collection Schemas (12 Logical Collections)
// ==============================================================================

export interface MealOption {
  id: string;
  label: string;
  description: string;
  dietaryTag?: string;
  active: boolean;
}

export interface SectionVisibility {
  hero: boolean;
  invitationMessage: boolean;
  story: boolean;
  events: boolean;
  gallery: boolean;
  weddingParty: boolean;
  rsvp: boolean;
  faq: boolean;
}

/**
 * Collection 1: `wedding_settings` (Doc ID: `global`)
 */
export interface WeddingSettings {
  id: 'global';
  rsvpEnabled: boolean;
  rsvpDeadline: string; // ISO 8601
  rsvpInstructions: string;
  allowAdditionalGuestsGlobal: boolean;
  enableMealPreferencesGlobal: boolean;
  mealOptions: MealOption[];
  requireInvitationCode: boolean;
  invitationAccessOpen: boolean;
  turnstileEnabled: boolean;
  sectionVisibility: SectionVisibility;
  updatedAt: string;
}

export interface CoupleNames {
  partnerOne: string;
  partnerTwo: string;
  displayTitle: string;
  monogram: string;
}

/**
 * Collection 2: `wedding_content` (Doc ID: `main`)
 */
export interface WeddingContent {
  id: 'main';
  isPlaceholderContent: boolean;
  coupleNames: CoupleNames;
  weddingDateIso: string; // ISO 8601 date-time
  weddingTimezone: string;
  weddingDateDisplay: string;
  weddingLocationSummary: string;
  coverPhrase: string;
  coverSubtext: string;
  heroTagline: string;
  heroImageUrl: string;
  couplePhotoOneUrl: string;
  couplePhotoTwoUrl: string;
  partnerOneBio: string;
  partnerTwoBio: string;
  invitationHeading: string;
  hostNames: string[];
  invitationMessageBody: string;
  invitationAdditionalText: string;
  storySectionTitle: string;
  storySectionSubtitle: string;
  storyIntroText: string;
  countdownHeading: string;
  postWeddingMessage: string;
  audioUrl: string; // Strictly empty until organizer uploads/configures real audio
  audioTitle: string;
  footerClosingMessage: string;
  footerCopyright: string;
  updatedAt: string;
}

/**
 * Collection 3: `events`
 */
export interface WeddingEvent {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD or formatted date
  dateDisplay: string;
  startTime: string;
  endTime?: string;
  venueName: string;
  fullAddress: string;
  description: string;
  imageUrl?: string;
  googleMapsUrl: string;
  directionsLabel: string;
  notes?: string;
  order: number;
  active: boolean;
  updatedAt: string;
}

/**
 * Collection 4: `story_entries`
 */
export interface StoryEntry {
  id: string;
  title: string;
  dateLabel: string;
  caption: string;
  description: string;
  imageUrl?: string;
  order: number;
  active: boolean;
  updatedAt: string;
}

/**
 * Collection 5: `gallery_images`
 */
export interface GalleryImage {
  id: string;
  imageUrl: string;
  caption?: string;
  altText: string;
  aspectRatio?: 'portrait' | 'landscape' | 'square';
  order: number;
  active: boolean;
  uploadedAt: string;
}

/**
 * Collection 6: `wedding_party`
 */
export interface WeddingPartyMember {
  id: string;
  name: string;
  role: string; // Custom role e.g. "Best Man", "Maid of Honor", "Parents of the Bride"
  imageUrl?: string;
  description?: string;
  order: number;
  active: boolean;
  updatedAt: string;
}

/**
 * Collection 7: `faqs`
 */
export interface FaqEntry {
  id: string;
  question: string;
  answer: string;
  order: number;
  active: boolean;
  updatedAt: string;
}

export interface HouseholdMember {
  id: string; // Stable internal member ID e.g. "mem_101"
  fullName: string;
  title?: string;
}

export type InvitationStatus = 'active' | 'inactive' | 'revoked';

/**
 * Collection 8: `households`
 */
export interface HouseholdRecord {
  id: string; // Stable internal household ID e.g. "hh_perera"
  displayName: string; // e.g. "The Perera Family"
  category: 'individual' | 'couple' | 'family' | 'group';
  members: HouseholdMember[];
  maxInvitedMembers: number;
  additionalGuestAllowance: number;
  status: InvitationStatus;
  codeDigest: string; // HMAC-SHA256 hex digest of invitation code
  codeKeyVersion: number;
  codeHint: string; // Masked suffix e.g. "••••-PERERA" for admin visual confirmation
  codeLastGeneratedAt: string;
  adminNotes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MemberRsvpResponse {
  memberId: string;
  memberName: string;
  attending: boolean;
  mealOptionId?: string | null;
  dietaryNotes?: string;
}

export interface AdditionalGuestResponse {
  id: string;
  fullName: string;
  mealOptionId?: string | null;
  dietaryNotes?: string;
}

/**
 * Collection 9: `rsvps`
 */
export interface RsvpRecord {
  id: string; // `rsvp_${householdId}`
  householdId: string;
  householdDisplayName: string;
  overallStatus: 'attending' | 'declined';
  memberResponses: MemberRsvpResponse[];
  additionalGuests: AdditionalGuestResponse[];
  contactEmail?: string;
  contactPhone?: string;
  personalMessage?: string;
  attendingMembersCount: number;
  additionalGuestsCount: number;
  totalAttendingCount: number;
  version: number; // Monotonic version counter for optimistic concurrency
  submittedAt: string;
  updatedAt: string;
  updatedBy: 'guest' | 'admin';
}

/**
 * Collection 10: `idempotency_records`
 */
export interface IdempotencyRecord {
  id: string;
  householdId: string;
  requestHash: string;
  statusCode: number;
  responseBody: unknown;
  createdAt: string;
  expiresAt: string;
}

/**
 * Collection 11: `admin_users`
 */
export interface AdminUserRecord {
  uid: string;
  email: string;
  displayName: string;
  role: 'admin' | 'super_admin';
  photoUrl?: string;
  passwordSalt: string;
  passwordHash: string;
  active: boolean;
  lastLoginAt?: string;
  updatedAt: string;
}

/**
 * Collection 12: `revoked_invitations`
 */
export interface RevokedInvitationRecord {
  id: string;
  householdId: string;
  codeDigest: string;
  revokedAt: string;
  revokedBy: string;
  reason: string;
}

// ==============================================================================
// Sanitized Public Projection DTOs (Never leak codeDigest, adminNotes, or other households)
// ==============================================================================

export interface PublicHouseholdSessionView {
  householdId: string;
  displayName: string;
  members: HouseholdMember[];
  maxInvitedMembers: number;
  additionalGuestAllowance: number;
  effectiveAdditionalGuestAllowance: number;
  existingRsvp: {
    overallStatus: 'attending' | 'declined';
    memberResponses: MemberRsvpResponse[];
    additionalGuests: AdditionalGuestResponse[];
    contactEmail?: string;
    contactPhone?: string;
    personalMessage?: string;
    version: number;
    submittedAt: string;
    updatedAt: string;
  } | null;
}

export interface PublicInvitationPayload {
  content: WeddingContent;
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
    sectionVisibility: SectionVisibility;
  };
  events: WeddingEvent[];
  storyEntries: StoryEntry[];
  galleryImages: GalleryImage[];
  weddingParty: WeddingPartyMember[];
  faqs: FaqEntry[];
  householdSession: PublicHouseholdSessionView | null;
}

export interface DashboardOverviewStats {
  totalHouseholds: number;
  activeHouseholds: number;
  respondedHouseholds: number;
  pendingHouseholds: number;
  totalInvitedMembers: number;
  attendingInvitedMembers: number;
  declinedInvitedMembers: number;
  pendingInvitedMembers: number;
  totalAdditionalGuests: number;
  totalExpectedAttendees: number;
  mealBreakdown: Array<{
    optionId: string;
    label: string;
    count: number;
  }>;
  recentRsvps: Array<{
    householdId: string;
    householdDisplayName: string;
    overallStatus: 'attending' | 'declined';
    totalAttendingCount: number;
    personalMessage?: string;
    updatedAt: string;
    updatedBy: 'guest' | 'admin';
  }>;
}

