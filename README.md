# Luxury Digital Wedding Invitation & RSVP Management System

A complete, responsive, editorial-grade digital wedding invitation and household RSVP management platform built with **Next.js (App Router)**, **TypeScript**, **Tailwind CSS**, **Framer Motion**, **Zod**, and **Firebase Admin SDK / Cloud Firestore** (with a persistent local server database fallback for offline/Java-free local development).

---

## 1. Quick Start (Local Development)

```bash
# 1. Install dependencies
npm install

# 2. Start the development server
npm run dev

# 3. Run TypeScript checks & automated security/functional test suite
npm run typecheck
npm test

# 4. Run production build
npm run build
```

- **Public Wedding Invitation**: `http://localhost:3000`
- **Personalized Invitation URL Fragment Entry**: `http://localhost:3000/invite#PERERA-2026`
- **Admin Dashboard Login**: `http://localhost:3000/admin/login`
  - **Default Local Admin Email**: `organizer@luxurywedding.example`
  - **Default Local Admin Password**: `LuxuryWedding!2026`

---

## 2. Sample Household Invitation Codes (Local Seed Dataset)

| Household Name | Category | Invited Members | +1 Allowance | Sample Code | Initial RSVP State |
|---|---|---|---|---|---|
| **The Perera Family** | Family | Mr. Perera, Mrs. Perera, Kasun Perera, Nethmi Perera (4) | 1 | `PERERA-2026` | Attending (3 attending, 1 unable) |
| **Lady Eleanor Vance** | Individual | Lady Eleanor Vance (1) | 1 | `VANCE-SOLO` | Attending (with 1 additional guest) |
| **Dr. Julian & Mrs. Clara Sterling** | Couple | Dr. Julian Sterling, Mrs. Clara Sterling (2) | 0 | `STERLING-DUO` | Attending (both attending) |
| **The Kensington Household** | Group | 5 Invited Members | 2 | `KENSINGTON-5` | Pending RSVP |
| **Lord & Lady Ashworth** | Couple | Lord Henry Ashworth, Lady Margot Ashworth (2) | 0 | `ASHWORTH-DEC` | Declined RSVP |
| **The De Silva Family** | Family | Mr. Rohan De Silva, Mrs. Anushka De Silva, Devika De Silva (3) | 2 | `DESILVA-FAM` | Pending RSVP |
| **Mr. Adrian Thorne** | Individual | Mr. Adrian Thorne (1) | 0 | `REVOKED-9999` | Revoked (Rejected on verification) |

---

## 3. Firestore Data Architecture (12 Logical Collections)

1. `wedding_settings` (`global`) — Global RSVP toggles, deadlines, meal options, section visibility, and invitation access settings.
2. `wedding_content` (`main`) — Editable couple names, monogram, ceremony date/time, hero & portrait URLs, formal invitation message, hosts, audio URL, and footer copy.
3. `events` — Ordered ceremony, reception, homecoming, and custom events with Google Maps directions links.
4. `story_entries` — Ordered editorial milestones with dates, captions, narratives, and photographs.
5. `gallery_images` — Uploaded gallery photographs with captions, alt text, and display order.
6. `wedding_party` — Custom-role wedding party attendants and family hosts.
7. `faqs` — Ordered accordion Q&A entries rendered immediately before the footer.
8. `households` — Household invitation records with stable member IDs, capacity allowances, and `HMAC-SHA256` invitation code digests (`codeDigest`, `codeKeyVersion`). Plaintext codes are never stored in the database.
9. `rsvps` — Household RSVP responses with per-member attendance, meal selections, additional guests, contact details, personal messages, and monotonic `version` counter for optimistic concurrency.
10. `idempotency_records` — Request hashes and cached responses keyed by household and `Idempotency-Key` to prevent duplicate mutations.
11. `admin_users` — Authorized administrator accounts and roles.
12. `revoked_invitations` — Revoked invitation code digests ensuring immediate invalidation of any prior code or session.

