"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Compass, ArrowLeft, ArrowRight, MessageSquare, RotateCcw } from "lucide-react";
import Link from "next/link";

// Components
import PanoramaSelector from "../../components/PanoramaSelector";
import PanoramaReveal from "../../components/PanoramaReveal";
import ReadingCard from "../../components/ReadingCard";
import ReadingSynthesis from "../../components/ReadingSynthesis";

// Reading Engine
import { getTableauById } from "../../lib/reading-engine";
import { ReadingResult } from "../../types/reading";

type FlowState = "question" | "shuffling" | "selection" | "reveal" | "synthesizing" | "result";

export default function ReadingFlowPage() {
  const [flowState, setFlowState] = useState<FlowState>("question");
  const [readingMode, setReadingMode] = useState<"three" | "single">("single");
  const [question, setQuestion] = useState("");
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [shuffledIds, setShuffledIds] = useState<number[]>([]);
  const [isShufflingAnimating, setIsShufflingAnimating] = useState(false);
  const [readingResult, setReadingResult] = useState<ReadingResult | null>(null);
  const [readingSource, setReadingSource] = useState<"live" | null>(null);
  const [usedModel, setUsedModel] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);

  // Transition: Question -> Shuffling
  const handleQuestionSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!question.trim()) return;
    setFlowState("shuffling");
  };

  const triggerShuffle = () => {
    setIsShufflingAnimating(true);
    
    // Load previously selected card IDs from localStorage to exclude them
    let excludedIds: number[] = [];
    try {
      const stored = localStorage.getItem("previousSelectedIds");
      if (stored) {
        excludedIds = JSON.parse(stored);
      }
    } catch (e) {
      console.error("Failed to parse previousSelectedIds from localStorage:", e);
    }

    // Generate list of 0-90, excluding the previously selected IDs
    const arr = Array.from({ length: 91 }, (_, i) => i).filter(id => !excludedIds.includes(id));
    
    // Shuffle the list
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    setShuffledIds(arr);

    // Play shuffling animation, then transition to selection state
    setTimeout(() => {
      setIsShufflingAnimating(false);
      setFlowState("selection");
    }, 2800);
  };

  // Transition: Selection Complete -> Reveal
  const handleSelectionComplete = (ids: number[]) => {
    setSelectedIds(ids);
    setFlowState("reveal");
  };

  // Transition: Reveal Complete -> Synthesizing -> Result
  const handleRevealComplete = () => {
    setFlowState("synthesizing");
  };

  useEffect(() => {
    if (flowState === "synthesizing") {
      let isMounted = true;

      const performReading = async () => {
        setApiError(null);
        try {
          console.log("Triggering reading API (/api/read) for question:", question, "selectedIds:", selectedIds);
          const response = await fetch("/api/read", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ question, selectedIds }),
          });

          console.log("Response status from /api/read:", response.status);
          if (response.ok) {
            const text = await response.text();
            let data: any = null;
            if (text && text.trim()) {
              try {
                data = JSON.parse(text);
              } catch (parseErr) {
                console.error("Failed to parse API response JSON:", parseErr);
              }
            }
            console.log("Response body from /api/read:", data);
            if (data && data.success && isMounted) {
              console.log("Successfully generated live AI reading!");
              setReadingResult(data.reading);
              setReadingSource("live");
              setUsedModel(data.modelUsed || "openrouter/auto");
              
              // Exclude these selected IDs from appearing in the next shuffle session
              try {
                localStorage.setItem("previousSelectedIds", JSON.stringify(selectedIds));
              } catch (e) {
                console.error("Failed to save selectedIds to localStorage:", e);
              }
              
              setFlowState("result");
              return;
            } else {
              const reason = (data && data.reason) || "unknown";
              console.error("API route returned success: false. Reason:", reason);
              if (isMounted) {
                setApiError(`AI okuma başarısız oldu (${reason}). Lütfen tekrar deneyin.`);
                setFlowState("result");
              }
            }
          } else {
            console.error("API route returned non-200 status:", response.status);
            if (isMounted) {
              setApiError(`Sunucu hatası (${response.status}). Lütfen tekrar deneyin.`);
              setFlowState("result");
            }
          }
        } catch (err: any) {
          console.error("Failed to generate reading via AI API:", err);
          if (isMounted) {
            setApiError(`Bağlantı hatası: ${err?.message || "Bilinmeyen hata"}. Lütfen tekrar deneyin.`);
            setFlowState("result");
          }
        }
      };

      performReading();

      return () => {
        isMounted = false;
      };
    }
  }, [flowState, question, selectedIds]);

  const handleRestart = () => {
    setQuestion("");
    setSelectedIds([]);
    setShuffledIds([]);
    setReadingResult(null);
    setReadingSource(null);
    setUsedModel(null);
    setApiError(null);
    setFlowState("question");
  };

  const handleRetry = () => {
    setApiError(null);
    setReadingResult(null);
    setFlowState("synthesizing");
  };

  return (
    <div className="flex-grow flex flex-col min-h-screen bg-neutral-950 text-neutral-100">
      {/* Header bar */}
      <header className="w-full py-6 px-6 md:px-12 flex justify-between items-center border-b border-neutral-950/80 bg-neutral-950/50 backdrop-blur z-30 sticky top-0">
        <Link
          href="/"
          className="flex items-center gap-2.5 text-neutral-400 hover:text-white transition-colors duration-300 group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          <span className="text-[10px] uppercase tracking-widest font-mono">Exit Reading</span>
        </Link>

        <div className="flex items-center gap-2">
          <Compass className="w-5 h-5 text-gold-500 animate-pulse" />
          <span className="text-xs uppercase tracking-widest font-semibold font-serif text-glow-gold">
            Reading the Panorama
          </span>
        </div>

        <div>
          {flowState !== "question" && flowState !== "synthesizing" && (
            <button
              onClick={handleRestart}
              className="flex items-center gap-1.5 text-neutral-500 hover:text-neutral-300 text-xs font-mono transition-colors duration-300"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Restart</span>
            </button>
          )}
        </div>
      </header>

      {/* Main Flow Canvas */}
      <div className="flex-grow flex flex-col justify-center py-8">
        {/* STATE 1: QUESTION */}
        {flowState === "question" && (
          <div
            key="question"
            className="w-full max-w-xl mx-auto px-6 space-y-8 flex flex-col animate-fade-in"
          >
            <div className="space-y-3 text-center">
              <span className="text-xs uppercase tracking-widest text-gold-400 font-medium">Formulate Inquiry</span>
              <h2 className="text-3xl font-serif font-light text-neutral-100">
                What would you like the Panorama to help you see more clearly?
              </h2>
              <p className="text-sm text-neutral-400 font-light leading-relaxed">
                Enter a question, a dilemma, or a focus area. The Panorama acts as a witness, providing space to deepen your query.
              </p>
            </div>

            {/* Reading Mode Selector */}
            <div className="flex flex-col space-y-3">
              <span className="text-[10px] uppercase tracking-widest text-neutral-500 font-mono text-center block">
                Choose Reading Style
              </span>
              <div className="flex justify-center gap-3">
                <button
                  type="button"
                  onClick={() => setReadingMode("single")}
                  className={`px-5 py-2.5 rounded-full text-[10px] uppercase tracking-widest font-semibold transition-all duration-500 border ${
                    readingMode === "single"
                      ? "bg-gold-500/10 border-gold-500/50 text-gold-300 shadow-[0_0_20px_rgba(190,144,46,0.1)]"
                      : "bg-neutral-900/30 border-neutral-900 text-neutral-500 hover:text-neutral-300 hover:border-neutral-850"
                  }`}
                >
                  Single Tableau
                </button>
                <button
                  type="button"
                  onClick={() => setReadingMode("three")}
                  className={`px-5 py-2.5 rounded-full text-[10px] uppercase tracking-widest font-semibold transition-all duration-500 border ${
                    readingMode === "three"
                      ? "bg-gold-500/10 border-gold-500/50 text-gold-300 shadow-[0_0_20px_rgba(190,144,46,0.1)]"
                      : "bg-neutral-900/30 border-neutral-900 text-neutral-500 hover:text-neutral-300 hover:border-neutral-850"
                  }`}
                >
                  Three Tableaus (Past, Present, Future)
                </button>
              </div>
            </div>

            <form onSubmit={handleQuestionSubmit} className="space-y-6">
              <div className="relative">
                <textarea
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && e.shiftKey) {
                      e.preventDefault();
                      if (question.trim()) {
                        handleQuestionSubmit();
                      }
                    }
                  }}
                  rows={4}
                  placeholder="Example: I have important decisions to make about my life and I need clarity..."
                  className="w-full px-6 py-5 bg-neutral-900/40 hover:bg-neutral-900/60 focus:bg-neutral-900/80 rounded-xl border border-neutral-800 focus:border-gold-500/50 focus:ring-0 focus:outline-none text-neutral-200 text-sm font-light leading-relaxed placeholder-neutral-600 transition-all duration-300 resize-none"
                />
                <div className="absolute bottom-4 right-4 text-[10px] font-mono text-neutral-600">
                  Press Shift+Enter to send
                </div>
              </div>

              <div className="flex flex-col items-center gap-4">
                <button
                  type="submit"
                  disabled={!question.trim()}
                  className={`w-full sm:w-auto px-8 py-3.5 rounded-full text-xs uppercase tracking-widest font-semibold flex items-center justify-center gap-2 transition-all duration-700 ${
                    question.trim()
                      ? "bg-gold-500 hover:bg-gold-400 text-neutral-950 cursor-pointer shadow-[0_0_20px_rgba(190,144,46,0.15)]"
                      : "bg-neutral-900 text-neutral-500 border border-neutral-850 cursor-not-allowed"
                  }`}
                >
                  Continue with Question
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>
          </div>
        )}

        {/* STATE 2: SHUFFLING */}
        {flowState === "shuffling" && (
          <div
            key="shuffling"
            className="w-full max-w-xl mx-auto px-6 space-y-12 flex flex-col items-center justify-center text-center py-10 animate-fade-in"
          >
            <div className="space-y-3">
              <span className="text-xs uppercase tracking-widest text-gold-400 font-medium">Sacred Preparation</span>
              <h2 className="text-3xl font-serif font-light text-neutral-100">
                Shuffle the Panorama
              </h2>
              <p className="text-sm text-neutral-400 font-light leading-relaxed">
                Mix the 91 tableaus of the Panorama. Let them dissolve their chronological order, allowing you to choose purely by intuition.
              </p>
            </div>

            {/* Elegant Shuffling Pile Animation */}
            <div className="relative w-72 h-44 flex items-center justify-center">
              {Array.from({ length: 8 }).map((_, idx) => {
                const xOffset = isShufflingAnimating
                  ? (idx % 2 === 0 ? -120 - Math.random() * 40 : 120 + Math.random() * 40)
                  : (idx - 4) * 2;
                const rotateOffset = isShufflingAnimating
                  ? (idx % 2 === 0 ? -25 - Math.random() * 15 : 25 + Math.random() * 15)
                  : (idx - 4) * 2;
                const zIndex = isShufflingAnimating ? Math.floor(Math.random() * 10) : idx;

                return (
                  <div
                    key={idx}
                    style={{
                      zIndex,
                      transform: `translate(${xOffset}px, 0px) rotate(${rotateOffset}deg) scale(${isShufflingAnimating ? 0.95 : 1})`,
                      transition: `transform 0.8s cubic-bezier(0.16, 1, 0.3, 1)`,
                      transitionDelay: `${idx * 0.02}s`
                    }}
                    className="absolute w-56 h-32 rounded-lg border border-gold-500/10 bg-gradient-to-b from-neutral-900 via-neutral-950 to-neutral-950 shadow-[0_0_15px_rgba(0,0,0,0.4)] flex flex-col justify-between p-3"
                  >
                    {/* Minimal card back look */}
                    <div className="absolute top-1.5 left-1.5 w-2 h-2 border-t border-l border-gold-500/20 rounded-tl" />
                    <div className="absolute top-1.5 right-1.5 w-2 h-2 border-t border-r border-gold-500/20 rounded-tr" />
                    <div className="absolute bottom-1.5 left-1.5 w-2 h-2 border-b border-l border-gold-500/20 rounded-bl" />
                    <div className="absolute bottom-1.5 right-1.5 w-2 h-2 border-b border-r border-gold-500/20 rounded-br" />
                    <div className="w-full flex justify-between items-center opacity-10">
                      <span className="text-[6px] font-mono">PANORAMA</span>
                      <span className="text-[6px] font-mono">??</span>
                    </div>
                    <div className="w-6 h-6 rounded-full border border-gold-500/10 mx-auto flex items-center justify-center opacity-20">
                      <div className="w-2 h-2 rounded-full bg-gold-500/10" />
                    </div>
                    <div className="w-full text-center opacity-10">
                      <span className="text-[6px] font-mono">TABLEAU</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Shuffling Button */}
            <div className="space-y-4">
              <button
                type="button"
                onClick={triggerShuffle}
                disabled={isShufflingAnimating}
                className={`px-10 py-4 bg-gradient-to-r from-gold-600 to-gold-500 hover:from-gold-500 hover:to-gold-400 text-neutral-950 font-sans font-semibold text-xs uppercase tracking-widest rounded-full shadow-[0_0_30px_rgba(190,144,46,0.2)] flex items-center gap-3 transition-all duration-300 ${
                  isShufflingAnimating ? "opacity-50 cursor-not-allowed scale-95" : "hover:scale-[1.02] cursor-pointer"
                }`}
              >
                {isShufflingAnimating ? "Mixing Tableaus..." : "Shuffle the Timeline"}
              </button>
              
              {isShufflingAnimating && (
                <p className="text-xs text-gold-300 italic font-light opacity-60 animate-fade-in">
                  Distributing moments across the canvas...
                </p>
              )}
            </div>
          </div>
        )}

        {/* STATE 3: SELECTION */}
        {flowState === "selection" && (
          <div key="selection" className="animate-fade-in">
            <PanoramaSelector
              cards={shuffledIds}
              onSelectionComplete={handleSelectionComplete}
              maxSelection={readingMode === "single" ? 1 : 3}
            />
          </div>
        )}

        {/* STATE 3: REVEAL */}
        {flowState === "reveal" && (
          <div key="reveal" className="animate-fade-in">
            <PanoramaReveal
              selectedIds={selectedIds}
              getTableau={getTableauById}
              onRevealComplete={handleRevealComplete}
            />
          </div>
        )}

        {/* STATE 4: SYNTHESIZING (Dramatic Transition) */}
        {flowState === "synthesizing" && (
          <div
            key="synthesizing"
            className="flex-grow flex flex-col justify-center items-center py-20 animate-fade-in"
          >
            <div className="space-y-6 text-center max-w-sm px-6">
              <div className="relative w-16 h-16 mx-auto flex items-center justify-center">
                <div className="absolute inset-0 rounded-full border-2 border-neutral-900" />
                <div className="absolute inset-0 rounded-full border-t-2 border-gold-500 animate-spin" />
                <Compass className="w-6 h-6 text-gold-400/80 stroke-[1.2]" />
              </div>
              <div className="space-y-2">
                <span className="text-[10px] uppercase tracking-widest text-gold-500 font-semibold font-mono">
                  Synthesizing Narrative
                </span>
                <p className="text-sm text-neutral-400 font-light leading-relaxed">
                  The Panorama is analyzing the visual echoes, shifts in light, and spatial relationships between your selected tableaus...
                </p>
              </div>
            </div>
          </div>
        )}

        {/* STATE 5: RESULT - Error */}
        {flowState === "result" && apiError && !readingResult && (
          <div
            key="error"
            className="flex-grow flex flex-col justify-center items-center py-20 animate-fade-in"
          >
            <div className="space-y-6 text-center max-w-md px-6">
              <div className="relative w-16 h-16 mx-auto flex items-center justify-center">
                <div className="absolute inset-0 rounded-full border-2 border-red-900/40" />
                <span className="text-2xl">⚠️</span>
              </div>
              <div className="space-y-3">
                <span className="text-[10px] uppercase tracking-widest text-red-400 font-semibold font-mono">
                  Okuma Başarısız
                </span>
                <p className="text-sm text-neutral-400 font-light leading-relaxed">
                  {apiError}
                </p>
              </div>
              <div className="flex gap-3 justify-center pt-4">
                <button
                  onClick={handleRetry}
                  className="px-6 py-3 bg-gold-500 hover:bg-gold-400 text-neutral-950 font-sans font-semibold text-xs uppercase tracking-widest rounded-full shadow-[0_0_20px_rgba(190,144,46,0.2)] transition-all duration-300"
                >
                  Tekrar Dene
                </button>
                <button
                  onClick={handleRestart}
                  className="px-6 py-3 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 font-sans font-semibold text-xs uppercase tracking-widest rounded-full border border-neutral-800 transition-all duration-300"
                >
                  Baştan Başla
                </button>
              </div>
            </div>
          </div>
        )}

        {/* STATE 5: RESULT - Success */}
        {flowState === "result" && readingResult && (
          <div
            key="result"
            className="w-full flex flex-col space-y-20 py-4 animate-fade-in"
          >
            {/* Reading Header */}
            <div className="w-full max-w-4xl mx-auto px-6 text-center space-y-4">
              <span className="text-xs uppercase tracking-widest text-gold-400 font-semibold font-mono block">
                The Synthesized Reading
              </span>
              <h1 className="text-4xl sm:text-5xl font-serif text-neutral-100 font-light">
                {readingResult.question ? "Your Guided Reading" : "The Silent Panorama Assembly"}
              </h1>
              
              {/* Reading Source Badge - Hidden from UI */}
              {false && readingSource === "live" && (
                <div className="flex justify-center mt-2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[9px] font-mono font-semibold uppercase tracking-wider text-emerald-400 bg-emerald-950/30 border border-emerald-500/20 rounded-full shadow-[0_0_15px_rgba(16,185,129,0.05)]">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    AI Live Reading ({usedModel})
                  </span>
                </div>
              )}

              {readingResult.question ? (
                <div className="inline-flex items-center gap-3 px-6 py-3 bg-neutral-900/40 rounded-xl border border-neutral-900/60 max-w-2xl text-left mt-2 mx-auto">
                  <MessageSquare className="w-4 h-4 text-gold-500 flex-shrink-0" />
                  <p className="text-xs text-neutral-300 font-light italic leading-normal">
                    &quot;{readingResult.question}&quot;
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
                  {readingResult.cards.Single
                    ? "The Chosen Tableau"
                    : "Stage 1 & 2: Individual Interpretations"}
                </h3>
              </div>

              {readingResult.cards.Single ? (
                <ReadingCard card={readingResult.cards.Single} />
              ) : (
                <>
                  {readingResult.cards.Past && <ReadingCard card={readingResult.cards.Past} />}
                  {readingResult.cards.Present && <ReadingCard card={readingResult.cards.Present} />}
                  {readingResult.cards.Future && <ReadingCard card={readingResult.cards.Future} />}
                </>
              )}
            </div>

            {/* Synthesis & Final Reflection Section */}
            <ReadingSynthesis result={readingResult} onRestart={handleRestart} />
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="w-full text-center flex flex-col items-center gap-1.5 pb-8 pt-4 z-20">
        <span className="text-[10px] uppercase tracking-widest text-neutral-600 font-mono">
          <a
            href="https://www.panorama.garden"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-neutral-400 transition-colors"
          >
            panorama.garden
          </a>{" "}
          • Tableau 00–90
        </span>
        <span className="text-[8px] uppercase tracking-widest text-neutral-700 font-mono">
          built by{" "}
          <a
            href="https://x.com/kaybidsteps"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-neutral-500 transition-colors underline decoration-neutral-700/50 underline-offset-2"
          >
            Kaybid
          </a>
        </span>
      </div>
    </div>
  );
}
