import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Aurelia & Sebastian — Digital Wedding Invitation & RSVP',
  description:
    'Together with their families, request the honour of your presence at the celebration of their marriage.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400;1,600&family=Montserrat:wght@300;400;500;600&family=Playfair+Display:ital,wght@0,400;0,500;0,600;1,400;1,600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-ivory text-charcoal selection:bg-softGold/25 selection:text-charcoal">
        {children}
      </body>
    </html>
  );
}
