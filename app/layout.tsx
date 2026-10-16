import type { Metadata } from "next";
import { Cormorant_Garamond, Montserrat, Playfair_Display } from "next/font/google";
import "./globals.css";
import { MusicProvider } from "@/context/MusicContext";
import { FloatingMusicController } from "@/components/music/FloatingMusicController";
import { mockWeddingData } from "@/data/mockWedding";

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-cormorant",
  display: "swap",
});

const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-montserrat",
  display: "swap",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-playfair",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Alexander & Sarah | Wedding Celebration",
  description:
    "Private wedding invitation for the celebration of Alexander Sterling and Sarah Vance at Villa Ephrussi de Rothschild, Saint-Jean-Cap-Ferrat.",
  openGraph: {
    title: "Alexander & Sarah | Wedding Celebration",
    description: "You are warmly invited to celebrate the wedding of Alexander & Sarah.",
    images: [
      {
        url: mockWeddingData.hero.heroImage,
        width: 1200,
        height: 630,
        alt: "Alexander & Sarah Wedding Celebration",
      },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${cormorant.variable} ${montserrat.variable} ${playfair.variable} scroll-smooth`}
    >
      <body className="bg-ivory-100 text-charcoal-900 antialiased selection:bg-gold-400 selection:text-charcoal-950">
        <MusicProvider settings={mockWeddingData.musicSettings}>
          {children}
          <FloatingMusicController />
        </MusicProvider>
      </body>
    </html>
  );
}
