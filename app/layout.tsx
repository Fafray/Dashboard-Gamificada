import type { Metadata } from "next";
import { Exo_2, Rajdhani } from "next/font/google";
import { Nav } from "@/components/Nav";
import "./globals.css";

const exo2 = Exo_2({
  subsets: ["latin"],
  variable: "--font-manrope",
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

const rajdhani = Rajdhani({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Sistema — Daily Quest",
  description: "RPG de hábitos — vire o protagonista da sua vida",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${exo2.variable} ${rajdhani.variable} h-full`}>
      <body className="h-full flex flex-col">
        <div className="aurora-bg" aria-hidden="true" />
        <div className="grain" aria-hidden="true" />
        <Nav />
        <main className="flex-1 overflow-y-auto" style={{ position: "relative", zIndex: 2, paddingRight: "80px" }}>
          {children}
        </main>
      </body>
    </html>
  );
}
