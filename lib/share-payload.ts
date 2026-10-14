import {
  compressToEncodedURIComponent,
  decompressFromEncodedURIComponent,
} from "lz-string";
import { DeckSeason, getTableauById, SEASONS } from "./reading-engine";
import { CardReading, PositionRole, ReadingResult } from "../types/reading";

interface CompactCard {
  id: number;
  ci: string;
  pi: string;
}

interface CompactReading {
  q: string | null;
  ra: string;
  sy: string;
  ws: string;
  wa: string;
  in: string;
  c: Partial<Record<PositionRole, CompactCard>>;
}

const SHARE_VERSION = "v1.";
const POSITION_ROLES: PositionRole[] = ["Single", "Past", "Present", "Future"];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readString(record: Record<string, unknown>, key: string): string {
  const value = record[key];
  if (typeof value !== "string") {
    throw new Error("Invalid shared reading payload");
  }
  return value;
}

export function createShareHash(result: ReadingResult): string {
  const cards: CompactReading["c"] = {};

  for (const role of POSITION_ROLES) {
    const card = result.cards[role];
    if (card) {
      cards[role] = {
        id: card.selectedId,
        ci: card.contextualInterpretation,
        pi: card.positionalInterpretation,
      };
    }
  }

  const payload: CompactReading = {
    q: result.question,
    ra: result.relationshipAnalysis,
    sy: result.synthesis,
    ws: result.whatSees,
    wa: result.whatAsks,
    in: result.invitation,
    c: cards,
  };

  return SHARE_VERSION + compressToEncodedURIComponent(JSON.stringify(payload));
}

export function parseShareHash(hash: string): ReadingResult {
  const encoded = hash.replace(/^#/, "");
  if (!encoded.startsWith(SHARE_VERSION)) {
    throw new Error("Unsupported shared reading version");
  }

  const json = decompressFromEncodedURIComponent(encoded.slice(SHARE_VERSION.length));
  if (!json) {
    throw new Error("Invalid shared reading data");
  }

  const payload: unknown = JSON.parse(json);
  if (!isRecord(payload) || !isRecord(payload.c)) {
    throw new Error("Invalid shared reading payload");
  }

  const cards: Partial<Record<PositionRole, CardReading>> = {};

  for (const role of POSITION_ROLES) {
    const compactCard = payload.c[role];
    if (compactCard === undefined) continue;
    if (!isRecord(compactCard)) {
      throw new Error("Invalid shared card payload");
    }

    const cardId = compactCard.id;
    if (typeof cardId !== "number" || !Number.isInteger(cardId)) {
      throw new Error("Invalid shared card id");
    }

    const season: DeckSeason = cardId >= SEASONS[2].cardRange[0] ? 2 : 1;
    cards[role] = {
      tableau: getTableauById(cardId, season),
      selectedId: cardId,
      role,
      contextualInterpretation: readString(compactCard, "ci"),
      positionalInterpretation: readString(compactCard, "pi"),
    };
  }

  if (Object.keys(cards).length === 0) {
    throw new Error("Shared reading contains no cards");
  }

  const question = payload.q;
  if (question !== null && typeof question !== "string") {
    throw new Error("Invalid shared reading question");
  }

  return {
    question,
    relationshipAnalysis: readString(payload, "ra"),
    synthesis: readString(payload, "sy"),
    whatSees: readString(payload, "ws"),
    whatAsks: readString(payload, "wa"),
    invitation: readString(payload, "in"),
    cards,
  };
}
