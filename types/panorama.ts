export interface Transformation {
  from: string;
  to: string;
}

export interface PanoramaTableau {
  id: number;
  title: string;
  imageUrl: string;
  originalPrompt: string;
  coreEssence: string;
  coreVerb: string;
  centralTension: string;
  transformation: Transformation;
  primaryArchetypes: string[];
  secondaryArchetypes: string[];
  symbols: string[];
  lightExpression: string;
  shadowExpression: string;
  invitation: string;
  warning: string;
  supportedMeanings: string[];
  unsupportedMeanings: string[];
  tarotResonances: string[];
  visualObservations: string[];
  promptObservations: string[];
  dateSlashLabel?: string;
  isPredefined?: boolean;
}
