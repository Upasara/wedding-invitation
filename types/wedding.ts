export interface CoupleData {
  partner1: {
    firstName: string;
    lastName: string;
    fullName: string;
  };
  partner2: {
    firstName: string;
    lastName: string;
    fullName: string;
  };
  formalNames: string;
  shortNames: string;
  monogram: string;
}

export interface InvitationData {
  hostLine: string;
  headline: string;
  envelopeSealText: string;
  envelopeSubtext: string;
  openButtonText: string;
}

export interface HeroData {
  tagline: string;
  coupleNames: string;
  invitationMessage: string;
  weddingDateDisplay: string;
  isoWeddingDate: string; // ISO 8601 string for live countdown
  mainLocation: string;
  subLocation: string;
  heroImage: string;
  scrollIndicatorText: string;
}

export interface StoryData {
  heading: string;
  subheading: string;
  paragraphs: string[];
  coupleImage: string;
  coupleImageCaption?: string;
  quote?: string;
  quoteAuthor?: string;
}

export interface WeddingEvent {
  id: string;
  name: string;
  date: string;
  time: string;
  venue: string;
  address: string;
  description: string;
  attire?: string;
  googleMapsUrl: string;
  order: number;
}

export type WeddingPartyCategory = "all" | "bride" | "groom" | "family";

export interface WeddingPartyMember {
  id: string;
  name: string;
  role: string;
  category: "bride" | "groom" | "family";
  image: string;
  description: string;
  order: number;
}

export interface GalleryImage {
  id: string;
  imageUrl: string;
  caption: string;
  order: number;
  width?: number;
  height?: number;
}

export interface QAItem {
  id: string;
  question: string;
  answer: string;
  order: number;
}

export interface MealOption {
  id: string;
  name: string;
  description: string;
}

export interface RsvpSettings {
  enabled: boolean;
  deadlineDisplay: string;
  maxPartySize: number;
  mealOptionsEnabled: boolean;
  mealOptions: MealOption[];
  allowDietaryNotes: boolean;
  allowPersonalMessage: boolean;
  confirmationMessage: string;
}

export interface MusicSettings {
  trackTitle: string;
  artist: string;
  audioUrl: string;
  loop: boolean;
}

export interface WeddingData {
  id: string;
  couple: CoupleData;
  invitation: InvitationData;
  hero: HeroData;
  story: StoryData;
  events: WeddingEvent[];
  weddingParty: WeddingPartyMember[];
  gallery: GalleryImage[];
  qa: QAItem[];
  rsvpSettings: RsvpSettings;
  musicSettings: MusicSettings;
  footer: {
    closingMessage: string;
    subtext: string;
  };
}

// RSVP form state types for the visual interactive preview
export interface RsvpFormState {
  attendance: "attending" | "declining" | null;
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  guestCount: number;
  additionalGuestNames: string[];
  mealPreferences: Record<string, string>; // guestName -> mealOptionId
  dietaryRestrictions: string;
  personalMessage: string;
}
