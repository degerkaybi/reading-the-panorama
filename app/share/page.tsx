"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { ReadingResult, PositionRole, CardReading } from "../../types/reading";
import { getTableauById } from "../../lib/reading-engine";
import ReadingCard from "../../components/ReadingCard";
import ReadingSynthesis from "../../components/ReadingSynthesis";
import { MessageSquare, Compass, Loader2 } from "lucide-react";
import Link from "next/link";

const base64ToUint8Array = (base64: string): Uint8Array => {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
};

const decompressString = async (base64: string): Promise<string> => {
  const bytes = base64ToUint8Array(base64);
  const stream = new Blob([bytes as any]).stream();
  const decompressedStream = stream.pipeThrough(new DecompressionStream("deflate"));
  return await new Response(decompressedStream).text();
};

function ShareContent() {
  const searchParams = useSearchParams();
  const [result, setResult] = useState<ReadingResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const dataParam = searchParams.get("data");
    if (!dataParam) {
      setError("No reading data found in the link.");
      return;
    }

    const decompress = async () => {
      try {
        const jsonStr = await decompressString(dataParam);
        const payload = JSON.parse(jsonStr);

        const cards: Partial<Record<PositionRole, CardReading>> = {};
        for (const [role, compCard] of Object.entries(payload.c)) {
          if (compCard) {
            const tableau = getTableauById((compCard as any).id);
            cards[role as PositionRole] = {
              tableau,
              selectedId: (compCard as any).id,
              role: role as PositionRole,
              contextualInterpretation: (compCard as any).ci,
              positionalInterpretation: (compCard as any).pi,
            };
          }
        }

        const decodedResult: ReadingResult = {
          question: payload.q,
          relationshipAnalysis: payload.ra,
          synthesis: payload.sy,
          whatSees: payload.ws,
          whatAsks: payload.wa,
          invitation: payload.in,
          cards,
        };

        setResult(decodedResult);
      } catch (err) {
        console.error("Failed to decode share link:", err);
        setError("The share link is invalid or corrupted.");
      }
    };

    decompress();
  }, [searchParams]);

  const handleRestart = () => {
    window.location.href = "/";
  };

  if (error) {
    return (
      <div className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center p-6 text-center space-y-6">
        <Compass className="w-12 h-12 text-gold-500/50 animate-pulse" />
        <h1 className="text-2xl font-serif text-neutral-200">Unable to Load Reading</h1>
        <p className="text-sm text-neutral-400 max-w-md">{error}</p>
        <Link href="/" className="px-6 py-2.5 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 rounded-full border border-neutral-800 text-xs font-mono uppercase tracking-wider transition-colors duration-300">
          Return Home
        </Link>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center p-6 text-center space-y-4">
        <Loader2 className="w-8 h-8 text-gold-500 animate-spin" />
        <p className="text-xs text-neutral-500 font-mono uppercase tracking-widest animate-pulse">
          Assembling Panorama...
        </p>
      </div>
    );
  }

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

export default function SharePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center p-6 text-center space-y-4">
        <Loader2 className="w-8 h-8 text-gold-500 animate-spin" />
        <p className="text-xs text-neutral-500 font-mono uppercase tracking-widest">
          Loading...
        </p>
      </div>
    }>
      <ShareContent />
    </Suspense>
  );
}
