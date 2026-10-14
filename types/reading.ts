import { PanoramaTableau } from "./panorama";

export type PositionRole = "Past" | "Present" | "Future" | "Single";

export interface CardReading {
  tableau: PanoramaTableau;
  selectedId: number; // The actual chosen tableau number across all seasons
  role: PositionRole;
  contextualInterpretation: string;
  positionalInterpretation: string;
}

export interface ReadingResult {
  question: string | null;
  cards: Partial<Record<PositionRole, CardReading>>;
  relationshipAnalysis: string;
  synthesis: string;
  whatSees: string;
  whatAsks: string;
  invitation: string;
}
