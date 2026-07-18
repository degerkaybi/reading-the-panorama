import React from "react";
import Link from "next/link";
import { Compass, Sparkles } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="flex-grow flex flex-col justify-center items-center px-6 py-20 relative overflow-hidden">
      {/* Abstract Background Glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-gold-900/5 rounded-full blur-[120px] pointer-events-none animate-pulse-slow" />
      <div className="absolute bottom-10 left-1/4 w-[300px] h-[300px] bg-neutral-900/40 rounded-full blur-[100px] pointer-events-none" />

      <div className="w-full max-w-2xl text-center space-y-12 relative z-10">
        {/* Logo/Icon */}
        <div className="flex justify-center">
          <div className="p-4 rounded-full border border-gold-500/20 bg-gold-950/5 shadow-[0_0_30px_rgba(190,144,46,0.05)]">
            <Compass className="w-8 h-8 text-gold-400 stroke-[1.2]" />
          </div>
        </div>

        {/* Headings */}
        <div className="space-y-4">
          <span className="text-xs uppercase tracking-widest text-gold-400 font-semibold font-mono block animate-fade-in">
            An Interpretive Experience
          </span>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-serif font-light text-neutral-100 tracking-wide leading-tight animate-slide-up">
            Reading the <span className="text-glow-gold italic">Panorama</span>
          </h1>
        </div>

        {/* Philosophy Text */}
        <div className="space-y-6 text-neutral-400 font-light text-sm sm:text-base leading-relaxed max-w-xl mx-auto border-y border-neutral-900/80 py-8 animate-fade-in-delayed">
          <p className="italic text-neutral-300">
            "Tarot does not give meaning to the Panorama. Tarot is an interpretive language that helps reveal meanings already present within the Panorama."
          </p>
          <p>
            Choose three moments from the Panorama collection. They will remain hidden, obscured from sight, until they choose their place in your reading.
          </p>
        </div>

        {/* CTA */}
        <div className="pt-4 animate-fade-in-delayed">
          <Link
            href="/reading"
            className="group relative inline-flex items-center gap-3 px-10 py-5 bg-gradient-to-r from-gold-600 to-gold-500 hover:from-gold-500 hover:to-gold-400 text-neutral-950 font-sans font-semibold text-xs uppercase tracking-widest rounded-full shadow-[0_0_40px_rgba(190,144,46,0.2)] hover:shadow-[0_0_50px_rgba(190,144,46,0.35)] transition-all duration-500 hover:scale-[1.03]"
          >
            <Sparkles className="w-4 h-4 text-neutral-950" />
            Begin a Reading
            <span className="absolute inset-0 rounded-full border border-white/20 scale-95 opacity-0 group-hover:scale-100 group-hover:opacity-100 transition-all duration-500" />
          </Link>
        </div>
      </div>

      {/* Footer */}
      <div className="absolute bottom-8 left-0 right-0 text-center flex flex-col items-center gap-1.5">
        <span className="text-[10px] uppercase tracking-widest text-neutral-600 font-mono">
          The Panorama Collection • Tableau 00–90
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
