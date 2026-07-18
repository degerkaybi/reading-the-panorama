import { samplePanoramas } from "../data/panoramas";
import { PanoramaTableau } from "../types/panorama";
import { CardReading, PositionRole, ReadingResult } from "../types/reading";

// Genesis date of the Panorama project: April 23, 2026
const GENESIS_DATE_STR = "2026-04-23T00:00:00Z";

export function getCdnImageUrl(dayId: number): string {
  const genesisDate = new Date(GENESIS_DATE_STR);
  
  // Shift offset by -1 day for dayId > 0 to align ID with the exact image number
  // (e.g. ID 6 maps to 2026-04-28, which is the 6th image of the Panorama)
  const offsetDays = dayId === 0 ? 0 : dayId - 1;
  const targetDate = new Date(genesisDate.getTime() + offsetDays * 24 * 60 * 60 * 1000);
  
  const yyyy = targetDate.getUTCFullYear();
  const mm = String(targetDate.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(targetDate.getUTCDate()).padStart(2, "0");
  
  return `https://cdn.panorama.garden/generated_${yyyy}-${mm}-${dd}.jpg`;
}

export function getMaxAvailableDayId(): number {
  const genesisDate = new Date(GENESIS_DATE_STR);
  const today = new Date();
  
  // Calculate difference in days since genesis
  const diffTime = Math.max(0, today.getTime() - genesisDate.getTime());
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  // Cap at 90 as the MVP timeline max
  return Math.min(90, diffDays);
}

export function getSafeDayId(id: number): number {
  const maxAvailable = getMaxAvailableDayId();
  if (id <= maxAvailable) {
    return id;
  }
  // Wrap-around wrap-around for future dates (e.g. Day 89 -> Day 2) to ensure a 200 image exists
  return id % (maxAvailable + 1);
}

// Helper to get a tableau based on selected ID (0-90)
export function getTableauById(id: number): PanoramaTableau {
  const safeId = getSafeDayId(id);
  const liveImageUrl = getCdnImageUrl(safeId);

  // Deterministically map to one of our 6 templates using modulo of original ID
  const index = id % samplePanoramas.length;
  const template = samplePanoramas[index];

  // Return a cloned version with the selected ID and live CDN image URL preserved
  return {
    ...template,
    id: id,
    imageUrl: liveImageUrl,
    title: `${template.title} (Tableau #${id})`,
  };
}

// Generate the customized contextual reading
export function generateReading(
  question: string | null,
  selectedIds: number[]
): ReadingResult {
  const isSingle = selectedIds.length === 1;
  if (!isSingle && selectedIds.length !== 3) {
    throw new Error("A reading requires either one or three selected tableaux.");
  }

  const cleanQuestion = question && question.trim() !== "" ? question.trim() : null;

  if (isSingle) {
    const singleTableau = getTableauById(selectedIds[0]);
    const cards: Partial<Record<PositionRole, CardReading>> = {
      Single: createCardReading(singleTableau, selectedIds[0], "Single", cleanQuestion),
    };

    const reflections = {
      whatSees: `The Panorama focuses its gaze on Tableau #${selectedIds[0]} (${singleTableau.title}) for your inquiry. It witnesses a central theme of "${singleTableau.coreVerb.toLowerCase()}" and a transition from "${singleTableau.transformation.from.toLowerCase()}" to "${singleTableau.transformation.to.toLowerCase()}."`,
      whatAsks: `How does the card's essence—"${singleTableau.coreEssence.toLowerCase()}"—apply to your question, and what blocks you from fully entering its light aspect: "${singleTableau.lightExpression.toLowerCase()}"?`,
      invitation: `Honor the invitation of this tableau: "${singleTableau.invitation}." Meditate on how the tension of "${singleTableau.centralTension.toLowerCase()}" is showing up in your life.`,
    };

    return {
      question: cleanQuestion,
      cards,
      relationshipAnalysis: "Single card inquiry. No relationship analysis is required.",
      synthesis: `This single card reading focuses on "${singleTableau.title}." It indicates that for your inquiry, you are currently experiencing the transition of ${singleTableau.coreVerb.toLowerCase()} (${singleTableau.coreEssence.toLowerCase()}). Focus on navigating from ${singleTableau.transformation.from.toLowerCase()} toward ${singleTableau.transformation.to.toLowerCase()}, while remaining mindful of the warning: "${singleTableau.warning}."`,
      whatSees: reflections.whatSees,
      whatAsks: reflections.whatAsks,
      invitation: reflections.invitation,
    };
  }

  const pastTableau = getTableauById(selectedIds[0]);
  const presentTableau = getTableauById(selectedIds[1]);
  const futureTableau = getTableauById(selectedIds[2]);

  // Stage 1 & 2: Positional and Contextual interpretations
  const cards: Partial<Record<PositionRole, CardReading>> = {
    Past: createCardReading(pastTableau, selectedIds[0], "Past", cleanQuestion),
    Present: createCardReading(presentTableau, selectedIds[1], "Present", cleanQuestion),
    Future: createCardReading(futureTableau, selectedIds[2], "Future", cleanQuestion),
  };

  // Stage 3: Relationship Analysis
  const relationshipAnalysis = analyzeRelationships(pastTableau, presentTableau, futureTableau);

  // Stage 4: Synthesis
  const synthesis = generateSynthesis(pastTableau, presentTableau, futureTableau, cleanQuestion);

  // Stage 5: Final Reflection
  const reflections = generateReflections(pastTableau, presentTableau, futureTableau, cleanQuestion);

  return {
    question: cleanQuestion,
    cards,
    relationshipAnalysis,
    synthesis,
    whatSees: reflections.whatSees,
    whatAsks: reflections.whatAsks,
    invitation: reflections.invitation,
  };
}

function createCardReading(
  tableau: PanoramaTableau,
  selectedId: number,
  role: PositionRole,
  question: string | null
): CardReading {
  let contextualInterpretation = "";
  let positionalInterpretation = "";

  const qContext = question ? `Regarding your focus on "${question}":` : "In your current life trajectory:";

  // Positional Interpretations
  switch (role) {
    case "Single":
      positionalInterpretation = `Tableau #${selectedId} (${tableau.title}) emerges as your focal point. It represents the central theme of your query, calling you to the practice of "${tableau.coreVerb.toLowerCase()}." This card guides you through a transformation from ${tableau.transformation.from.toLowerCase()} towards ${tableau.transformation.to.toLowerCase()}.`;
      contextualInterpretation = `${qContext} this single tableau highlights a state of "${tableau.coreEssence.toLowerCase()}." You are invited to work with its light expression: "${tableau.lightExpression.toLowerCase()}." However, you must heed the warning: "${tableau.warning}" to avoid falling into its shadow expression: "${tableau.shadowExpression.toLowerCase()}."`;
      break;

    case "Past":
      positionalInterpretation = `The presence of Tableau #${selectedId} (${tableau.title}) in the Past position highlights the foundation of this query. It points to a time of "${tableau.coreVerb.toLowerCase()}." Specifically, you have been navigating a transition described as: ${tableau.transformation.from.toLowerCase()} transitioning into ${tableau.transformation.to.toLowerCase()}. This was the grounding soil from which your present situation grew.`;
      contextualInterpretation = `${qContext} this card suggests that your previous experience of "${tableau.coreEssence.toLowerCase()}" served as a necessary catalyst. You had to experience the tension of ${tableau.centralTension.toLowerCase()} to build the resilience or awareness you hold today. The light expression here shows you carried forward "${tableau.lightExpression.toLowerCase()}" as a tool, though you must watch out that you aren't still dragging its shadow—"${tableau.shadowExpression.toLowerCase()}"—into your current situation.`;
      break;

    case "Present":
      positionalInterpretation = `In the Present position, Tableau #${selectedId} (${tableau.title}) indicates that the core activity currently unfolding is "${tableau.coreVerb.toLowerCase()}." The central tension active right now is ${tableau.centralTension.toLowerCase()}. You are standing right in the middle of a shift from ${tableau.transformation.from.toLowerCase()} toward ${tableau.transformation.to.toLowerCase()}.`;
      contextualInterpretation = `${qContext} the active dynamic is one of ${tableau.coreEssence.toLowerCase()}. The invitation of the present moment is: "${tableau.invitation}." You are being asked to embody "${tableau.lightExpression.toLowerCase()}." However, be highly mindful of the warning: "${tableau.warning}" which may manifest if you succumb to "${tableau.shadowExpression.toLowerCase()}."`;
      break;

    case "Future":
      positionalInterpretation = `Positioned in the Future, Tableau #${selectedId} (${tableau.title}) does not predict a fixed destiny, but points to a direction of emergence. It suggests that if your current trajectory continues, you will enter a phase of "${tableau.coreVerb.toLowerCase()}." This indicates an unfolding transition towards ${tableau.transformation.to.toLowerCase()}, resolving the current state of ${tableau.transformation.from.toLowerCase()}.`;
      contextualInterpretation = `${qContext} this card outlines a potential realization of "${tableau.coreEssence.toLowerCase()}." The universe invites you to contemplate the tension: ${tableau.centralTension.toLowerCase()}. Aligning with the light aspect of this card will look like "${tableau.lightExpression.toLowerCase()}." Prepare yourself by listening to its invitation: "${tableau.invitation}" and noting its warning: "${tableau.warning}."`;
      break;
  }

  return {
    tableau,
    selectedId,
    role,
    contextualInterpretation,
    positionalInterpretation,
  };
}

function getPopulationScore(id: number): number {
  // Map our template IDs to relative population densities
  const baseId = id % 6;
  switch (baseId) {
    case 0: return 1;  // ID 8: 1 figure (The Threshold of Winds)
    case 1: return 6;  // ID 24: Circle of figures (The Silent Assembly)
    case 2: return 0;  // ID 45: 0 figures (The Sunken Library)
    case 3: return 2;  // ID 62: 2 figures (The Weavers of Light)
    case 4: return 20; // ID 81: Diverse crowd (The Public Revelation)
    case 5: return 1;  // ID 89: 1 figure (The Solitary Observatory)
    default: return 1;
  }
}

function getSpaceType(id: number): "open" | "closed" | "cosmic" {
  const baseId = id % 6;
  switch (baseId) {
    case 0: return "open";   // Windy cliff
    case 1: return "closed"; // Misty forest clearing
    case 2: return "closed"; // Submerged library
    case 3: return "cosmic"; // High in night sky
    case 4: return "open";   // City square
    case 5: return "cosmic"; // Observatory peak / nebula
    default: return "open";
  }
}

function analyzeRelationships(
  past: PanoramaTableau,
  present: PanoramaTableau,
  future: PanoramaTableau
): string {
  const popPast = getPopulationScore(past.id);
  const popPresent = getPopulationScore(present.id);
  const popFuture = getPopulationScore(future.id);

  const spacePast = getSpaceType(past.id);
  const spacePresent = getSpaceType(present.id);
  const spaceFuture = getSpaceType(future.id);

  let dynamics = [];

  // Population flow
  if (popPast > 2 && popPresent <= 2 && popFuture <= 1) {
    dynamics.push("There is a pronounced movement from collective spaces and public engagement in the past, towards deep, solitary reflection in the present and future. Your path requires a retreat from the noise of the crowd to find your own voice.");
  } else if (popPast <= 1 && popPresent > 2 && popFuture > 5) {
    dynamics.push("Your trajectory demonstrates a clear expansion from isolation or individual struggle toward community and public witness. What began as a private internal journey is now demanding to be seen and validated by the collective.");
  } else if (popPast === 0 || popPresent === 0 || popFuture === 0) {
    dynamics.push("The sequence contains a moment of complete emptiness (represented by the water-bound stillness of the Sunken Library). This void acts as a psychological buffer, separating old actions from future momentum.");
  } else {
    dynamics.push("The reading reveals a balance between individual action and surrounding context, alternating between the focus of a single witness and the presence of guides or co-creators.");
  }

  // Spatial flow
  if (spacePast === "closed" && spaceFuture === "cosmic") {
    dynamics.push("Visually, the sequence opens up dramatically: shifting from enclosed, introspective, or flooded spaces into the infinite expanse of the stars. Your boundaries are widening, demanding a much broader perspective.");
  } else if (spacePast === "cosmic" && spaceFuture === "closed") {
    dynamics.push("The visual direction contracts from cosmic scales to focused, enclosed structures. It is time to ground your celestial theories and high-level ideas, bringing them down into specific, structured environments.");
  }

  // Symbol overlaps or archetype echoes
  const allArchetypes = [...past.primaryArchetypes, ...present.primaryArchetypes, ...future.primaryArchetypes];
  const uniqueArchetypes = new Set(allArchetypes);
  if (uniqueArchetypes.size < allArchetypes.length) {
    dynamics.push("We observe archetypal echoes running through these days. The repetition of similar forces suggests a recurring lesson or helper spirit that has been accompanying you across different stages of this transition.");
  }

  // Light transitions
  dynamics.push(`In terms of atmospheric light, the narrative flows from the "${past.originalPrompt.toLowerCase().includes("golden-hour") ? "dynamic storm light" : "focused illumination"}" of Tableau #${past.id}, through the "${present.originalPrompt.toLowerCase().includes("mist") ? "shrouded visibility" : "subtle glow"}" of Tableau #${present.id}, culminating in the "${future.originalPrompt.toLowerCase().includes("nebula") ? "cosmic radiance" : "revealed light"}" of Tableau #${future.id}.`);

  return dynamics.join(" ");
}

function generateSynthesis(
  past: PanoramaTableau,
  present: PanoramaTableau,
  future: PanoramaTableau,
  question: string | null
): string {
  const qPhrase = question ? `in your search for clarity regarding "${question}"` : "in your current lifecycle";
  
  return `The narrative arc connecting these three moments reveals a deep, non-deterministic movement. You are transitioning from the historical requirement of ${past.coreVerb.toLowerCase()} (embodying ${past.coreEssence.toLowerCase()}), grappling right now with the immediate tension of ${present.coreVerb.toLowerCase()} (${present.coreEssence.toLowerCase()}), and slowly turning toward the emergent possibility of ${future.coreVerb.toLowerCase()} (${future.coreEssence.toLowerCase()}).

This path indicates that ${qPhrase}, you cannot simply rely on what worked before. The transition from the Past's focus (${past.title}) to the Present's active field (${present.title}) shows that your old way of resolving tension must give way to the current demand for ${present.coreVerb.toLowerCase()}. Looking ahead, the Future (${future.title}) indicates that this present labor is not in vain; it is clearing space for a larger alignment, but only if you heed the warning of the Present and remain receptive to the quiet invitation of the Future.`;
}

interface Reflections {
  whatSees: string;
  whatAsks: string;
  invitation: string;
}

function generateReflections(
  past: PanoramaTableau,
  present: PanoramaTableau,
  future: PanoramaTableau,
  question: string | null
): Reflections {
  // Tailor based on the combination
  const whatSees = `The Panorama witnesses a transition from ${past.coreVerb.toLowerCase()} to ${future.coreVerb.toLowerCase()}, centered on the present act of ${present.coreVerb.toLowerCase()}. It sees a seeker who is moving past the stage of "${past.transformation.from.toLowerCase()}" and is currently suspended between "${present.transformation.from.toLowerCase()}" and "${present.transformation.to.toLowerCase()}." The path is not blocked; it is simply undergoing a re-calibration of scale.`;

  // Devise a powerful reflective question that synthesizes the present warning and the future invitation
  const whatAsks = `How can you honor the current tension of "${present.centralTension.toLowerCase()}" without letting fear draw you back to the "${past.transformation.from.toLowerCase()}" of your past, while keeping your eyes open to the "${future.invitation.toLowerCase()}" that awaits you?`;

  const invitation = `Embrace the active verb of the present: "${present.coreVerb}." Dedicate some quiet time today to explore the boundary where "${present.transformation.from.toLowerCase()}" ends and "${present.transformation.to.toLowerCase()}" begins, specifically applying the question: "${present.invitation}" to your immediate decisions.`;

  return {
    whatSees,
    whatAsks,
    invitation,
  };
}
