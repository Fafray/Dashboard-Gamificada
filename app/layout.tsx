import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Nav } from "@/components/Nav";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Daily Quest",
  description: "Gamified activity tracker",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${geistSans.variable} ${geistMono.variable} h-full`}>
      <body className="h-full flex flex-col" style={{ background: "var(--bg-base)", color: "var(--text-primary)" }}>
        <Nav />
        <main className="flex-1 overflow-y-auto">{children}</main>
      </body>
    </html>
  );
}
