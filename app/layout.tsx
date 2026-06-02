import type { Metadata } from "next";
import { Manrope, Space_Grotesk } from "next/font/google";
import { Nav } from "@/components/Nav";
import "./globals.css";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Daily Quest",
  description: "Gamified activity tracker",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${manrope.variable} ${spaceGrotesk.variable} h-full`}>
      <body className="h-full flex flex-col">
        <div className="aurora-bg" aria-hidden="true" />
        <div className="grain" aria-hidden="true" />
        <Nav />
        <main className="flex-1 overflow-y-auto" style={{ position: "relative", zIndex: 2 }}>
          {children}
        </main>
      </body>
    </html>
  );
}
