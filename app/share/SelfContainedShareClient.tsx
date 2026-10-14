"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Compass } from "lucide-react";
import { parseShareHash } from "../../lib/share-payload";
import { ReadingResult } from "../../types/reading";
import SharedReadingClient from "./[id]/SharedReadingClient";

export default function SelfContainedShareClient() {
  const [result, setResult] = useState<ReadingResult | null>(null);
  const [isInvalid, setIsInvalid] = useState(false);

  useEffect(() => {
    try {
      setResult(parseShareHash(window.location.hash));
    } catch (error) {
      console.error("Failed to open shared reading:", error);
      setIsInvalid(true);
    }
  }, []);

  if (result) {
    return <SharedReadingClient result={result} />;
  }

  if (isInvalid) {
    return (
      <div className="min-h-screen bg-neutral-950 text-neutral-100 flex items-center justify-center px-6">
        <div className="max-w-md text-center space-y-6">
          <Compass className="w-10 h-10 text-gold-500 mx-auto" />
          <div className="space-y-2">
            <h1 className="text-3xl font-serif font-light">This shared reading could not be opened.</h1>
            <p className="text-sm text-neutral-400 font-light">
              The link may be incomplete or damaged. Ask the sender to copy it again.
            </p>
          </div>
          <Link
            href="/"
            className="inline-flex rounded-full bg-gold-500 px-6 py-3 text-xs font-semibold uppercase tracking-widest text-neutral-950 hover:bg-gold-400 transition-colors"
          >
            Begin a new reading
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex items-center justify-center">
      <Compass className="w-8 h-8 text-gold-500 animate-pulse" />
    </div>
  );
}
