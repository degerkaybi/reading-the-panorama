"use client";

import React from "react";
import { ReadingResult } from "../../../types/reading";
import ReadingCard from "../../../components/ReadingCard";
import ReadingSynthesis from "../../../components/ReadingSynthesis";
import { MessageSquare, Compass } from "lucide-react";
import Link from "next/link";

interface SharedReadingClientProps {
  result: ReadingResult;
}

export default function SharedReadingClient({ result }: SharedReadingClientProps) {
  const handleRestart = () => {
    window.location.href = "/";
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 relative">
      <div className="max-w-7xl mx-auto px-4 py-12 md:py-20 flex flex-col space-y-16">
        {/* Header/Logo */}
        <div className="w-full flex justify-between items-center max-w-4xl mx-auto px-6 border-b border-neutral-900 pb-6">
          <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <Compass className="w-6 h-6 text-gold-500" />
            <span className="font-serif font-light tracking-widest text-lg text-white">PANAROMA</span>
          </Link>
          <span className="text-[10px] font-mono text-neutral-500 uppercase tracking-widest">
            Shared Reading
          </span>
        </div>

        {/* Reading Header */}
        <div className="w-full max-w-4xl mx-auto px-6 text-center space-y-4">
          <span className="text-xs uppercase tracking-widest text-gold-400 font-semibold font-mono block animate-fade-in">
            A Shared Journey
          </span>
          <h1 className="text-4xl sm:text-5xl font-serif text-neutral-100 font-light">
            {result.question ? "Your Guided Reading" : "The Silent Panorama Assembly"}
          </h1>

          {result.question ? (
            <div className="inline-flex items-center gap-3 px-6 py-3 bg-neutral-900/40 rounded-xl border border-neutral-900/60 max-w-2xl text-left mt-2 mx-auto">
              <MessageSquare className="w-4 h-4 text-gold-500 flex-shrink-0" />
              <p className="text-xs text-neutral-300 font-light italic leading-normal">
                &quot;{result.question}&quot;
              </p>
            </div>
          ) : (
            <p className="text-xs text-neutral-500 font-mono mt-2">
              Inquiry submitted in silence.
            </p>
          )}
        </div>

        {/* Individual Readings Section */}
        <div className="w-full flex flex-col space-y-12 px-4">
          <div className="text-center">
            <h3 className="text-xs uppercase tracking-widest text-neutral-500 font-mono">
              {result.cards.Single
                ? "The Chosen Tableau"
                : "Stage 1 & 2: Individual Interpretations"}
            </h3>
          </div>

          {result.cards.Single ? (
            <ReadingCard card={result.cards.Single} />
          ) : (
            <div className="w-full flex flex-col space-y-12">
              {result.cards.Past && <ReadingCard card={result.cards.Past} />}
              {result.cards.Present && <ReadingCard card={result.cards.Present} />}
              {result.cards.Future && <ReadingCard card={result.cards.Future} />}
            </div>
          )}
        </div>

        {/* Synthesis & Final Reflection Section */}
        <ReadingSynthesis result={result} onRestart={handleRestart} />
      </div>
    </div>
  );
}
