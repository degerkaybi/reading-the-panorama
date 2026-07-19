"use client";

import React, { useState } from "react";
import { ReadingResult } from "../types/reading";
import { Sparkles, HelpCircle, Compass, ArrowRight, Share2, Check } from "lucide-react";

interface ReadingSynthesisProps {
  result: ReadingResult;
  onRestart: () => void;
}

export default function ReadingSynthesis({ result, onRestart }: ReadingSynthesisProps) {
  const [shareState, setShareState] = useState<"idle" | "loading" | "copied" | "error">("idle");
  const [shareUrl, setShareUrl] = useState<string | null>(null);

  const handleShare = async () => {
    if (shareState === "loading") return;

    if (shareUrl) {
      try {
        await navigator.clipboard.writeText(shareUrl);
        setShareState("copied");
        setTimeout(() => setShareState("idle"), 2000);
      } catch (err) {
        console.error("Failed to copy link:", err);
        setShareState("error");
      }
      return;
    }

    setShareState("loading");
    try {
      const response = await fetch("/api/share", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(result),
      });

      if (!response.ok) throw new Error("Failed to share");

      const data = await response.json();
      const url = `${window.location.origin}/share/${data.id}`;
      setShareUrl(url);

      await navigator.clipboard.writeText(url);
      setShareState("copied");
      setTimeout(() => setShareState("idle"), 2000);
    } catch (error) {
      console.error("Failed to create share link:", error);
      setShareState("error");
      setTimeout(() => setShareState("idle"), 3000);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-16 py-12 px-4">
      {/* 1. Relationship Analysis & Flow */}
      {!result.cards.Single && (
        <section
          className="space-y-6 animate-fade-in"
        >
          <div className="flex items-center gap-3">
            <Compass className="w-5 h-5 text-gold-400" />
            <h4 className="text-xs uppercase tracking-widest text-gold-400 font-semibold font-mono">
              Stage 3: Relationship Analysis
            </h4>
          </div>
          <div className="border-l border-neutral-850 pl-6 space-y-4">
            <h3 className="text-2xl font-serif text-neutral-200 font-light">
              Visual Echoes & Atmospheric Shifts
            </h3>
            <p className="text-neutral-300 font-light leading-relaxed text-base">
              {result.relationshipAnalysis}
            </p>
          </div>
        </section>
      )}

      {/* 2. Coherent Synthesis */}
      <section
        className="space-y-6 animate-fade-in"
        style={{ animationDelay: "0.1s" }}
      >
        <div className="flex items-center gap-3">
          <Sparkles className="w-5 h-5 text-gold-400" />
          <h4 className="text-xs uppercase tracking-widest text-gold-400 font-semibold font-mono">
            {result.cards.Single ? "Narrative Synthesis" : "Stage 4: Narrative Synthesis"}
          </h4>
        </div>
        <div className="border-l border-neutral-850 pl-6 space-y-4">
          <h3 className="text-2xl font-serif text-neutral-200 font-light">
            The Transformative Arc
          </h3>
          <p className="text-neutral-300 font-light leading-relaxed text-base whitespace-pre-line">
            {result.synthesis}
          </p>
        </div>
      </section>

      {/* 3. Final Reflection Panels */}
      <section
        className="space-y-8 border-t border-neutral-900 pt-12 animate-fade-in"
        style={{ animationDelay: "0.2s" }}
      >
        <div className="text-center space-y-2">
          <h4 className="text-xs uppercase tracking-widest text-neutral-500 font-semibold font-mono">
            {result.cards.Single ? "Final Reflections" : "Stage 5: Final Reflections"}
          </h4>
          <h3 className="text-3xl font-serif font-light text-neutral-100">
            What is Revealed
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
          {/* Sees */}
          <div className="glass-panel rounded-xl p-6 flex flex-col justify-between space-y-4 hover:border-neutral-800 transition-colors duration-500">
            <div className="space-y-2">
              <span className="text-[10px] uppercase tracking-widest text-neutral-500 font-mono block">
                What the Panorama sees
              </span>
              <p className="text-sm text-neutral-300 font-light leading-relaxed">
                {result.whatSees}
              </p>
            </div>
            <div className="w-8 h-[1px] bg-neutral-800 mt-2" />
          </div>

          {/* Asks */}
          <div className="glass-panel-glow rounded-xl p-6 flex flex-col justify-between space-y-4 border-gold-500/20 shadow-[0_0_30px_rgba(190,144,46,0.02)] hover:border-gold-500/30 transition-all duration-500">
            <div className="space-y-2">
              <span className="text-[10px] uppercase tracking-widest text-gold-400 font-mono block">
                What the Panorama asks
              </span>
              <p className="text-sm text-gold-100 font-light italic leading-relaxed">
                {result.whatAsks}
              </p>
            </div>
            <div className="w-8 h-[1px] bg-gold-500/30 mt-2" />
          </div>

          {/* Invitation */}
          <div className="glass-panel rounded-xl p-6 flex flex-col justify-between space-y-4 hover:border-neutral-800 transition-colors duration-500">
            <div className="space-y-2">
              <span className="text-[10px] uppercase tracking-widest text-neutral-500 font-mono block">
                The Panorama's invitation
              </span>
              <p className="text-sm text-neutral-300 font-light leading-relaxed">
                {result.invitation}
              </p>
            </div>
            <div className="w-8 h-[1px] bg-neutral-800 mt-2" />
          </div>
        </div>
      </section>

      {/* CTA Buttons */}
      <div
        className="flex flex-col sm:flex-row justify-center items-center gap-4 pt-8 animate-fade-in"
      >
        <button
          onClick={handleShare}
          disabled={shareState === "loading"}
          className={`px-8 py-3 rounded-full font-mono text-xs uppercase tracking-widest transition-all duration-300 flex items-center gap-2 border cursor-pointer min-w-[200px] justify-center ${
            shareState === "copied"
              ? "bg-emerald-950/80 border-emerald-500/50 text-emerald-400"
              : shareState === "error"
              ? "bg-red-950/80 border-red-500/50 text-red-400"
              : "bg-gold-500 hover:bg-gold-400 text-neutral-950 border-gold-500 font-semibold shadow-[0_0_20px_rgba(190,144,46,0.15)]"
          }`}
        >
          {shareState === "idle" && (
            <>
              <Share2 className="w-4 h-4" />
              Share Reading
            </>
          )}
          {shareState === "loading" && (
            <>
              <div className="w-4 h-4 border-2 border-neutral-950 border-t-transparent rounded-full animate-spin" />
              Generating Link...
            </>
          )}
          {shareState === "copied" && (
            <>
              <Check className="w-4 h-4" />
              Link Copied!
            </>
          )}
          {shareState === "error" && <>Failed to Share</>}
        </button>

        <button
          onClick={onRestart}
          className="px-8 py-3 bg-neutral-900 hover:bg-neutral-850 text-neutral-400 hover:text-white border border-neutral-850 rounded-full font-mono text-xs uppercase tracking-widest transition-all duration-300 flex items-center gap-2 cursor-pointer min-w-[200px] justify-center"
        >
          Begin a New Reading
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
