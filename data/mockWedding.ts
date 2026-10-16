import { WeddingData } from "@/types/wedding";

export const mockWeddingData: WeddingData = {
  id: "sterling-vance-2026",
  couple: {
    partner1: {
      firstName: "Alexander",
      lastName: "Sterling",
      fullName: "Alexander James Sterling",
    },
    partner2: {
      firstName: "Sarah",
      lastName: "Vance",
      fullName: "Sarah Elizabeth Vance",
    },
    formalNames: "Alexander Sterling & Sarah Vance",
    shortNames: "Alexander & Sarah",
    monogram: "A & S",
  },
  invitation: {
    hostLine: "Together with their families",
    headline: "You are warmly invited to celebrate the union of",
    envelopeSealText: "A & S",
    envelopeSubtext: "Private Wedding Invitation • Autumn MMXXVI",
    openButtonText: "Open Invitation",
  },
  hero: {
    tagline: "The Wedding Celebration of",
    coupleNames: "Alexander & Sarah",
    invitationMessage:
      "Request the honor of your presence as we exchange vows and celebrate the beginning of our forever.",
    weddingDateDisplay: "Saturday, October 24, 2026",
    isoWeddingDate: "2026-10-24T16:00:00+02:00",
    mainLocation: "Villa Ephrussi de Rothschild",
    subLocation: "Saint-Jean-Cap-Ferrat • French Riviera",
    heroImage:
      "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=2000&q=85",
    scrollIndicatorText: "Scroll to explore",
  },
  story: {
    heading: "Our Story",
    subheading: "A chance meeting across a rainy Parisian café turned into a lifetime of shared dreams.",
    paragraphs: [
      "Our story began on an autumn evening in Paris. A sudden rainstorm hurried us both into the warmth of a quiet book café on the Left Bank. What started as sharing a small marble table over espresso quickly became hours of conversation about art, architecture, and the places we dreamed of discovering.",
      "Over the next seven years, our lives intertwined across continents—from quiet weekend hikes along the California coastline to vibrant sunsets overlooking the Mediterranean. In every chapter, we found in each other a steadfast partner, a creative muse, and a truest friend.",
      "Last spring, beneath the olive groves of Saint-Jean-Cap-Ferrat, Alexander asked Sarah to spend the rest of their lives together. Today, we invite our most cherished family and friends to join us in the place where forever begins.",
    ],
    coupleImage:
      "https://images.unsplash.com/photo-1583939003579-730e3918a45a?auto=format&fit=crop&w=1400&q=85",
    coupleImageCaption: "Alexander & Sarah in Cap-Ferrat, Spring 2025",
    quote: "In all the world, there is no heart for me like yours. In all the world, there is no love for you like mine.",
    quoteAuthor: "Maya Angelou",
  },
  events: [
    {
      id: "welcome-rehearsal",
      name: "Welcome & Rehearsal Soirée",
      date: "Friday, October 23, 2026",
      time: "6:30 PM — 10:00 PM",
      venue: "Grand-Hôtel du Cap-Ferrat",
      address: "71 Boulevard du Général de Gaulle, 06230 Saint-Jean-Cap-Ferrat, France",
      description:
        "Join us for sunset cocktails, Mediterranean hors d'œuvres, and warm welcomes overlooking the azure sea as our wedding weekend commences.",
      attire: "Smart Casual / Cocktail Chic",
      googleMapsUrl: "https://maps.google.com/?q=Grand-Hôtel+du+Cap-Ferrat",
      order: 1,
    },
    {
      id: "wedding-ceremony",
      name: "Mass & Matrimony Ceremony",
      date: "Saturday, October 24, 2026",
      time: "4:00 PM — 5:15 PM",
      venue: "Chapelle Saint-Hospice",
      address: "Sentier de Saint-Hospice, 06230 Saint-Jean-Cap-Ferrat, France",
      description:
        "The sacred exchange of vows and holy nuptial blessing in an intimate historic 17th-century coastal sanctuary.",
      attire: "Black Tie Optional",
      googleMapsUrl: "https://maps.google.com/?q=Chapelle+Saint-Hospice+Saint-Jean-Cap-Ferrat",
      order: 2,
    },
    {
      id: "cocktails-reception",
      name: "Cocktail Hour & Grand Reception",
      date: "Saturday, October 24, 2026",
      time: "5:45 PM — 1:00 AM",
      venue: "Villa Ephrussi de Rothschild",
      address: "1 Avenue Ephrussi de Rothschild, 06230 Saint-Jean-Cap-Ferrat, France",
      description:
        "An enchanting evening among the Florentine gardens, followed by a multi-course French culinary dinner, toasts, live jazz, and dancing under the stars.",
      attire: "Black Tie / Formal Evening Attire",
      googleMapsUrl: "https://maps.google.com/?q=Villa+Ephrussi+de+Rothschild",
      order: 3,
    },
    {
      id: "farewell-brunch",
      name: "Farewell Riviera Brunch",
      date: "Sunday, October 25, 2026",
      time: "11:00 AM — 2:30 PM",
      venue: "Paloma Beach Restaurant",
      address: "1 Route de Sainte-Hospice, 06230 Saint-Jean-Cap-Ferrat, France",
      description:
        "Wrap up an unforgettable weekend with fresh seaside brunch, chilled champagne, and warm goodbyes with gentle sea breezes.",
      attire: "Resort Elegant / Summer Linens",
      googleMapsUrl: "https://maps.google.com/?q=Paloma+Beach+Saint-Jean-Cap-Ferrat",
      order: 4,
    },
  ],
  weddingParty: [
    {
      id: "maid-of-honor",
      name: "Eleanor Vance",
      role: "Maid of Honor",
      category: "bride",
      image:
        "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=800&q=80",
      description: "Sister of the bride, confidante, and lifelong partner in adventure.",
      order: 1,
    },
    {
      id: "best-man",
      name: "Julian Sterling",
      role: "Best Man",
      category: "groom",
      image:
        "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=800&q=80",
      description: "Brother of the groom, master of ceremonies, and steadfast brother.",
      order: 2,
    },
    {
      id: "bridesmaid-1",
      name: "Camille Dupont",
      role: "Bridesmaid",
      category: "bride",
      image:
        "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=800&q=80",
      description: "Sarah's closest university companion and world travel co-conspirator.",
      order: 3,
    },
    {
      id: "groomsman-1",
      name: "Marcus Thorne",
      role: "Groomsman",
      category: "groom",
      image:
        "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=800&q=80",
      description: "Alexander's close friend since secondary school and fellow architect.",
      order: 4,
    },
    {
      id: "bridesmaid-2",
      name: "Isabella Rossi",
      role: "Bridesmaid",
      category: "bride",
      image:
        "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=800&q=80",
      description: "Beloved cousin and kindred spirit in culinary and fine art passions.",
      order: 5,
    },
    {
      id: "groomsman-2",
      name: "David Chen",
      role: "Groomsman",
      category: "groom",
      image:
        "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=800&q=80",
      description: "Longtime mentor, business partner, and avid sailing companion.",
      order: 6,
    },
    {
      id: "mother-of-bride",
      name: "Genevieve Vance",
      role: "Mother of the Bride",
      category: "family",
      image:
        "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=800&q=80",
      description: "The pillar of grace, endless warmth, and wisdom in Sarah's life.",
      order: 7,
    },
    {
      id: "father-of-bride",
      name: "Arthur Vance",
      role: "Father of the Bride",
      category: "family",
      image:
        "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=800&q=80",
      description: "Sarah's guiding compass, source of humor, and devotion.",
      order: 8,
    },
    {
      id: "parents-of-groom",
      name: "Charles & Victoria Sterling",
      role: "Parents of the Groom",
      category: "family",
      image:
        "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=800&q=80",
      description: "Loving parents whose four decades of marriage inspire us every day.",
      order: 9,
    },
  ],
  gallery: [
    {
      id: "gal-1",
      imageUrl:
        "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=1200&q=85",
      caption: "Intimate evening stroll through the gardens of Cap-Ferrat",
      order: 1,
    },
    {
      id: "gal-2",
      imageUrl:
        "https://images.unsplash.com/photo-1522673607200-164d1b6ce486?auto=format&fit=crop&w=1200&q=85",
      caption: "The morning light over the Mediterranean cliffs",
      order: 2,
    },
    {
      id: "gal-3",
      imageUrl:
        "https://images.unsplash.com/photo-1606800052052-a08af7148866?auto=format&fit=crop&w=1200&q=85",
      caption: "A joyful moment after the surprise proposal",
      order: 3,
    },
    {
      id: "gal-4",
      imageUrl:
        "https://images.unsplash.com/photo-1515934751635-c81c6bc9a2d8?auto=format&fit=crop&w=1200&q=85",
      caption: "Antique gold wedding bands handcrafted in Florence",
      order: 4,
    },
    {
      id: "gal-5",
      imageUrl:
        "https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?auto=format&fit=crop&w=1200&q=85",
      caption: "Sunset over the French Riviera coast",
      order: 5,
    },
    {
      id: "gal-6",
      imageUrl:
        "https://images.unsplash.com/photo-1529636798458-92182e662485?auto=format&fit=crop&w=1200&q=85",
      caption: "Laughter and shared coffee in Montmartre",
      order: 6,
    },
    {
      id: "gal-7",
      imageUrl:
        "https://images.unsplash.com/photo-1546804784-896d0dca3805?auto=format&fit=crop&w=1200&q=85",
      caption: "Elegance in black tie for our engagement dinner",
      order: 7,
    },
    {
      id: "gal-8",
      imageUrl:
        "https://images.unsplash.com/photo-1537633552985-df8429e8048b?auto=format&fit=crop&w=1200&q=85",
      caption: "Flora and garden details at Villa Ephrussi",
      order: 8,
    },
  ],
  qa: [
    {
      id: "qa-1",
      question: "What time should we arrive for the ceremony?",
      answer:
        "We kindly request that guests arrive at Chapelle Saint-Hospice between 3:15 PM and 3:45 PM. The nuptial mass will commence promptly at 4:00 PM. Refreshments and welcome booklets will be provided upon your arrival.",
      order: 1,
    },
    {
      id: "qa-2",
      question: "What is the dress code for the weekend?",
      answer:
        "For Saturday's ceremony and grand reception, the dress code is Black Tie Optional. Gentlemen are encouraged to wear tuxedos or dark formal suits. Ladies are invited to wear floor-length evening gowns or elegant midi cocktail dresses. For the Friday Welcome Soirée, smart casual / cocktail chic is welcomed.",
      order: 2,
    },
    {
      id: "qa-3",
      question: "Is there transportation and parking available?",
      answer:
        "Complimentary chauffeur shuttles will be operating between the official partner hotels (Grand-Hôtel du Cap-Ferrat and Hotel Royal-Riviera) and the event venues throughout Friday evening and Saturday. Private valet parking is also available directly at Villa Ephrussi de Rothschild.",
      order: 3,
    },
    {
      id: "qa-4",
      question: "Are the ceremony and reception indoors or outdoors?",
      answer:
        "The ceremony at Chapelle Saint-Hospice will be held indoors. The cocktail hour following the ceremony will take place in the outdoor Florentine gardens overlooking the Mediterranean, followed by dinner and dancing in the sheltered covered pavilion. We recommend a light evening wrap or stole for the later hours.",
      order: 4,
    },
    {
      id: "qa-5",
      question: "Can I bring an additional guest or plus-one?",
      answer:
        "Due to the intimate venue capacity of the historic chapel and villa, we can only accommodate guests formally named on your invitation envelope. When you RSVP below, your party allocation will be clearly indicated.",
      order: 5,
    },
    {
      id: "qa-6",
      question: "How do I communicate dietary restrictions or allergies?",
      answer:
        "Our Michelin-trained catering team is delighted to prepare tailored dining experiences. Please select your entrée preferences and specify any dietary restrictions or severe allergies during your online RSVP below before September 15, 2026.",
      order: 6,
    },
  ],
  rsvpSettings: {
    enabled: true,
    deadlineDisplay: "September 15, 2026",
    maxPartySize: 4,
    mealOptionsEnabled: true,
    mealOptions: [
      {
        id: "filet-mignon",
        name: "Prime Black Angus Filet Mignon",
        description: "Truffle potato purée, glazed baby carrots, and rosemary red wine reduction.",
      },
      {
        id: "sea-bass",
        name: "Pan-Seared Chilean Sea Bass",
        description: "Saffron risotto, braised fennel, and champagne beurre blanc.",
      },
      {
        id: "risotto-veg",
        name: "Wild Morel & Chanterelle Risotto (V/GF)",
        description: "Aged Parmigiano-Reggiano crisps, herb oil, and toasted pine nuts.",
      },
    ],
    allowDietaryNotes: true,
    allowPersonalMessage: true,
    confirmationMessage:
      "Thank you for honoring us with your response. We cannot wait to celebrate this magical milestone with you in Saint-Jean-Cap-Ferrat.",
  },
  musicSettings: {
    trackTitle: "Clair de Lune (Nocturne)",
    artist: "Claude Debussy — Piano Solo",
    // Elegant royalty-free ambient classical piano mp3 URL with fallback
    audioUrl:
      "https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3?filename=clair-de-lune-piano-ambient-112194.mp3",
    loop: true,
  },
  footer: {
    closingMessage: "With immense love and gratitude, we look forward to celebrating together.",
    subtext: "Alexander & Sarah • October 24, 2026 • Saint-Jean-Cap-Ferrat",
  },
};
