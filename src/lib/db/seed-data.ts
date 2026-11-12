import {
  AdminUserRecord,
  FaqEntry,
  GalleryImage,
  HouseholdRecord,
  IdempotencyRecord,
  RevokedInvitationRecord,
  RsvpRecord,
  StoryEntry,
  WeddingContent,
  WeddingEvent,
  WeddingPartyMember,
  WeddingSettings,
} from '@/lib/types/domain';
import { computeInvitationCodeDigest } from '@/lib/security/hmac';
import { hashAdminPassword } from '@/lib/security/session';

// ==============================================================================
// Initial Seed Dataset (All 12 Logical Collections)
// Note: All wedding details are clearly marked as editable placeholder content
// so organizers can replace them seamlessly from the Admin Dashboard.
// ==============================================================================

export interface FullDatabaseCollections {
  wedding_settings: Record<string, WeddingSettings>;
  wedding_content: Record<string, WeddingContent>;
  events: Record<string, WeddingEvent>;
  story_entries: Record<string, StoryEntry>;
  gallery_images: Record<string, GalleryImage>;
  wedding_party: Record<string, WeddingPartyMember>;
  faqs: Record<string, FaqEntry>;
  households: Record<string, HouseholdRecord>;
  rsvps: Record<string, RsvpRecord>;
  idempotency_records: Record<string, IdempotencyRecord>;
  admin_users: Record<string, AdminUserRecord>;
  revoked_invitations: Record<string, RevokedInvitationRecord>;
}

/**
 * Documented initial invitation codes for testing & organizer verification in local dev.
 * In production or when codes are regenerated, only the HMAC-SHA256 digest is stored.
 */
export const SAMPLE_DEVELOPMENT_INVITATION_CODES: Record<
  string,
  { householdId: string; displayName: string; code: string; note: string }
> = {
  hh_perera: {
    householdId: 'hh_perera',
    displayName: 'The Perera Family',
    code: 'PERERA-2026',
    note: 'Family of 4 (3 Attending, 1 Unable to Attend) + 1 Guest Allowance',
  },
  hh_vance: {
    householdId: 'hh_vance',
    displayName: 'Lady Eleanor Vance',
    code: 'VANCE-SOLO',
    note: 'Individual Invitation + 1 Plus-One Allowance (Attending with Plus-One)',
  },
  hh_sterling: {
    householdId: 'hh_sterling',
    displayName: 'Dr. Julian & Mrs. Clara Sterling',
    code: 'STERLING-DUO',
    note: 'Couple Invitation, 0 Plus-One Allowance (Both Attending)',
  },
  hh_kensington: {
    householdId: 'hh_kensington',
    displayName: 'The Kensington Household',
    code: 'KENSINGTON-5',
    note: 'Household of 5 Invited Members + 2 Plus-One Allowance (Pending RSVP)',
  },
  hh_ashworth: {
    householdId: 'hh_ashworth',
    displayName: 'Lord & Lady Ashworth',
    code: 'ASHWORTH-DEC',
    note: 'Couple Invitation (Declined RSVP)',
  },
  hh_desilva: {
    householdId: 'hh_desilva',
    displayName: 'The De Silva Family',
    code: 'DESILVA-FAM',
    note: 'Family of 3 + 2 Plus-One Allowance (Pending RSVP)',
  },
  hh_revoked: {
    householdId: 'hh_revoked',
    displayName: 'Mr. Adrian Thorne (Revoked Sample)',
    code: 'REVOKED-9999',
    note: 'Revoked Invitation Code (Rejected on Verification)',
  },
};

