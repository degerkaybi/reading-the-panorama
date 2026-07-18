import React, { useState, useEffect } from "react";
import { CardReading } from "../types/reading";
import { Info, Compass, ChevronDown, ChevronUp, Eye, FileText, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface ReadingCardProps {
  card: CardReading;
}

export default function ReadingCard({ card }: ReadingCardProps) {
  const { tableau, selectedId, role, contextualInterpretation, positionalInterpretation } = card;
  const [showMetadata, setShowMetadata] = useState(false);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  // Esc key closes lightbox when open
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsLightboxOpen(false);
      }
    };
    if (isLightboxOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isLightboxOpen]);

  // Clean the title from the mapped mockup suffix
  const cleanTitle = tableau.title.replace(/\(Tableau #\d+\)/, "");

  return (
    <div
      className="w-full max-w-5xl mx-auto glass-panel rounded-2xl overflow-hidden shadow-2xl border border-neutral-900 animate-fade-in"
    >
      <div className="flex flex-col w-full">
        {/* Top: Widescreen Image - Cinematic Protagonist */}
        <div 
          onClick={() => setIsLightboxOpen(true)}
          className="relative w-full aspect-video md:aspect-[21/9] overflow-hidden group cursor-zoom-in"
        >
          <img
            src={tableau.imageUrl}
            alt={tableau.title}
            className="w-full h-full object-cover transition-transform duration-[2000ms] group-hover:scale-105"
          />

          {/* Subtle vignette/gradient overlays */}
          <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-gradient-to-t from-neutral-950 via-neutral-950/40 to-transparent pointer-events-none" />

          {/* Position Tag on Top Left */}
          <div className="absolute top-6 left-6 px-4 py-1.5 bg-neutral-950/80 backdrop-blur border border-gold-500/30 rounded-full">
            <span className="text-[10px] uppercase tracking-widest text-gold-300 font-semibold">
              {role}
            </span>
          </div>

          {/* ID indicator bottom-left */}
          <div className="absolute bottom-6 left-6 flex flex-col">
            <span className="text-[10px] font-mono text-neutral-400">PANORAMA</span>
            <span className="text-3xl font-serif text-white font-light text-glow">
              #{String(selectedId).padStart(2, "0")}
            </span>
          </div>
        </div>

        {/* Bottom: Interpretation & Permanent voice */}
        <div className="p-8 md:p-12 flex flex-col justify-between bg-neutral-950/40 space-y-8">
          <div className="space-y-6">
            {/* Header */}
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <span className="text-xs uppercase tracking-widest text-gold-500 font-semibold font-mono">
                  {tableau.coreVerb}
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-neutral-800" />
                <span className="text-xs text-neutral-400 font-mono">
                  Sample template #{tableau.id}
                </span>
              </div>
              <h3 className="text-3xl font-serif font-light text-neutral-100 tracking-wide">
                {cleanTitle}
              </h3>
            </div>

            {/* Positional and Contextual Readings */}
            <div className="space-y-4 text-neutral-300 font-light leading-relaxed">
              <p className="text-sm border-l border-gold-500/30 pl-4 py-1 italic bg-gold-950/5">
                {positionalInterpretation}
              </p>
              <p className="text-base text-neutral-200">
                {contextualInterpretation}
              </p>
            </div>
          </div>

          {/* Collapsible Permanent Voice (Metadata) */}
          <div className="border-t border-neutral-900 pt-6">
            <button
              onClick={() => setShowMetadata(!showMetadata)}
              className="flex items-center justify-between w-full text-xs uppercase tracking-widest text-neutral-400 hover:text-gold-400 transition-colors duration-300 py-2"
            >
              <span className="flex items-center gap-2 font-mono">
                <Compass className="w-4 h-4 text-gold-500" />
                Permanent Symbolic Identity
              </span>
              {showMetadata ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {showMetadata && (
              <div
                className="mt-6 space-y-6 overflow-hidden animate-fade-in"
              >
                {/* Core values */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="space-y-1 bg-neutral-900/30 p-3 rounded border border-neutral-900">
                    <span className="text-neutral-500 font-mono block">CORE ESSENCE</span>
                    <p className="text-neutral-300 font-light">{tableau.coreEssence}</p>
                  </div>
                  <div className="space-y-1 bg-neutral-900/30 p-3 rounded border border-neutral-900">
                    <span className="text-neutral-500 font-mono block">CENTRAL TENSION</span>
                    <p className="text-neutral-300 font-light">{tableau.centralTension}</p>
                  </div>
                  <div className="space-y-1 bg-neutral-900/30 p-3 rounded border border-neutral-900">
                    <span className="text-neutral-500 font-mono block">TRANSFORMATION FROM</span>
                    <p className="text-neutral-300 font-light">{tableau.transformation.from}</p>
                  </div>
                  <div className="space-y-1 bg-neutral-900/30 p-3 rounded border border-neutral-900">
                    <span className="text-neutral-500 font-mono block">TRANSFORMATION TO</span>
                    <p className="text-neutral-300 font-light">{tableau.transformation.to}</p>
                  </div>
                </div>

                {/* Archetypes & Symbols */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs border-t border-neutral-900/60 pt-4">
                  <div className="space-y-2">
                    <span className="text-neutral-500 font-mono block">PRIMARY ARCHETYPES</span>
                    <div className="flex flex-wrap gap-1.5">
                      {tableau.primaryArchetypes.map((arch) => (
                        <span key={arch} className="px-2 py-1 bg-neutral-900 border border-neutral-850 rounded text-neutral-300">
                          {arch}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <span className="text-neutral-500 font-mono block">KEY SYMBOLS</span>
                    <div className="flex flex-wrap gap-1.5">
                      {tableau.symbols.map((sym) => (
                        <span key={sym} className="px-2 py-1 bg-neutral-900 border border-neutral-850 rounded text-neutral-300">
                          {sym}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Light & Shadow Expressions */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs border-t border-neutral-900/60 pt-4">
                  <div className="space-y-1 bg-emerald-950/5 p-3 rounded border border-emerald-900/10">
                    <span className="text-emerald-500 font-mono block">LIGHT EXPRESSION</span>
                    <p className="text-neutral-300 font-light">{tableau.lightExpression}</p>
                  </div>
                  <div className="space-y-1 bg-red-950/5 p-3 rounded border border-red-900/10">
                    <span className="text-red-400 font-mono block">SHADOW EXPRESSION</span>
                    <p className="text-neutral-300 font-light">{tableau.shadowExpression}</p>
                  </div>
                </div>

                {/* Tarot Resonance */}
                <div className="text-xs bg-neutral-900/20 p-3 rounded border border-neutral-900/40">
                  <span className="text-neutral-500 font-mono block mb-1">INTERPRETIVE RESONANCES (TAROT)</span>
                  <div className="flex flex-wrap gap-2 text-gold-300 font-light">
                    {tableau.tarotResonances.map((res, i) => (
                      <span key={res}>
                        {res}
                        {i < tableau.tarotResonances.length - 1 && <span className="text-neutral-800 ml-2">|</span>}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Observations */}
                <div className="space-y-3 text-xs border-t border-neutral-900/60 pt-4">
                  <div className="space-y-1">
                    <span className="text-neutral-500 font-mono flex items-center gap-1.5">
                      <Eye className="w-3.5 h-3.5" /> Visual Composition Notes
                    </span>
                    <ul className="list-disc list-inside text-neutral-400 space-y-1 font-light pl-1">
                      {tableau.visualObservations.map((obs, i) => (
                        <li key={i}>{obs}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="space-y-1">
                    <span className="text-neutral-500 font-mono flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5" /> Generation Prompt Observations
                    </span>
                    <ul className="list-disc list-inside text-neutral-400 space-y-1 font-light pl-1">
                      {tableau.promptObservations.map((obs, i) => (
                        <li key={i}>{obs}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Original Prompt */}
                <div className="text-xs bg-neutral-950 p-4 rounded border border-neutral-900/60 font-light">
                  <span className="text-neutral-500 font-mono block mb-1">ORIGINAL GENERATION PROMPT</span>
                  <p className="text-neutral-400 italic font-mono text-[11px] leading-relaxed select-all">
                    "{tableau.originalPrompt}"
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isLightboxOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsLightboxOpen(false)}
            className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/95 backdrop-blur-xl cursor-zoom-out p-4 md:p-10 select-none"
          >
            {/* Close button */}
            <button
              onClick={() => setIsLightboxOpen(false)}
              className="absolute top-6 right-6 p-3 text-neutral-400 hover:text-white rounded-full bg-neutral-900/50 hover:bg-neutral-800/80 border border-neutral-800 transition-all duration-300 cursor-pointer shadow-lg"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Cinematic Image container */}
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="relative max-w-6xl max-h-[80vh] w-full flex items-center justify-center cursor-zoom-out"
            >
              <img
                src={tableau.imageUrl}
                alt={tableau.title}
                className="max-w-full max-h-[75vh] object-contain rounded-lg shadow-[0_0_50px_rgba(0,0,0,0.8)] border border-neutral-900 cursor-zoom-out"
              />
              
              {/* Image Info Overlay (subtle at the bottom) */}
              <div className="absolute -bottom-16 left-0 right-0 text-center px-4 pointer-events-none">
                <span className="text-[10px] uppercase tracking-widest text-gold-400 font-mono block mb-1">
                  {role} • Tableau #{selectedId}
                </span>
                <h4 className="text-lg font-serif font-light text-neutral-200">
                  {cleanTitle}
                </h4>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
