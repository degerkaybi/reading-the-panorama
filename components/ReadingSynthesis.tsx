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

  const copyToClipboard = async (text: string): Promise<boolean> => {
    if (typeof navigator !== "undefined" && navigator.clipboard && navigator.clipboard.writeText) {
      try {
        await navigator.clipboard.writeText(text);
        return true;
      } catch (err) {
        console.warn("Navigator clipboard failed, trying fallback...", err);
      }
    }

    try {
      const textArea = document.createElement("textarea");
      textArea.value = text;
      textArea.style.position = "fixed";
      textArea.style.top = "0";
      textArea.style.left = "0";
      textArea.style.opacity = "0";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      const successful = document.execCommand("copy");
      document.body.removeChild(textArea);
      return successful;
    } catch (err) {
      console.error("Fallback copy failed:", err);
      return false;
    }
  };

  const handleShare = async () => {
    if (shareState === "loading") return;

    if (shareUrl) {
      const copied = await copyToClipboard(shareUrl);
      if (copied) {
        setShareState("copied");
        setTimeout(() => setShareState("idle"), 2000);
      } else {
        setShareState("error");
        setTimeout(() => setShareState("idle"), 3000);
      }
      return;
    }

    setShareState("loading");
    try {
      // 1. Extract only the essential dynamic fields to minimize storage size
      const cardsPayload: Record<string, any> = {};
      for (const [role, card] of Object.entries(result.cards)) {
        if (card) {
          cardsPayload[role] = {
            id: card.selectedId,
            ci: card.contextualInterpretation,
            pi: card.positionalInterpretation,
          };
        }
      }

      const payload = {
        q: result.question,
        ra: result.relationshipAnalysis,
        sy: result.synthesis,
        ws: result.whatSees,
        wa: result.whatAsks,
        in: result.invitation,
        c: cardsPayload,
      };

      // 2. Post the payload to /api/share
      const response = await fetch("/api/share", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to share: Status ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      
      // 3. Form the short URL using the returned ID
      const url = `${window.location.origin}/share/${data.id}`;
      setShareUrl(url);

      const copied = await copyToClipboard(url);
      if (copied) {
        setShareState("copied");
        setTimeout(() => setShareState("idle"), 2000);
      } else {
        // Still mark as copied because the URL is now displayed on screen
        setShareState("copied");
        setTimeout(() => setShareState("idle"), 2000);
      }
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
      <div className="flex flex-col items-center gap-6 pt-8">
        <div
          className="flex flex-col sm:flex-row justify-center items-center gap-4 animate-fade-in w-full"
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

        {shareUrl && (
          <div className="w-full max-w-lg bg-neutral-900/40 border border-neutral-900/80 p-3 rounded-xl flex items-center justify-between gap-3 text-xs mt-2 animate-fade-in font-mono shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]">
            <span className="text-neutral-400 truncate select-all pl-1">{shareUrl}</span>
            <button
              onClick={async () => {
                const copied = await copyToClipboard(shareUrl);
                if (copied) {
                  setShareState("copied");
                  setTimeout(() => setShareState("idle"), 2000);
                }
              }}
              className="text-gold-400 hover:text-gold-300 font-mono text-[10px] uppercase tracking-wider font-semibold cursor-pointer whitespace-nowrap bg-neutral-950/60 border border-neutral-850 px-3 py-1.5 rounded hover:border-gold-500/30 transition-all duration-300"
            >
              Copy
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
