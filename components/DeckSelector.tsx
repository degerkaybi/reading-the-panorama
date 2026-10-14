"use client";

import React from "react";
import { ArrowRight, Layers } from "lucide-react";
import { DeckSeason, getCdnImageUrl, SEASONS } from "../lib/reading-engine";

interface DeckSelectorProps {
  onSelect: (season: DeckSeason) => void;
}

const deckStyles: Record<DeckSeason, {
  numeral: string;
  accentText: string;
  border: string;
  glow: string;
  button: string;
}> = {
  1: {
    numeral: "I",
    accentText: "text-gold-300",
    border: "hover:border-gold-400/60 focus-visible:border-gold-400/60",
    glow: "from-gold-500/30 via-transparent to-neutral-950",
    button: "bg-gold-500 text-neutral-950",
  },
  2: {
    numeral: "II",
    accentText: "text-violet-300",
    border: "hover:border-violet-400/60 focus-visible:border-violet-400/60",
    glow: "from-violet-500/30 via-transparent to-neutral-950",
    button: "bg-violet-500 text-neutral-950",
  },
};

export default function DeckSelector({ onSelect }: DeckSelectorProps) {
  const seasons: DeckSeason[] = [1, 2];

  return (
    <div className="w-full max-w-5xl mx-auto px-5 sm:px-6 space-y-8 flex flex-col items-center animate-fade-in">
      <div className="space-y-3 text-center">
        <span className="text-xs uppercase tracking-[0.24em] text-gold-400 font-medium flex items-center justify-center gap-2">
          <Layers className="w-3.5 h-3.5" />
          Choose Your Deck
        </span>
        <h1 className="text-3xl sm:text-4xl font-serif font-light text-neutral-100">
          Which collection speaks to you?
        </h1>
        <p className="text-sm text-neutral-400 font-light leading-relaxed max-w-xl mx-auto">
          Choose a season to begin your reading. Each collection carries its own visual language.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-1 sm:gap-6 md:grid-cols-2 w-full">
        {seasons.map((season) => {
          const info = SEASONS[season];
          const styles = deckStyles[season];
          const coverImage = getCdnImageUrl(info.cardRange[0], season);

          return (
            <button
              key={season}
              type="button"
              onClick={() => onSelect(season)}
              className={`group relative min-h-[300px] sm:min-h-[390px] overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-900/40 text-left shadow-[0_24px_70px_rgba(0,0,0,0.35)] transition-all duration-500 hover:-translate-y-1 hover:shadow-[0_30px_90px_rgba(0,0,0,0.5)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 ${styles.border}`}
              aria-label={`Choose ${info.label}`}
            >
              <img
                src={coverImage}
                alt={`${info.label} first Panorama artwork`}
                className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/45 to-black/10" />
              <div className={`absolute inset-0 bg-gradient-to-br ${styles.glow} opacity-35 transition-opacity duration-500 group-hover:opacity-55`} />

              <div className="relative z-10 flex min-h-[300px] sm:min-h-[390px] flex-col justify-between p-3 sm:p-7">
                <div className="flex flex-col items-start gap-2 sm:flex-row sm:justify-between sm:gap-4">
                  <span className={`flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-black/35 font-serif text-lg backdrop-blur ${styles.accentText}`}>
                    {styles.numeral}
                  </span>
                  <span className="rounded-full border border-white/15 bg-black/35 px-2 py-1.5 text-[8px] sm:px-3 sm:text-[9px] uppercase tracking-[0.1em] sm:tracking-[0.2em] text-neutral-200 backdrop-blur">
                    Tableau {String(info.cardRange[0]).padStart(2, "0")}–{info.cardRange[1]}
                  </span>
                </div>

                <div className="space-y-4">
                  <div>
                    <h2 className="text-2xl sm:text-3xl font-serif font-light text-white drop-shadow-lg">
                      {info.label}
                    </h2>
                    <p className={`mt-1 text-[9px] sm:text-[11px] font-mono uppercase tracking-[0.08em] sm:tracking-[0.2em] ${styles.accentText}`}>
                      {info.artist}<span className="hidden sm:inline"> · </span><span className="block sm:inline">{info.handle}</span>
                    </p>
                  </div>

                  <div className={`inline-flex items-center gap-1 sm:gap-2 rounded-full px-2.5 sm:px-4 py-2.5 text-[9px] sm:text-[10px] font-semibold uppercase tracking-[0.04em] sm:tracking-[0.18em] transition-transform duration-300 group-hover:translate-x-1 ${styles.button}`}>
                    <span className="sm:hidden">Choose deck</span><span className="hidden sm:inline">Begin with this deck</span>
                    <ArrowRight className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
