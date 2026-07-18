import { PanoramaTableau } from "./panorama";

export type PositionRole = "Past" | "Present" | "Future" | "Single";

export interface CardReading {
  tableau: PanoramaTableau;
  selectedId: number; // The actual chosen number (0-90) between 0-90
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
