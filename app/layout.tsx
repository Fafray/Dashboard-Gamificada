import type { Metadata, Viewport } from "next";
import { Manrope, Space_Grotesk, Cormorant_Garamond, Spectral, Playfair_Display, Source_Serif_4 } from "next/font/google";
import { Nav } from "@/components/Nav";
import { ServiceWorkerSetup } from "@/components/ServiceWorkerSetup";
import "./globals.css";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-cormorant",
  display: "swap",
});

const spectral = Spectral({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-spectral",
  display: "swap",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-playfair",
  display: "swap",
});

const sourceSerif = Source_Serif_4({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-source-serif",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Sistema — Daily Quest",
  description: "RPG de hábitos — vire o protagonista da sua vida",
  manifest: "/manifest.json",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "Daily Quest" },
  icons: {
    apple: "/characters/e-rank.jpg.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#7c3aed",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${manrope.variable} ${spaceGrotesk.variable} ${cormorant.variable} ${spectral.variable} ${playfair.variable} ${sourceSerif.variable}`}>
      <body className="flex flex-col">
        <div className="aurora-bg" aria-hidden="true" />
        <div className="grain" aria-hidden="true" />
        <ServiceWorkerSetup />
        <Nav />
        <main className="flex-1 main-content">
          {children}
        </main>
      </body>
    </html>
  );
}
