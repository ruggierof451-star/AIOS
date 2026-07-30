import type { Metadata, Viewport } from 'next';
import { Inter, Space_Grotesk, JetBrains_Mono } from 'next/font/google';
import './globals.css';

const corpo = Inter({ subsets: ['latin'], weight: ['400', '500', '600'], variable: '--body' });
const display = Space_Grotesk({ subsets: ['latin'], weight: ['500', '600', '700'], variable: '--display' });
const mono = JetBrains_Mono({ subsets: ['latin'], weight: ['400', '500', '700'], variable: '--mono' });

export const metadata: Metadata = {
  title: 'AIOS',
  description: 'Il collega digitale della tua azienda.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#0A0E14',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it">
      <body className={`${corpo.variable} ${display.variable} ${mono.variable}`}>{children}</body>
    </html>
  );
}