export function createInitialSeedDatabase(): FullDatabaseCollections {
  const nowIso = '2026-11-02T10:00:00.000Z';

  const settings: WeddingSettings = {
    id: 'global',
    rsvpEnabled: true,
    rsvpDeadline: '2027-05-15T23:59:59.000Z',
    rsvpInstructions:
      'Kindly respond by the fifteenth of May. Please indicate individual attendance and entrée selections for each member of your household.',
    allowAdditionalGuestsGlobal: true,
    enableMealPreferencesGlobal: true,
    mealOptions: [
      {
        id: 'meal_herb_lamb',
        label: 'Herb-Crusted Rack of Lamb',
        description: 'Rosemary jus, truffle pomme purée, charred asparagus',
        dietaryTag: 'Signature Entrée',
        active: true,
      },
      {
        id: 'meal_sea_bass',
        label: 'Pan-Seared Chilean Sea Bass',
        description: 'Saffron beurre blanc, fennel confit, wild herb risotto',
        dietaryTag: 'Gluten-Free',
        active: true,
      },
      {
        id: 'meal_wild_mushroom',
        label: 'Wild Morel & Black Truffle Mille-Feuille',
        description: 'Artisanal puff pastry, roasted parsnip velouté, micro herbs',
        dietaryTag: 'Vegetarian / Vegan Option',
        active: true,
      },
    ],
    requireInvitationCode: true,
    invitationAccessOpen: true,
    turnstileEnabled: false,
    sectionVisibility: {
      hero: true,
      invitationMessage: true,
      story: true,
      events: true,
      gallery: true,
      weddingParty: true,
      rsvp: true,
      faq: true,
    },
    updatedAt: nowIso,
  };

  const content: WeddingContent = {
    id: 'main',
    isPlaceholderContent: true,
    coupleNames: {
      partnerOne: 'Aurelia',
      partnerTwo: 'Sebastian',
      displayTitle: 'Aurelia & Sebastian',
      monogram: 'A & S',
    },
    weddingDateIso: '2027-06-19T16:30:00.000Z',
    weddingTimezone: 'Asia/Colombo',
    weddingDateDisplay: 'Saturday, the Nineteenth of June, Two Thousand Twenty-Seven',
    weddingLocationSummary: 'The Grand Conservatory, Villa Montclair • Colombo',
    coverPhrase: 'Together with their families',
    coverSubtext: 'Request the honour of your presence at the celebration of their marriage',
    heroTagline: 'An Evening of Timeless Romance & Celebration',
    heroImageUrl: '/uploads/sample-hero-editorial.svg',
    couplePhotoOneUrl: '/uploads/sample-portrait-one.svg',
    couplePhotoTwoUrl: '/uploads/sample-portrait-two.svg',
    partnerOneBio:
      '[Placeholder Bio — Editable in Admin Dashboard] An architectural historian with a love for classical violins, botanical conservatories, and quiet Sunday mornings.',
    partnerTwoBio:
      '[Placeholder Bio — Editable in Admin Dashboard] A fine-art restorer and lifelong sailor who believes every great story begins over a shared pot of Darjeeling tea.',
    invitationHeading: 'Together With Their Families',
    hostNames: [
      'Mr. & Mrs. Harrison Vance-Montclair',
      'Dr. & Mrs. Alistair Sterling-Kensington',
    ],
    invitationMessageBody:
      'With joyful hearts and the blessing of our parents, we invite you to share in our sacred vows and the celebration of our marriage. Your presence has shaped our journey, and it is our deepest honour to welcome you as we begin our life together.',
    invitationAdditionalText:
      'Black Tie Optional • Reception & Candlelit Dinner to Follow Immediately',
    storySectionTitle: 'Our Story',
    storySectionSubtitle: 'Chapters of a Shared Journey',
    storyIntroText:
      'From a chance meeting at an autumn gallery exhibition to a quiet proposal overlooking the misty hills, every chapter has led us to this celebration.',
    countdownHeading: 'Counting the Moments Until We Say I Do',
    postWeddingMessage:
      'Thank you for celebrating our marriage with us. Our hearts are forever grateful for your love and presence.',
    audioUrl: '', // Strictly empty until client provides or uploads their audio file
    audioTitle: 'Wedding Processional Suite',
    footerClosingMessage:
      'We cannot wait to celebrate this unforgettable chapter in your company.',
    footerCopyright: 'Crafted Exclusively for Aurelia & Sebastian • Luxury Editorial Edition',
    updatedAt: nowIso,
  };

  const events: Record<string, WeddingEvent> = {
    evt_ceremony: {
      id: 'evt_ceremony',
      title: 'The Marriage Ceremony',
      date: '2027-06-19',
      dateDisplay: 'Saturday, June 19, 2027',
      startTime: '4:30 PM',
      endTime: '5:45 PM',
      venueName: 'The Glass Orangery at Villa Montclair',
      fullAddress: '142 Horton Place, Cinnamon Gardens, Colombo 07',
      description:
        'Exchange of sacred marriage vows accompanied by a chamber string quartet amidst the sunken botanical gardens.',
      imageUrl: '/uploads/sample-event-ceremony.svg',
      googleMapsUrl:
        'https://www.google.com/maps/search/?api=1&query=Cinnamon+Gardens+Colombo',
      directionsLabel: 'View Map & Directions',
      notes: 'Guests are kindly requested to be seated by 4:10 PM.',
      order: 1,
      active: true,
      updatedAt: nowIso,
    },
    evt_reception: {
      id: 'evt_reception',
      title: 'Champagne Aperitif & Candlelit Reception',
      date: '2027-06-19',
      dateDisplay: 'Saturday, June 19, 2027',
      startTime: '6:30 PM',
      endTime: '11:30 PM',
      venueName: 'The Grand Ballroom, Villa Montclair',
      fullAddress: '142 Horton Place, Cinnamon Gardens, Colombo 07',
      description:
        'Join us on the terrace for vintage champagne and canapés at twilight, followed by a formal four-course dinner, toasts, and dancing under the crystal chandeliers.',
      imageUrl: '/uploads/sample-event-reception.svg',
      googleMapsUrl:
        'https://www.google.com/maps/search/?api=1&query=Cinnamon+Gardens+Colombo',
      directionsLabel: 'View Map & Directions',
      notes: 'Valet parking is complimentary at the main carriage entrance.',
      order: 2,
      active: true,
      updatedAt: nowIso,
    },
    evt_homecoming: {
      id: 'evt_homecoming',
      title: 'The Homecoming Celebration',
      date: '2027-06-21',
      dateDisplay: 'Monday, June 21, 2027',
      startTime: '7:00 PM',
      endTime: '11:00 PM',
      venueName: 'The Heritage Pavilion by the Lake',
      fullAddress: '88 Queen’s Road, Colombo 03',
      description:
        'A traditional evening of warmth, music, and fine dining hosted by the groom’s family to welcome the bride home.',
      imageUrl: '/uploads/sample-event-homecoming.svg',
      googleMapsUrl:
        'https://www.google.com/maps/search/?api=1&query=Queens+Road+Colombo',
      directionsLabel: 'View Map & Directions',
      notes: 'Attire: Formal Evening Wear or Traditional Elegance.',
      order: 3,
      active: true,
      updatedAt: nowIso,
    },
  };

  const story_entries: Record<string, StoryEntry> = {
    sty_1: {
      id: 'sty_1',
      title: 'An Autumn Evening at the Archive',
      dateLabel: 'October 2022',
      caption: 'Where two paths crossed over seventeenth-century botanical sketches',
      description:
        'What began as a polite debate over the provenance of an archival manuscript turned into a three-hour conversation over espresso in the courtyard rain.',
      imageUrl: '/uploads/sample-story-1.svg',
      order: 1,
      active: true,
      updatedAt: nowIso,
    },
    sty_2: {
      id: 'sty_2',
      title: 'First Voyage Along the Southern Coast',
      dateLabel: 'August 2024',
      caption: 'Sailing into golden hour at Cape Weligama',
      description:
        'Through sudden monsoons and serene starlit nights at sea, we discovered that home was no longer a place on a map, but wherever we stood together.',
      imageUrl: '/uploads/sample-story-2.svg',
      order: 2,
      active: true,
      updatedAt: nowIso,
    },
    sty_3: {
      id: 'sty_3',
      title: 'The Proposal at Mistwood Estate',
      dateLabel: 'December 2025',
      caption: 'A quiet promise at sunrise above the tea valleys',
      description:
        'As morning mist lifted over the highland peaks, Sebastian knelt on the stone terrace with an heirloom sapphire ring passed down through three generations.',
      imageUrl: '/uploads/sample-story-3.svg',
      order: 3,
      active: true,
      updatedAt: nowIso,
    },
  };

  const gallery_images: Record<string, GalleryImage> = {
    gal_1: {
      id: 'gal_1',
      imageUrl: '/uploads/sample-gallery-1.svg',
      caption: 'Morning light in the colonnade courtyard — Placeholder Portrait I',
      altText: 'Couple walking through classical colonnade courtyard',
      aspectRatio: 'portrait',
      order: 1,
      active: true,
      uploadedAt: nowIso,
    },
    gal_2: {
      id: 'gal_2',
      imageUrl: '/uploads/sample-gallery-2.svg',
      caption: 'Evening promenade by the reflecting pool — Placeholder Portrait II',
      altText: 'Couple beside reflecting pool at dusk',
      aspectRatio: 'landscape',
      order: 2,
      active: true,
      uploadedAt: nowIso,
    },
    gal_3: {
      id: 'gal_3',
      imageUrl: '/uploads/sample-gallery-3.svg',
      caption: 'Heirloom calligraphy & wax seal details — Placeholder Editorial III',
      altText: 'Close up of luxury wedding stationery and rings',
      aspectRatio: 'square',
      order: 3,
      active: true,
      uploadedAt: nowIso,
    },
    gal_4: {
      id: 'gal_4',
      imageUrl: '/uploads/sample-gallery-4.svg',
      caption: 'Among the highland olive groves — Placeholder Portrait IV',
      altText: 'Editorial portrait in the gardens',
      aspectRatio: 'portrait',
      order: 4,
      active: true,
      uploadedAt: nowIso,
    },
    gal_5: {
      id: 'gal_5',
      imageUrl: '/uploads/sample-gallery-5.svg',
      caption: 'A quiet toast at golden hour — Placeholder Portrait V',
      altText: 'Champagne toast at sunset',
      aspectRatio: 'landscape',
      order: 5,
      active: true,
      uploadedAt: nowIso,
    },
    gal_6: {
      id: 'gal_6',
      imageUrl: '/uploads/sample-gallery-6.svg',
      caption: 'The conservatory staircase — Placeholder Portrait VI',
      altText: 'Couple on marble staircase',
      aspectRatio: 'portrait',
      order: 6,
      active: true,
      uploadedAt: nowIso,
    },
  };

  const wedding_party: Record<string, WeddingPartyMember> = {
    pty_1: {
      id: 'pty_1',
      name: 'Lady Camille Laurent',
      role: 'Maid of Honor',
      imageUrl: '/uploads/sample-party-1.svg',
      description: 'Childhood confidante, fellow art historian, and keeper of calm.',
      order: 1,
      active: true,
      updatedAt: nowIso,
    },
    pty_2: {
      id: 'pty_2',
      name: 'Lord Julian Montgomery',
      role: 'Best Man',
      imageUrl: '/uploads/sample-party-2.svg',
      description: 'Brother in spirit since university rowing days at Cambridge.',
      order: 2,
      active: true,
      updatedAt: nowIso,
    },
    pty_3: {
      id: 'pty_3',
      name: 'Sophia Wijesinghe',
      role: 'Bridesmaid',
      imageUrl: '/uploads/sample-party-3.svg',
      description: 'Architect, dear cousin, and curator of midnight laughter.',
      order: 3,
      active: true,
      updatedAt: nowIso,
    },
    pty_4: {
      id: 'pty_4',
      name: 'Henrik Lindqvist',
      role: 'Groomsman',
      imageUrl: '/uploads/sample-party-4.svg',
      description: 'Sailing navigator and trusted friend across every ocean.',
      order: 4,
      active: true,
      updatedAt: nowIso,
    },
    pty_5: {
      id: 'pty_5',
      name: 'Mr. & Mrs. Harrison Vance-Montclair',
      role: 'Parents of the Bride',
      imageUrl: '/uploads/sample-party-5.svg',
      description: 'Whose enduring thirty-five-year marriage remains our greatest inspiration.',
      order: 5,
      active: true,
      updatedAt: nowIso,
    },
    pty_6: {
      id: 'pty_6',
      name: 'Dr. & Mrs. Alistair Sterling-Kensington',
      role: 'Parents of the Groom',
      imageUrl: '/uploads/sample-party-6.svg',
      description: 'Whose warmth, wisdom, and generosity anchor our family.',
      order: 6,
      active: true,
      updatedAt: nowIso,
    },
  };

  const faqs: Record<string, FaqEntry> = {
    faq_1: {
      id: 'faq_1',
      question: 'What time should we arrive for the ceremony?',
      answer:
        'We kindly request that guests arrive at The Glass Orangery between 3:45 PM and 4:10 PM so everyone may be comfortably seated with a welcome refreshment prior to the processional at 4:30 PM.',
      order: 1,
      active: true,
      updatedAt: nowIso,
    },
    faq_2: {
      id: 'faq_2',
      question: 'What is the recommended dress code?',
      answer:
        'Our celebration is Black Tie Optional / Formal National Attire. Gentlemen are encouraged to wear a tuxedo, dark formal suit, or traditional formal attire; ladies are invited to wear floor-length evening gowns or silk sarees.',
      order: 2,
      active: true,
      updatedAt: nowIso,
    },
    faq_3: {
      id: 'faq_3',
      question: 'Is valet parking available at the venue?',
      answer:
        'Yes. Complimentary valet parking is provided at the main carriage entrance of Villa Montclair, and dedicated chauffeurs’ lounges are available on site.',
      order: 3,
      active: true,
      updatedAt: nowIso,
    },
    faq_4: {
      id: 'faq_4',
      question: 'Can I bring additional guests or children?',
      answer:
        'To maintain an intimate atmosphere, our celebration is reserved for the specific household members named on your personal invitation and any additional guest allowance indicated in your RSVP portal.',
      order: 4,
      active: true,
      updatedAt: nowIso,
    },
    faq_5: {
      id: 'faq_5',
      question: 'Whom should I contact for travel or dietary assistance?',
      answer:
        'Our wedding concierge team is delighted to assist you. Please include any allergies in your RSVP response or reach our coordinator directly at concierge@luxurywedding.example.',
      order: 5,
      active: true,
      updatedAt: nowIso,
    },
  };

  // Build 7 sample households with real HMAC-SHA256 digests
  const pereraCode = computeInvitationCodeDigest('PERERA-2026');
  const vanceCode = computeInvitationCodeDigest('VANCE-SOLO');
  const sterlingCode = computeInvitationCodeDigest('STERLING-DUO');
  const kensingtonCode = computeInvitationCodeDigest('KENSINGTON-5');
  const ashworthCode = computeInvitationCodeDigest('ASHWORTH-DEC');
  const desilvaCode = computeInvitationCodeDigest('DESILVA-FAM');
  const revokedCode = computeInvitationCodeDigest('REVOKED-9999');

  const households: Record<string, HouseholdRecord> = {
    hh_perera: {
      id: 'hh_perera',
      displayName: 'The Perera Family',
      category: 'family',
      members: [
        { id: 'mem_perera_1', fullName: 'Mr. Perera', title: 'Mr.' },
        { id: 'mem_perera_2', fullName: 'Mrs. Perera', title: 'Mrs.' },
        { id: 'mem_perera_3', fullName: 'Kasun Perera' },
        { id: 'mem_perera_4', fullName: 'Nethmi Perera' },
      ],
      maxInvitedMembers: 4,
      additionalGuestAllowance: 1,
      status: 'active',
      codeDigest: pereraCode.digest,
      codeKeyVersion: pereraCode.keyVersion,
      codeHint: pereraCode.codeHint,
      codeLastGeneratedAt: nowIso,
      adminNotes: 'Close family friends from Colombo; seated at Table 2.',
      createdAt: nowIso,
      updatedAt: nowIso,
    },
    hh_vance: {
      id: 'hh_vance',
      displayName: 'Lady Eleanor Vance',
      category: 'individual',
      members: [{ id: 'mem_vance_1', fullName: 'Lady Eleanor Vance', title: 'Lady' }],
      maxInvitedMembers: 1,
      additionalGuestAllowance: 1,
      status: 'active',
      codeDigest: vanceCode.digest,
      codeKeyVersion: vanceCode.keyVersion,
      codeHint: vanceCode.codeHint,
      codeLastGeneratedAt: nowIso,
      adminNotes: 'Bride’s godmother; bringing one escort.',
      createdAt: nowIso,
      updatedAt: nowIso,
    },
    hh_sterling: {
      id: 'hh_sterling',
      displayName: 'Dr. Julian & Mrs. Clara Sterling',
      category: 'couple',
      members: [
        { id: 'mem_sterling_1', fullName: 'Dr. Julian Sterling', title: 'Dr.' },
        { id: 'mem_sterling_2', fullName: 'Mrs. Clara Sterling', title: 'Mrs.' },
      ],
      maxInvitedMembers: 2,
      additionalGuestAllowance: 0,
      status: 'active',
      codeDigest: sterlingCode.digest,
      codeKeyVersion: sterlingCode.keyVersion,
      codeHint: sterlingCode.codeHint,
      codeLastGeneratedAt: nowIso,
      adminNotes: 'Groom’s uncle and aunt.',
      createdAt: nowIso,
      updatedAt: nowIso,
    },
    hh_kensington: {
      id: 'hh_kensington',
      displayName: 'The Kensington Household',
      category: 'group',
      members: [
        { id: 'mem_kens_1', fullName: 'Lord Arthur Kensington' },
        { id: 'mem_kens_2', fullName: 'Lady Beatrice Kensington' },
        { id: 'mem_kens_3', fullName: 'Edward Kensington' },
        { id: 'mem_kens_4', fullName: 'Victoria Kensington' },
        { id: 'mem_kens_5', fullName: 'Charlotte Kensington' },
      ],
      maxInvitedMembers: 5,
      additionalGuestAllowance: 2,
      status: 'active',
      codeDigest: kensingtonCode.digest,
      codeKeyVersion: kensingtonCode.keyVersion,
      codeHint: kensingtonCode.codeHint,
      codeLastGeneratedAt: nowIso,
      adminNotes: 'Travelling from London; awaiting flight confirmation.',
      createdAt: nowIso,
      updatedAt: nowIso,
    },
    hh_ashworth: {
      id: 'hh_ashworth',
      displayName: 'Lord & Lady Ashworth',
      category: 'couple',
      members: [
        { id: 'mem_ash_1', fullName: 'Lord Henry Ashworth' },
        { id: 'mem_ash_2', fullName: 'Lady Margot Ashworth' },
      ],
      maxInvitedMembers: 2,
      additionalGuestAllowance: 0,
      status: 'active',
      codeDigest: ashworthCode.digest,
      codeKeyVersion: ashworthCode.keyVersion,
      codeHint: ashworthCode.codeHint,
      codeLastGeneratedAt: nowIso,
      adminNotes: 'Overseas diplomatic commitment in June.',
      createdAt: nowIso,
      updatedAt: nowIso,
    },
    hh_desilva: {
      id: 'hh_desilva',
      displayName: 'The De Silva Family',
      category: 'family',
      members: [
        { id: 'mem_desilva_1', fullName: 'Mr.ohan De Silva' },
        { id: 'mem_desilva_2', fullName: 'Mrs. Anushka De Silva' },
        { id: 'mem_desilva_3', fullName: 'Devika De Silva' },
      ],
      maxInvitedMembers: 3,
      additionalGuestAllowance: 2,
      status: 'active',
      codeDigest: desilvaCode.digest,
      codeKeyVersion: desilvaCode.keyVersion,
      codeHint: desilvaCode.codeHint,
      codeLastGeneratedAt: nowIso,
      adminNotes: 'Family friends from Kandy.',
      createdAt: nowIso,
      updatedAt: nowIso,
    },
    hh_revoked: {
      id: 'hh_revoked',
      displayName: 'Mr. Adrian Thorne (Revoked Record)',
      category: 'individual',
      members: [{ id: 'mem_rev_1', fullName: 'Mr. Adrian Thorne' }],
      maxInvitedMembers: 1,
      additionalGuestAllowance: 0,
      status: 'revoked',
      codeDigest: revokedCode.digest,
      codeKeyVersion: revokedCode.keyVersion,
      codeHint: revokedCode.codeHint,
      codeLastGeneratedAt: nowIso,
      adminNotes: 'Sample revoked invitation code for security verification.',
      createdAt: nowIso,
      updatedAt: nowIso,
    },
  };

  // Correct typo in Mr. Rohan De Silva
  households.hh_desilva.members[0].fullName = 'Mr. Rohan De Silva';

  const rsvps: Record<string, RsvpRecord> = {
    rsvp_hh_perera: {
      id: 'rsvp_hh_perera',
      householdId: 'hh_perera',
      householdDisplayName: 'The Perera Family',
      overallStatus: 'attending',
      memberResponses: [
        {
          memberId: 'mem_perera_1',
          memberName: 'Mr. Perera',
          attending: true,
          mealOptionId: 'meal_herb_lamb',
          dietaryNotes: '',
        },
        {
          memberId: 'mem_perera_2',
          memberName: 'Mrs. Perera',
          attending: true,
          mealOptionId: 'meal_sea_bass',
          dietaryNotes: 'No shellfish garnish please',
        },
        {
          memberId: 'mem_perera_3',
          memberName: 'Kasun Perera',
          attending: false,
          mealOptionId: null,
          dietaryNotes: '',
        },
        {
          memberId: 'mem_perera_4',
          memberName: 'Nethmi Perera',
          attending: true,
          mealOptionId: 'meal_wild_mushroom',
          dietaryNotes: '',
        },
      ],
      additionalGuests: [],
      contactEmail: 'perera.family@example.com',
      contactPhone: '+94 77 123 4567',
      personalMessage:
        'We are overjoyed for you both! Kasun will be at his medical residency in Edinburgh, but the three of us cannot wait to celebrate with you.',
      attendingMembersCount: 3,
      additionalGuestsCount: 0,
      totalAttendingCount: 3,
      version: 1,
      submittedAt: '2026-10-28T14:20:00.000Z',
      updatedAt: '2026-10-28T14:20:00.000Z',
      updatedBy: 'guest',
    },
    rsvp_hh_vance: {
      id: 'rsvp_hh_vance',
      householdId: 'hh_vance',
      householdDisplayName: 'Lady Eleanor Vance',
      overallStatus: 'attending',
      memberResponses: [
        {
          memberId: 'mem_vance_1',
          memberName: 'Lady Eleanor Vance',
          attending: true,
          mealOptionId: 'meal_sea_bass',
          dietaryNotes: '',
        },
      ],
      additionalGuests: [
        {
          id: 'plus_vance_1',
          fullName: 'Sir Geoffrey Locke',
          mealOptionId: 'meal_herb_lamb',
          dietaryNotes: '',
        },
      ],
      contactEmail: 'eleanor.vance@example.com',
      contactPhone: '+44 20 7946 0921',
      personalMessage: 'Counting the days until June, my dearest Aurelia & Sebastian.',
      attendingMembersCount: 1,
      additionalGuestsCount: 1,
      totalAttendingCount: 2,
      version: 1,
      submittedAt: '2026-10-29T09:15:00.000Z',
      updatedAt: '2026-10-29T09:15:00.000Z',
      updatedBy: 'guest',
    },
    rsvp_hh_sterling: {
      id: 'rsvp_hh_sterling',
      householdId: 'hh_sterling',
      householdDisplayName: 'Dr. Julian & Mrs. Clara Sterling',
      overallStatus: 'attending',
      memberResponses: [
        {
          memberId: 'mem_sterling_1',
          memberName: 'Dr. Julian Sterling',
          attending: true,
          mealOptionId: 'meal_herb_lamb',
          dietaryNotes: '',
        },
        {
          memberId: 'mem_sterling_2',
          memberName: 'Mrs. Clara Sterling',
          attending: true,
          mealOptionId: 'meal_wild_mushroom',
          dietaryNotes: '',
        },
      ],
      additionalGuests: [],
      contactEmail: 'j.sterling@example.com',
      personalMessage: 'Warmest congratulations from both of us!',
      attendingMembersCount: 2,
      additionalGuestsCount: 0,
      totalAttendingCount: 2,
      version: 1,
      submittedAt: '2026-10-30T18:05:00.000Z',
      updatedAt: '2026-10-30T18:05:00.000Z',
      updatedBy: 'guest',
    },
    rsvp_hh_ashworth: {
      id: 'rsvp_hh_ashworth',
      householdId: 'hh_ashworth',
      householdDisplayName: 'Lord & Lady Ashworth',
      overallStatus: 'declined',
      memberResponses: [
        {
          memberId: 'mem_ash_1',
          memberName: 'Lord Henry Ashworth',
          attending: false,
          mealOptionId: null,
        },
        {
          memberId: 'mem_ash_2',
          memberName: 'Lady Margot Ashworth',
          attending: false,
          mealOptionId: null,
        },
      ],
      additionalGuests: [],
      contactEmail: 'ashworth.office@example.com',
      personalMessage:
        'With our deepest regrets as we will be in Geneva that week. Raising a glass to your lifelong happiness!',
      attendingMembersCount: 0,
      additionalGuestsCount: 0,
      totalAttendingCount: 0,
      version: 1,
      submittedAt: '2026-10-31T11:40:00.000Z',
      updatedAt: '2026-10-31T11:40:00.000Z',
      updatedBy: 'guest',
    },
  };

  const isProduction = process.env.NODE_ENV === 'production';
  const rawAdminEmail = process.env.INITIAL_ADMIN_EMAIL?.trim().toLowerCase();
  const rawAdminPassword = process.env.INITIAL_ADMIN_PASSWORD;

  if (isProduction) {
    if (process.env.SEED_SAMPLE_DATA?.trim().toLowerCase() === 'true') {
      throw new Error(
        'CRITICAL SECURITY CONFIGURATION ERROR: SEED_SAMPLE_DATA=true is strictly forbidden in production (NODE_ENV=production). Production databases must never seed development households, sample RSVPs, or sample invitation codes.'
      );
    }
    if (
      !rawAdminEmail ||
      rawAdminEmail === 'organizer@luxurywedding.example'
    ) {
      throw new Error(
        'CRITICAL SECURITY CONFIGURATION ERROR: INITIAL_ADMIN_EMAIL must be explicitly set to a non-default email address when seeding a database in production (NODE_ENV=production).'
      );
    }
    if (
      !rawAdminPassword ||
      rawAdminPassword.length < 12 ||
      rawAdminPassword === 'LuxuryWedding!2026'
    ) {
      throw new Error(
        'CRITICAL SECURITY CONFIGURATION ERROR: INITIAL_ADMIN_PASSWORD must be explicitly set to a strong password (>= 12 chars, non-default) when seeding a database in production (NODE_ENV=production).'
      );
    }
  }

  const defaultAdminEmail = rawAdminEmail || 'organizer@luxurywedding.example';
  const defaultAdminPassword = rawAdminPassword || 'LuxuryWedding!2026';
  const adminHashed = hashAdminPassword(defaultAdminPassword);

  const admin_users: Record<string, AdminUserRecord> = {
    adm_primary: {
      uid: 'adm_primary',
      email: defaultAdminEmail,
      displayName: 'Lead Wedding Organizer',
      role: 'super_admin',
      photoUrl: '',
      passwordSalt: adminHashed.salt,
      passwordHash: adminHashed.hash,
      active: true,
      lastLoginAt: nowIso,
      updatedAt: nowIso,
    },
  };

  const revoked_invitations: Record<string, RevokedInvitationRecord> = {
    rev_sample_1: {
      id: 'rev_sample_1',
      householdId: 'hh_revoked',
      codeDigest: revokedCode.digest,
      revokedAt: nowIso,
      revokedBy: 'adm_primary',
      reason: 'Sample revoked code for security verification',
    },
  };

  const includeSampleHouseholds =
    !isProduction &&
    process.env.SEED_SAMPLE_DATA?.trim().toLowerCase() !== 'false';

  if (!includeSampleHouseholds) {
    content.isPlaceholderContent = false;
  }

  return {
    wedding_settings: { global: settings },
    wedding_content: { main: content },
    events,
    story_entries,
    gallery_images,
    wedding_party,
    faqs,
    households: includeSampleHouseholds ? households : {},
    rsvps: includeSampleHouseholds ? rsvps : {},
    idempotency_records: {},
    admin_users,
    revoked_invitations: includeSampleHouseholds ? revoked_invitations : {},
  };
}

