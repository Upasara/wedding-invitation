# Luxury Digital Wedding Invitation Web Application

A production-quality luxury digital wedding invitation web application built with **Next.js (App Router)**, **TypeScript**, **Tailwind CSS**, **Framer Motion**, and a modular **Firebase-ready architecture**.

---

## 🌟 Visual & Editorial Design Philosophy

- **Aesthetic**: Premium, editorial, minimal luxury wedding experience.
- **Palette**:
  - Warm Ivory (`#FAF7F2`, `#FAF6EF`)
  - Deep Charcoal & Onyx (`#1C1C1C`, `#0A0A0A`)
  - Crisp Architectural White (`#FFFFFF`)
  - Soft Neutral Grays (`#E5E5E5`, `#737373`)
  - Restrained Metallic Gold Accents (`#C5A880`, `#D4AF37`, `#9A7B3E`)
- **Typography**: Refined classical serifs (*Cormorant Garamond*, *Playfair Display*) paired with clean geometric sans (*Montserrat*) loaded via `next/font/google`.
- **Restraint**: Generous whitespace, hairline borders, filmic photography, subtle transitions, and zero gaudy gradients or flashy cliches.
- **Mobile-First**: Fully responsive across compact mobile (320px, 375px, 390px, 430px), tablets (768px, 1024px), and desktop displays (1440px+).

---

## 🏛️ Public Invitation Structure (Exact Order)

1. **Opening Invitation**: Full-screen physical stationery card & wax seal experience. Includes "Open Invitation" action that starts background music and unseals the invitation with smooth 3D envelope transition.
2. **Hero Section**: Couple names (*Alexander & Sarah*), invitation message, wedding date (*October 24, 2026*), venue (*Villa Ephrussi de Rothschild, Cap-Ferrat*), editorial photo, scroll indicator, and a live dynamic countdown timer updating every second.
3. **Couple / Our Story**: Large couple portrait, formal names, "Our Story" narrative paragraphs, and romantic quote callout.
4. **Events / Itinerary**: Reusable event cards supporting an arbitrary number of events (e.g., Welcome Soirée, Holy Matrimony, Grand Reception, Farewell Brunch) with dates, times, venues, dress codes, and *"Get Directions"* links opening directly in Google Maps.
5. **Wedding Party**: Flexible party member showcase supporting arbitrary roles (Maid of Honor, Best Man, Bridesmaids, Groomsmen, Parents) with portraits, bios, and category filter tabs.
6. **Gallery**: Responsive editorial grid with desktop hover interactions, mobile tap support, and a fullscreen accessible Lightbox with previous/next controls, keyboard navigation (Escape, Arrow keys), and image counters.
7. **Q&A**: Accessible accordion interface supporting arbitrary questions and answers (dress code, arrival time, transportation/parking, venue logistics).
8. **RSVP**: Integrated multi-step visual flow:
   - Step 1: Attendance (Joyfully Accepts / Regretfully Declines)
   - Step 2: Guest / Family Contact Info (Name, Email, Phone)
   - Step 3: Who is Attending
   - Step 4: Party Size Counter & Additional Guest Names
   - Step 5: Meal Preferences (Filet Mignon, Sea Bass, Morel Risotto) & Dietary Notes
   - Step 6: Personal Note / Heartfelt Wishes
   - Step 7: Review Summary
   - Step 8: Confirmation Screen with option to edit
9. **Footer**: Couple monogram seal, formal names, wedding date, location, and warm closing message.

---

## 🎵 Background Music Controller Architecture

- Designed in accordance with modern browser autoplay policies: audio playback is initiated on explicit user interaction (*"Open Invitation"*).
- **Persistent State**: Managed via `MusicContext` at the root layout so music never stops or restarts when scrolling between sections.
- **Floating Controls**: Minimalist circular floating button at the bottom-right corner with sound wave indicator and mute/unmute toggle.
- **Resilient Fallback**: If external audio cannot be loaded due to network or CORS restrictions, the system gracefully activates a gentle ambient Web Audio harmonic chime fallback without throwing errors or interrupting the user experience.

