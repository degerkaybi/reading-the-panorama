import React, { useRef, useState, useEffect } from "react";
import { Sparkles, HelpCircle, RefreshCw, ChevronLeft, ChevronRight } from "lucide-react";
import { getCardDateSlashLabel } from "../lib/reading-engine";

interface PanoramaSelectorProps {
  cards: number[];
  onSelectionComplete: (selectedIds: number[]) => void;
  maxSelection?: number;
}

export default function PanoramaSelector({ cards, onSelectionComplete, maxSelection = 3 }: PanoramaSelectorProps) {
  const [selected, setSelected] = useState<number[]>([]);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const handleCardClick = (id: number) => {
    if (selected.includes(id)) {
      setSelected(selected.filter((x) => x !== id));
    } else if (selected.length < maxSelection) {
      setSelected([...selected, id]);
    }
  };

  const getPositionLabel = (id: number) => {
    const idx = selected.indexOf(id);
    if (idx === -1) return null;
    if (maxSelection === 1) return "Presence";
    if (idx === 0) return "Past";
    if (idx === 1) return "Present";
    if (idx === 2) return "Future";
    return null;
  };

  const handleScroll = () => {
    const el = scrollContainerRef.current;
    if (el) {
      setCanScrollLeft(el.scrollLeft > 5);
      setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 5);
    }
  };

  const scroll = (direction: "left" | "right") => {
    const el = scrollContainerRef.current;
    if (el) {
      const scrollAmount = el.clientWidth * 0.75;
      el.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
    }
  };

  useEffect(() => {
    const el = scrollContainerRef.current;
    if (el) {
      el.addEventListener("scroll", handleScroll);
      // Initial check
      handleScroll();
      
      // Scroll to center initially to give a sense of length
      const centerScroll = (el.scrollWidth - el.clientWidth) / 2;
      el.scrollLeft = centerScroll;
    }
    return () => {
      if (el) el.removeEventListener("scroll", handleScroll);
    };
  }, []);

  const handleReset = () => {
    setSelected([]);
  };

  const handleConfirm = () => {
    if (selected.length === maxSelection) {
      onSelectionComplete(selected);
    }
  };

  const slots = maxSelection === 3 ? (["Past", "Present", "Future"] as const) : (["Presence"] as const);

  return (
    <div className="w-full max-w-7xl mx-auto flex flex-col items-center justify-center space-y-8 py-4">
      {/* Top Banner showing selection status */}
      <div className="w-full max-w-4xl glass-panel-glow rounded-xl p-6 flex flex-col md:flex-row items-center justify-between gap-6 px-8">
        <div className="flex flex-col space-y-1">
          <span className="text-xs uppercase tracking-widest text-gold-400 font-medium">Reading Status</span>
          <h2 className="text-lg text-neutral-300 font-light font-serif">
            {maxSelection === 3 ? "Select three moments from the timeline" : "Select a single moment from the timeline"}
          </h2>
        </div>

        {/* Selected slots display */}
        <div className="flex items-center gap-4">
          {slots.map((role, idx) => {
            const isAssigned = selected[idx] !== undefined;

            return (
              <div
                key={role}
                className={`relative w-24 h-16 rounded border flex flex-col items-center justify-center transition-all duration-700 ${
                  isAssigned
                    ? "border-gold-500/40 bg-gold-950/20"
                    : "border-neutral-800 bg-neutral-900/40 text-neutral-600"
                }`}
              >
                <span className="text-[10px] uppercase tracking-wider text-neutral-500 mb-1">{role}</span>
                {isAssigned ? (
                  <div
                    className="w-2.5 h-2.5 rounded-full bg-gold-400 shadow-[0_0_10px_#d4ac42] animate-pulse"
                  />
                ) : (
                  <HelpCircle className="w-4 h-4 stroke-[1.5]" />
                )}
                {isAssigned && (
                  <div
                    className="absolute inset-0 rounded border border-gold-400/20 shadow-[0_0_15px_rgba(190,144,46,0.15)] pointer-events-none animate-fade-in"
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3">
          {selected.length > 0 && (
            <button
              onClick={handleReset}
              className="p-3 text-neutral-400 hover:text-white hover:bg-neutral-900/60 rounded-full transition-all duration-300 border border-neutral-900 hover:border-neutral-800"
              title="Reset selection"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={handleConfirm}
            disabled={selected.length < maxSelection}
            className={`px-6 py-3 rounded-full text-xs uppercase tracking-widest font-semibold flex items-center gap-2 transition-all duration-700 ${
              selected.length === maxSelection
                ? "bg-gold-500 hover:bg-gold-400 text-neutral-950 shadow-[0_0_20px_rgba(190,144,46,0.25)] cursor-pointer"
                : "bg-neutral-900 text-neutral-500 border border-neutral-850 cursor-not-allowed"
            }`}
          >
            <Sparkles className="w-4 h-4" />
            Reveal Reading
          </button>
        </div>
      </div>

      {/* Main Horizontal Selector tape */}
      <div className="relative w-full overflow-hidden py-12 px-4">
        {/* Shadow Overlays to mask the scroll edges */}
        <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-neutral-950 to-transparent pointer-events-none z-10" />
        <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-neutral-950 to-transparent pointer-events-none z-10" />

        {/* Scroll Buttons */}
        {canScrollLeft && (
          <button
            onClick={() => scroll("left")}
            className="absolute left-6 top-1/2 -translate-y-1/2 p-3 bg-neutral-900/80 hover:bg-neutral-800/90 text-gold-300 hover:text-gold-200 border border-neutral-800 rounded-full z-20 transition-all duration-300 backdrop-blur"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        )}
        {canScrollRight && (
          <button
            onClick={() => scroll("right")}
            className="absolute right-6 top-1/2 -translate-y-1/2 p-3 bg-neutral-900/80 hover:bg-neutral-800/90 text-gold-300 hover:text-gold-200 border border-neutral-800 rounded-full z-20 transition-all duration-300 backdrop-blur"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        )}

        {/* The horizontal scrolling track */}
        <div
          ref={scrollContainerRef}
          className="w-full flex gap-4 overflow-x-auto scrollbar-none py-4 px-20 select-none scroll-smooth"
        >
          {cards.map((id) => {
            const isSelected = selected.includes(id);
            const position = getPositionLabel(id);
            const selectionIndex = selected.indexOf(id);

            return (
              <div
                key={id}
                onClick={() => handleCardClick(id)}
                className="flex-shrink-0 cursor-pointer"
              >
                <div
                  className={`relative w-64 h-36 rounded-lg overflow-hidden flex flex-col justify-between p-4 transform hover:-translate-y-2 hover:scale-[1.03] transition-all duration-500 ${
                    isSelected
                      ? "border border-gold-400 bg-gradient-to-b from-neutral-900 to-gold-950/20 shadow-[0_0_25px_rgba(190,144,46,0.2)]"
                      : "border border-neutral-800 bg-neutral-900/40 hover:border-gold-500/30 hover:bg-neutral-900/60 shadow-[0_4px_12px_rgba(0,0,0,0.3)]"
                  }`}
                >
                  {/* Obscured/Blurred core representation */}
                  <div className="absolute inset-0 bg-radial-gradient from-transparent to-black pointer-events-none opacity-40" />
                  
                  {/* Subtle pulsing background glow depending on selected or hover */}
                  <div
                    className={`absolute inset-0 bg-radial-gradient from-gold-500/5 to-transparent transition-opacity duration-700 ${
                      isSelected ? "opacity-100" : "opacity-0 hover:opacity-50"
                    }`}
                  />

                  {/* Noise layer inside card */}
                  <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-neutral-900/20 via-neutral-950/60 to-neutral-950 pointer-events-none" />

                  {/* Header of the card */}
                  <div className="flex justify-between items-center relative z-10 w-full px-1">
                    <span className="text-[9px] tracking-widest text-neutral-500 font-mono">PANORAMA</span>
                    <span className="text-[10px] font-mono text-neutral-400 font-medium">
                      {getCardDateSlashLabel(id)}
                    </span>
                  </div>

                  {/* Visual abstraction representing hidden landscape canvas */}
                  <div className="w-full flex items-center justify-center py-2 opacity-30 relative z-10">
                    <div
                      className={`w-16 h-10 rounded-lg border border-dashed flex items-center justify-center transition-all duration-700 ${
                        isSelected ? "border-gold-400/40 rotate-12 scale-105" : "border-neutral-700"
                      }`}
                    >
                      <div className="w-10 h-6 rounded-md border border-neutral-900 bg-neutral-950/40" />
                    </div>
                  </div>

                  {/* Bottom / Selection indicators */}
                  <div className="w-full flex flex-col items-center space-y-1 relative z-10 h-8 justify-center">
                    {isSelected ? (
                      <div className="flex flex-col items-center animate-fade-in">
                        <span className="text-[9px] uppercase tracking-widest text-gold-400 font-semibold font-sans">
                          {position}
                        </span>
                        <span className="text-[10px] text-neutral-400 font-mono font-medium">
                          Choice {selectionIndex + 1}
                        </span>
                      </div>
                    ) : (
                      <span className="text-[9px] uppercase tracking-widest text-neutral-500 hover:text-gold-400 transition-colors duration-300">
                        Select
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="text-center max-w-md text-xs text-neutral-500 font-light leading-relaxed">
        {maxSelection === 3
          ? "Let your fingers slide across the timeline. Focus on your query, listen to the silent hum, and select the three positions that call to you."
          : "Let your fingers slide across the timeline. Focus on your query, listen to the silent hum, and select the single position that calls to you."}
      </div>
    </div>
  );
}
