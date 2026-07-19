import React, { useRef, useState, useEffect } from "react";
import { Sparkles, HelpCircle, RefreshCw, ChevronLeft, ChevronRight } from "lucide-react";


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

  // Mouse drag scrolling state
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [dragged, setDragged] = useState(false);

  const handleMouseDown = (e: React.MouseEvent) => {
    const el = scrollContainerRef.current;
    if (!el) return;
    setIsDragging(true);
    setDragged(false);
    setStartX(e.pageX - el.offsetLeft);
    setScrollLeft(el.scrollLeft);
  };

  const handleMouseLeave = () => {
    setIsDragging(false);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    e.preventDefault();
    const el = scrollContainerRef.current;
    if (!el) return;
    const x = e.pageX - el.offsetLeft;
    const walk = (x - startX) * 2.2; // Scroll speed multiplier
    if (Math.abs(walk) > 5) {
      setDragged(true);
    }
    el.scrollLeft = scrollLeft - walk;
  };

  const handleCardClick = (id: number) => {
    if (dragged) return; // Prevent selection if dragging occurred
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
      handleScroll();
      
      // Start scroll from 0 (left-most position)
      el.scrollLeft = 0;
      
      // After a short delay, smoothly scroll to center to indicate that dragging/scrolling is possible
      const timer = setTimeout(() => {
        const centerScroll = (el.scrollWidth - el.clientWidth) / 2;
        el.scrollTo({
          left: centerScroll,
          behavior: "smooth",
        });
      }, 500);

      return () => {
        el.removeEventListener("scroll", handleScroll);
        clearTimeout(timer);
      };
    }
  }, []);

  const handleReset = () => {
    setSelected([]);
  };

  const handleConfirm = () => {
    if (selected.length === maxSelection) {
      onSelectionComplete(selected);
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto flex flex-col items-center justify-center space-y-4 py-4">
      {/* Centered Minimalist Header */}
      <div className="text-center flex flex-col space-y-1 mb-2 animate-fade-in">
        <h2 className="text-xl text-neutral-200 font-serif font-light tracking-wide">
          {maxSelection === 3 ? "Select Three Moments" : "Select Your Moment"}
        </h2>
        <p className="text-[11px] text-gold-400/80 uppercase tracking-widest font-medium">
          {maxSelection === 3 ? "Timeline of Past, Present, and Future" : "Your Current Presence"}
        </p>
      </div>

      {/* Main Horizontal Selector tape */}
      <div className="relative w-full overflow-hidden py-8 px-4">
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
          onMouseDown={handleMouseDown}
          onMouseLeave={handleMouseLeave}
          onMouseUp={handleMouseUp}
          onMouseMove={handleMouseMove}
          className={`w-full flex gap-4 overflow-x-auto scrollbar-none py-6 px-20 select-none ${
            isDragging ? "cursor-grabbing" : "cursor-grab"
          }`}
        >
          {cards.map((id) => {
            const isSelected = selected.includes(id);
            const position = getPositionLabel(id);
            const selectionIndex = selected.indexOf(id);

            return (
              <div
                key={id}
                onClick={() => handleCardClick(id)}
                className="relative flex-shrink-0 cursor-pointer py-6"
              >
                {isSelected && (
                  <div className="absolute top-0 left-1/2 transform -translate-x-1/2 text-xs font-serif tracking-widest uppercase text-gold-400 font-semibold drop-shadow-[0_0_10px_rgba(212,172,66,0.5)] animate-fade-in">
                    {position}
                  </div>
                )}
                <div
                  className={`relative w-48 h-28 rounded-lg overflow-hidden flex flex-col justify-between p-3 transform hover:-translate-y-1 hover:scale-[1.03] transition-all duration-500 ${
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
                  <div className="relative z-10 w-full px-1 flex justify-start">
                    <span className="text-[8px] tracking-widest text-neutral-500 font-mono">PANORAMA</span>
                  </div>

                  {/* Visual abstraction representing hidden landscape canvas */}
                  <div className="w-full flex items-center justify-center py-1.5 opacity-30 relative z-10">
                    <div
                      className={`w-12 h-8 rounded-lg border border-dashed flex items-center justify-center transition-all duration-700 ${
                        isSelected ? "border-gold-400/40 rotate-12 scale-105" : "border-neutral-700"
                      }`}
                    >
                      <div className="w-8 h-5 rounded-md border border-neutral-900 bg-neutral-950/40" />
                    </div>
                  </div>

                  {/* Bottom / Selection indicators */}
                  <div className="w-full flex flex-col items-center space-y-0.5 relative z-10 h-6 justify-center">
                    {isSelected ? (
                      <span className="text-[9px] text-neutral-400 font-mono font-medium animate-fade-in">
                        Choice {selectionIndex + 1}
                      </span>
                    ) : (
                      <span className="text-[8px] uppercase tracking-widest text-neutral-500 hover:text-gold-400 transition-colors duration-300">
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

      {/* Action Controls & Info */}
      <div className="flex flex-col items-center gap-6 mt-4 z-20">
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
            className={`px-8 py-3.5 rounded-full text-xs uppercase tracking-widest font-semibold flex items-center gap-2 transition-all duration-700 ${
              selected.length === maxSelection
                ? "bg-gold-500 hover:bg-gold-400 text-neutral-950 shadow-[0_0_25px_rgba(190,144,46,0.3)] cursor-pointer scale-105"
                : "bg-neutral-900 text-neutral-500 border border-neutral-850 cursor-not-allowed"
            }`}
          >
            <Sparkles className="w-4 h-4" />
            Reveal Reading
          </button>
        </div>

        <div className="text-center max-w-md text-xs text-neutral-500 font-light leading-relaxed px-4">
          {maxSelection === 3
            ? "Let your fingers slide across the timeline. Focus on your query, listen to the silent hum, and select the three positions that call to you."
            : "Let your fingers slide across the timeline. Focus on your query, listen to the silent hum, and select the single position that calls to you."}
        </div>
      </div>
    </div>
  );
}
