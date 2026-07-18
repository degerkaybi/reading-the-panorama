import "./globals.css";
import React from "react";
import type { Metadata } from "next";
import { Cormorant_Garamond, Inter } from "next/font/google";

const cormorantGaramond = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["300", "400", "600"],
  style: ["normal", "italic"],
  variable: "--font-serif-custom",
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-sans-custom",
});

export const metadata: Metadata = {
  title: "Reading the Panorama — A Symbolic Reading Experience",
  description:
    "An experimental, cinematic symbolic reading experience inspired by archetypal traditions, designed to witness transitions and patterns in your life.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`dark scroll-smooth ${cormorantGaramond.variable} ${inter.variable}`}>
      <body className="antialiased min-h-screen bg-neutral-950 text-neutral-100 selection:bg-gold-500/25 selection:text-gold-200">
        <div className="grain-overlay" />
        <main className="relative z-10 min-h-screen flex flex-col">
          {children}
        </main>
      </body>
    </html>
  );
}
