import { notFound } from "next/navigation";
import { ReadingResult, PositionRole, CardReading } from "../../../types/reading";
import { getTableauById } from "../../../lib/reading-engine";
import SharedReadingClient from "./SharedReadingClient";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function SharePage({ params }: PageProps) {
  const { id } = await params;

  const kvUrl = process.env.KV_REST_API_URL;
  const kvToken = process.env.KV_REST_API_TOKEN;

  if (!kvUrl || !kvToken) {
    console.error("Vercel KV environment variables are missing!");
    notFound();
  }

  const baseUrl = kvUrl.endsWith("/") ? kvUrl.slice(0, -1) : kvUrl;

  let result: ReadingResult;

  try {
    const response = await fetch(baseUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${kvToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(["GET", `readings:${id}`]),
      next: { revalidate: 0 }, // Bypass static caching
    });

    if (!response.ok) {
      throw new Error(`Upstash REST API error: Status ${response.status}`);
    }

    const data = await response.json();
    if (!data || data.result === null) {
      notFound();
    }

    const payload = JSON.parse(data.result);

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

    result = {
      question: payload.q,
      relationshipAnalysis: payload.ra,
      synthesis: payload.sy,
      whatSees: payload.ws,
      whatAsks: payload.wa,
      invitation: payload.in,
      cards,
    };
  } catch (error) {
    console.error(`Failed to fetch shared reading ${id}:`, error);
    notFound();
  }

  return <SharedReadingClient result={result} />;
}