---

## 🗂️ Project Directory Architecture

```
├── app/
│   ├── globals.css              # Custom styling, fonts, luxury selection colors
│   ├── layout.tsx               # Root layout with fonts & MusicProvider
│   └── page.tsx                 # Public invitation page (all 9 sections in order)
├── components/
│   ├── invitation/
│   │   └── OpeningInvitation.tsx# Full-screen stationery cover & unsealing trigger
│   ├── hero/
│   │   ├── Countdown.tsx        # Live countdown timer (Days, Hours, Mins, Secs)
│   │   └── HeroSection.tsx      # Editorial hero banner & date badge
│   ├── couple/
│   │   └── OurStorySection.tsx  # Narrative story & couple portrait
│   ├── events/
│   │   ├── EventCard.tsx        # Reusable card with Google Maps directions
│   │   └── EventsSection.tsx    # Arbitrary event list renderer
│   ├── wedding-party/
│   │   ├── WeddingPartyCard.tsx # Portrait & arbitrary role card
│   │   └── WeddingPartySection.tsx # Category filterable party section
│   ├── gallery/
│   │   ├── Lightbox.tsx         # Full-screen photo viewer with keyboard shortcuts
│   │   └── GallerySection.tsx   # Responsive photo grid
│   ├── qa/
│   │   ├── QAItemComponent.tsx  # Accessible accordion item
│   │   └── QASection.tsx        # Arbitrary questions & answers
│   ├── rsvp/
│   │   ├── RSVPStepIndicator.tsx# Minimal luxury step progress
│   │   ├── RSVPForm.tsx         # Multi-step interactive RSVP flow (8 steps)
│   │   └── RSVPSection.tsx      # Section wrapper
│   ├── music/
│   │   └── FloatingMusicController.tsx # Persistent floating mute/play control
│   └── ui/
│       ├── SectionHeading.tsx   # Reusable luxury heading with gold hairline accents
│       ├── GoldDivider.tsx      # Hairline gold diamond separator
│       └── Footer.tsx           # Minimal luxury footer
├── context/
│   └── MusicContext.tsx         # Persistent music state & audio manager
├── types/
│   └── wedding.ts               # Strict TypeScript data models for wedding entities
├── data/
│   └── mockWedding.ts           # Centralized mock wedding data (Firestore ready)
├── public/                      # Static assets
├── tailwind.config.ts           # Custom luxury palette and typography
├── tsconfig.json                # TypeScript strict configuration
└── package.json                 # Next.js 15, React 19, Framer Motion, Lucide
```

---

## 🔌 Firebase Integration Readiness (Phase 2 Roadmap)

This Phase 1 implementation strictly separates data from presentation:
- **Centralized Data Schema**: All wedding content is driven by `mockWeddingData` conforming to `WeddingData` in `types/wedding.ts`.
- **Firestore Mapping**: In Phase 2, `mockWeddingData` can be replaced with a single Firestore query (`doc(db, 'weddings', weddingId)`) or real-time listener without changing any UI component props.
- **RSVP Submissions**: In Phase 2, Step 7 of `RSVPForm.tsx` can directly call `addDoc(collection(db, 'weddings', weddingId, 'rsvps'), formData)`.
- **Firebase Storage**: Image URLs in `hero.heroImage`, `gallery[].imageUrl`, and audio in `musicSettings.audioUrl` will point directly to Firebase Storage download URLs.
- **Security Rules**: Ready for strict Firestore read-only public rules for wedding details, and create-only for RSVP submissions.

---

## 🚀 Running the Project

```bash
# 1. Install dependencies
npm install

# 2. Run development server
npm run dev

# 3. Build for production
npm run build

# 4. Start production server
npm run start
```

Visit [http://localhost:3000](http://localhost:3000) to view the wedding invitation.
