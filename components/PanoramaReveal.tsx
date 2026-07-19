import React from "react";
import { ArrowRight } from "lucide-react";
import { PanoramaTableau } from "../types/panorama";
import { PositionRole } from "../types/reading";
import { getCardDateSlashLabel } from "../lib/reading-engine";

interface PanoramaRevealProps {
  selectedIds: number[];
  getTableau: (id: number) => PanoramaTableau;
  onRevealComplete: () => void;
}


export default function PanoramaReveal({
  selectedIds,
  getTableau,
  onRevealComplete,
}: PanoramaRevealProps) {
  // Cards are revealed by default (skip flip animation)
  const revealed: Record<PositionRole, boolean> = {
    Past: true,
    Present: true,
    Future: true,
    Single: true,
  };

  const roles: PositionRole[] = selectedIds.length === 3 ? ["Past", "Present", "Future"] : ["Single"];

  const isAllRevealed = roles.every((role) => revealed[role]);

  const getActiveRole = () => {
    for (const role of roles) {
      if (!revealed[role]) return role;
    }
    return null;
  };

  const activeRole = getActiveRole();

  return (
    <div className="w-full max-w-5xl mx-auto flex flex-col items-center justify-center space-y-12 py-8">
      {/* Title / Status */}
      <div className="text-center space-y-3 max-w-xl">
        <span className="text-xs uppercase tracking-widest text-gold-400 font-medium">The Unveiling</span>
        <h2 className="text-3xl font-light font-serif text-glow-gold text-neutral-100">
          {activeRole ? `Turn your attention to the ${activeRole}` : "The Tableau is Assembled"}
        </h2>
        <p className="text-sm text-neutral-400 font-light leading-relaxed">
          {activeRole
            ? `Select the card representing your ${activeRole.toLowerCase()} to allow it to speak.`
            : roles.length === 3
            ? "All three moments have witnessed your query. You are ready to receive the reading."
            : "The tableau has witnessed your query. You are ready to receive the reading."}
        </p>
      </div>

      {/* Cards container */}
      <div className={roles.length === 3 ? "grid grid-cols-1 md:grid-cols-3 gap-0 w-full max-w-5xl px-4" : "flex justify-center w-full max-w-md px-4"}>
        {roles.map((role, idx) => {
          const id = selectedIds[idx];
          const tableau = getTableau(id);

          return (
            /* Card Container showing revealed artwork directly */
            <div
              key={role}
              className="relative w-full aspect-[1.6] md:aspect-[1.2] p-2"
            >
              <div className="relative w-full h-full rounded-xl border border-gold-400/30 bg-neutral-900 overflow-hidden">
                {/* Tableau Image */}
                <img
                  src={tableau.imageUrl}
                  alt={tableau.title}
                  className="w-full h-full object-cover transition-transform duration-1000 hover:scale-105"
                />

                {/* Dark Vignette Overlay */}
                <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-gradient-to-t from-black via-black/40 to-transparent pointer-events-none" />

                {/* Card Info Overlay */}
                <div className="absolute bottom-0 left-0 right-0 p-4 flex flex-col space-y-1.5 z-10">
                  <div className="flex justify-between items-center text-[9px] font-mono text-gold-400">
                    <span className="font-semibold">{role.toUpperCase()}</span>
                    <span>{getCardDateSlashLabel(id)}</span>
                  </div>
                  <h3 className="text-base font-serif font-light text-white leading-tight">
                    {tableau.title}
                  </h3>
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] text-neutral-400 uppercase tracking-widest font-mono">
                      {tableau.coreVerb}
                    </span>
                    <span className="w-1 h-1 rounded-full bg-neutral-800" />
                    <span className="text-[9px] text-gold-500/80 uppercase tracking-widest font-mono">
                      Essence
                    </span>
                  </div>
                  <p className="text-[11px] text-neutral-300 font-light italic leading-normal line-clamp-2">
                    "{tableau.coreEssence}"
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Complete CTA Button */}
      {isAllRevealed && (
        <div className="pt-6 animate-fade-in">
          <button
            onClick={onRevealComplete}
            className="px-8 py-4 bg-gradient-to-r from-gold-600 to-gold-500 hover:from-gold-500 hover:to-gold-400 text-neutral-950 font-sans font-semibold text-xs uppercase tracking-widest rounded-full shadow-[0_0_30px_rgba(190,144,46,0.3)] flex items-center gap-3 hover:scale-[1.03] transition-all duration-300"
          >
            Enter the Interpretation
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
