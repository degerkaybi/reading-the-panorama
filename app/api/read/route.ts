import { NextRequest, NextResponse } from "next/server";
import { getTableauById } from "../../../lib/reading-engine";
import fs from "fs";
import path from "path";

function logDebug(message: string) {
  try {
    const logPath = path.join(process.cwd(), "api_debug.log");
    const timestamp = new Date().toISOString();
    fs.appendFileSync(logPath, `[${timestamp}] ${message}\n`);
  } catch (err) {
    console.error("Failed to write to api_debug.log:", err);
  }
}

// OpenRouter configuration
const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || "google/gemma-4-31b-it:free";

export async function POST(req: NextRequest) {
  try {
    logDebug("=== New Reading Request Received (OpenRouter) ===");
    let bodyText = "";
    try {
      bodyText = await req.text();
    } catch (e: any) {
      logDebug(`Failed to read request body: ${e?.message || e}`);
    }

    if (!bodyText || bodyText.trim() === "") {
      logDebug("Error: Request body is empty.");
      return NextResponse.json({ success: false, reason: "EMPTY_REQUEST_BODY" });
    }

    let bodyData: any = {};
    try {
      bodyData = JSON.parse(bodyText);
    } catch (e: any) {
      logDebug(`Error parsing request body: ${e?.message || e}`);
      return NextResponse.json({ success: false, reason: "INVALID_JSON" });
    }

    const { question, selectedIds } = bodyData;
    logDebug(`Question: "${question || "None"}" | Selected IDs: ${JSON.stringify(selectedIds)}`);

    const apiKey = process.env.OPENROUTER_API_KEY;

    if (!apiKey) {
      logDebug("Error: No OPENROUTER_API_KEY found in process.env.");
      console.log("No OPENROUTER_API_KEY found in environment variables. Using offline fallback.");
      return NextResponse.json({ success: false, reason: "NO_API_KEY" });
    }

    logDebug(`OPENROUTER_API_KEY is present (length: ${apiKey.length}, starts with: ${apiKey.substring(0, 10)}...)`);
    logDebug(`Using model: ${OPENROUTER_MODEL}`);

    const cleanQuestion = question && question.trim() !== "" ? question.trim() : null;
    const isSingle = selectedIds.length === 1;

    // Build tableau descriptions for the prompt (text-based, since Gemma 4 doesn't support vision)
    const describeTableau = (tableau: any, id: number) => {
      return `Tableau #${id}:
- Title: ${tableau.title}
- Image URL: ${tableau.imageUrl}
- Core Verb: ${tableau.coreVerb}
- Core Essence: ${tableau.coreEssence}
- Central Tension: ${tableau.centralTension}
- Transformation: from "${tableau.transformation.from}" to "${tableau.transformation.to}"
- Primary Archetypes: ${tableau.primaryArchetypes.join(", ")}
- Symbols: ${tableau.symbols.join(", ")}
- Light Expression: ${tableau.lightExpression}
- Shadow Expression: ${tableau.shadowExpression}
- Invitation: ${tableau.invitation}
- Warning: ${tableau.warning}
- Tarot Resonances: ${tableau.tarotResonances.join(", ")}
- Original Prompt (visual description): ${tableau.originalPrompt}`;
    };

    let prompt = "";
    let singleTableau: any = null;
    let pastTableau: any = null;
    let presentTableau: any = null;
    let futureTableau: any = null;

    if (isSingle) {
      singleTableau = getTableauById(selectedIds[0]);
      const tableauDesc = describeTableau(singleTableau, selectedIds[0]);

      prompt = `
You are the interpretive guide for "Reading the Panorama".
"Reading the Panorama" is a symbolic reading experience. Users select a single hidden artwork from the "Panorama" collection representing their focus.

The central philosophy is:
"Tarot does not give meaning to the Panorama. Tarot is an interpretive language that helps reveal meanings already present within the Panorama."

User Query: "${cleanQuestion || "Silent Inquiry (no question asked)"}"

Selected Tableau:
${tableauDesc}

Based on the visual description and symbolic metadata of this tableau, generate a deep, personalized reading.

Generate a JSON response conforming strictly to this structure:
{
  "cards": {
    "Single": {
      "title": "A poetic, evocative title in English for this card based on the image (e.g. 'The Threshold of Winds')",
      "coreVerb": "A single action verb or gerund in English (e.g. 'Crossing', 'Witnessing')",
      "coreEssence": "A single, deep sentence in English describing the core essence of this card",
      "centralTension": "An English sentence describing the central tension or dilemma shown in the scene (e.g. 'The safety of the threshold vs. the unpredictable calling of the storm')",
      "transformation": {
        "from": "An English phrase describing the state/feeling being left behind",
        "to": "An English phrase describing the state/feeling being moved towards"
      },
      "primaryArchetypes": ["Archetype 1 in English", "Archetype 2 in English"],
      "symbols": ["Symbol 1 in English", "Symbol 2 in English", "Symbol 3 in English"],
      "lightExpression": "An English sentence describing the positive, constructive aspect of this card",
      "shadowExpression": "An English sentence describing the shadow, warning, or self-sabotaging aspect",
      "tarotResonances": ["Resonance 1 in English", "Resonance 2 in English"],
      "visualObservations": ["Visual detail observation 1 in English", "Visual detail observation 2 in English"],
      "promptObservations": ["An observation about the prompt or concept in English"],
      "originalPrompt": "A detailed descriptive prompt in English describing what is visually happening in the image",
      "invitation": "The card's specific invitation in English (e.g. 'Step through the portal. The wind is not trying to knock you down; it is indicating which way is open.')",
      "warning": "The card's specific warning in English (e.g. 'Remaining on the threshold forever turns a gate into a wall.')",
      "positionalInterpretation": "A clear, plain 1-2 sentence description in English of how this card represents the focal point of the query.",
      "contextualInterpretation": "A direct, clear 2-3 sentence interpretation in English of the card's visual symbols and its essence in relation to the query: ${cleanQuestion || "their situation"}."
    }
  },
  "synthesis": "A simple, poetic, yet very clear and plain 2-3 sentence summary in English of the narrative message of the card relating to the query: ${cleanQuestion || "their path"}.",
  "whatSees": "What the Panorama sees in this card (1 short, clean, direct sentence in English).",
  "whatAsks": "What the Panorama asks you through this card (1 short, clean, direct question in English).",
  "invitation": "The Panorama's overall invitation based on this card (1 short, clean, direct invite in English)."
}

Respond ONLY with valid JSON. Do not include markdown code block syntax (like \`\`\`json) in your raw output.

READING VOICE AND WRITING STYLE RULES (CRITICAL):
1. THE ARTWORK MUST LEAD:
   The final reading must feel grounded in the actual Panorama artwork. Use the visual description provided to anchor your interpretation. If the reading could still make sense without referencing the artwork, it is too generic. Rewrite it.

2. MANDATORY FOCUS ON USER'S QUESTION:
   If the user has written/asked a question, every interpretation, synthesis, and card commentary MUST be directly, deeply, and explicitly related to that question. There must be a clear, logical, and intuitive connection/bridge between the visual elements/symbols of the card and the user's query. Do not just describe or interpret the card in isolation; you must actively answer or address the user's question using the card's visual cues. The question must be the primary lens of the entire reading.

3. NEVER EXPOSE INTERNAL SYMBOLIC METADATA DIRECTLY IN THE TEXT INTERPRETATIONS:
   Do not quote or paraphrase the metadata fields mechanically inside the positionalInterpretation, contextualInterpretation, relationshipAnalysis, or synthesis fields. The metadata is for display in the metadata cards, not to be read like dry text.

4. INTERPRETATION STEPS:
   - LOOK AT THE SCENE: Begin with what is actually happening in the artwork based on the visual description. Describe one or two concrete visual details that matter to the interpretation.
   - FIND THE HUMAN EXPERIENCE: Identify the human experience taking place in that scene.
   - CONNECT TO QUERY: Connect it naturally to the user's question.

5. KEEP THE LANGUAGE SIMPLE:
   Use clear, warm, contemporary, and intimate language. Prefer concrete sentences over abstract spiritual terminology.
   Avoid: overly mystical language, therapy-speak, corporate language, unnecessary philosophical jargon, excessive metaphors, or repeating the same idea in different words.
   STRICTLY avoid clichés like: "In your current life trajectory", "cosmic energies", "on your spiritual journey", "your life path", "universal flow", "your roadmap", "energetic plane".
`;
    } else {
      pastTableau = getTableauById(selectedIds[0]);
      presentTableau = getTableauById(selectedIds[1]);
      futureTableau = getTableauById(selectedIds[2]);

      const pastDesc = describeTableau(pastTableau, selectedIds[0]);
      const presentDesc = describeTableau(presentTableau, selectedIds[1]);
      const futureDesc = describeTableau(futureTableau, selectedIds[2]);

      prompt = `
You are the interpretive guide for "Reading the Panorama".
"Reading the Panorama" is a symbolic reading experience. Users select three hidden artworks from the "Panorama" collection representing Past, Present, and Future.

The central philosophy is:
"Tarot does not give meaning to the Panorama. Tarot is an interpretive language that helps reveal meanings already present within the Panorama."

User Query: "${cleanQuestion || "Silent Inquiry (no question asked)"}"

Selected Tableaus:

1. PAST:
${pastDesc}

2. PRESENT:
${presentDesc}

3. FUTURE:
${futureDesc}

Based on the visual descriptions and symbolic metadata of these tableaus, generate a deep, personalized three-card reading.

Generate a JSON response conforming strictly to this structure:
{
  "cards": {
    "Past": {
      "title": "A poetic, evocative title in English for this card based on the image (e.g. 'The Threshold of Winds')",
      "coreVerb": "A single action verb or gerund in English (e.g. 'Crossing', 'Witnessing')",
      "coreEssence": "A single, deep sentence in English describing the core essence of this card",
      "centralTension": "An English sentence describing the central tension or dilemma shown in the scene",
      "transformation": {
        "from": "An English phrase describing the state/feeling being left behind",
        "to": "An English phrase describing the state/feeling being moved towards"
      },
      "primaryArchetypes": ["Archetype 1 in English", "Archetype 2 in English"],
      "symbols": ["Symbol 1 in English", "Symbol 2 in English", "Symbol 3 in English"],
      "lightExpression": "An English sentence describing the positive, constructive aspect of this card",
      "shadowExpression": "An English sentence describing the shadow, warning, or self-sabotaging aspect",
      "tarotResonances": ["Resonance 1 in English", "Resonance 2 in English"],
      "visualObservations": ["Visual detail observation 1 in English", "Visual detail observation 2 in English"],
      "promptObservations": ["An observation about the prompt or concept in English"],
      "originalPrompt": "A detailed descriptive prompt in English describing what is visually happening in the image",
      "invitation": "The card's specific invitation in English",
      "warning": "The card's specific warning in English",
      "positionalInterpretation": "A clear, plain 1-2 sentence description in English of how this position represents the roots/foundation of the query.",
      "contextualInterpretation": "A direct, clear 2-3 sentence interpretation in English of the card's visual symbols and its essence in relation to the query: ${cleanQuestion || "their situation"}."
    },
    "Present": {
      "title": "A poetic, evocative title in English for this card based on the image",
      "coreVerb": "A single action verb or gerund in English",
      "coreEssence": "A single, deep sentence in English describing the core essence",
      "centralTension": "An English sentence describing the central tension or dilemma",
      "transformation": {
        "from": "An English phrase describing the state/feeling being left behind",
        "to": "An English phrase describing the state/feeling being moved towards"
      },
      "primaryArchetypes": ["Archetype 1 in English", "Archetype 2 in English"],
      "symbols": ["Symbol 1 in English", "Symbol 2 in English", "Symbol 3 in English"],
      "lightExpression": "An English sentence describing the positive, constructive aspect",
      "shadowExpression": "An English sentence describing the shadow, warning aspect",
      "tarotResonances": ["Resonance 1 in English", "Resonance 2 in English"],
      "visualObservations": ["Visual detail observation 1 in English", "Visual detail observation 2 in English"],
      "promptObservations": ["An observation in English"],
      "originalPrompt": "A detailed descriptive prompt describing the image",
      "invitation": "The card's specific invitation in English",
      "warning": "The card's specific warning in English",
      "positionalInterpretation": "A clear, plain 1-2 sentence description in English of how this position represents the current active state/challenges.",
      "contextualInterpretation": "A direct, clear 2-3 sentence interpretation in English of the card's visual symbols and its essence in relation to the query: ${cleanQuestion || "their situation"}."
    },
    "Future": {
      "title": "A poetic, evocative title in English for this card based on the image",
      "coreVerb": "A single action verb or gerund in English",
      "coreEssence": "A single, deep sentence in English describing the core essence",
      "centralTension": "An English sentence describing the central tension or dilemma",
      "transformation": {
        "from": "An English phrase describing the state/feeling being left behind",
        "to": "An English phrase describing the state/feeling being moved towards"
      },
      "primaryArchetypes": ["Archetype 1 in English", "Archetype 2 in English"],
      "symbols": ["Symbol 1 in English", "Symbol 2 in English", "Symbol 3 in English"],
      "lightExpression": "An English sentence describing the positive, constructive aspect",
      "shadowExpression": "An English sentence describing the shadow, warning aspect",
      "tarotResonances": ["Resonance 1 in English", "Resonance 2 in English"],
      "visualObservations": ["Visual detail observation 1 in English", "Visual detail observation 2 in English"],
      "promptObservations": ["An observation in English"],
      "originalPrompt": "A detailed descriptive prompt describing the image",
      "invitation": "The card's specific invitation in English",
      "warning": "The card's specific warning in English",
      "positionalInterpretation": "A clear, plain 1-2 sentence description in English of how this position represents the future direction/advice.",
      "contextualInterpretation": "A direct, clear 2-3 sentence interpretation in English of the card's visual symbols and its essence in relation to the query: ${cleanQuestion || "their situation"}."
    }
  },
  "relationshipAnalysis": "Stage 3 - A clean, direct 2-3 sentence analysis in English of the visual transition between the three images (crowd/density changes, open vs. closed spaces).",
  "synthesis": "Stage 4 - A simple, poetic, yet very clear and plain 2-3 sentence summary in English of the narrative arc (Past -> Present -> Future) relating to the query: ${cleanQuestion || "their path"}.",
  "whatSees": "Stage 5 - What the Panorama sees (1 short, clean, direct sentence in English).",
  "whatAsks": "Stage 5 - What the Panorama asks (1 short, clean, direct question in English).",
  "invitation": "Stage 5 - The Panorama's overall invitation (1 short, clean, direct invite in English)."
}

Respond ONLY with valid JSON. Do not include markdown code block syntax (like \`\`\`json) in your raw output.

READING VOICE AND WRITING STYLE RULES (CRITICAL):
1. THE ARTWORK MUST LEAD:
   The final reading must feel grounded in the actual Panorama artwork. Use the visual descriptions provided to anchor your interpretation. If the reading could still make sense without referencing the artwork, it is too generic. Rewrite it.

2. MANDATORY FOCUS ON USER'S QUESTION:
   If the user has written/asked a question, every interpretation, synthesis, relationship analysis, and card commentary MUST be directly, deeply, and explicitly related to that question. There must be a clear, logical, and intuitive connection/bridge between the visual elements/symbols of the cards and the user's query. Do not just describe or interpret the cards in isolation; you must actively answer or address the user's question using the cards' visual cues. The question must be the primary lens of the entire reading.

3. NEVER EXPOSE INTERNAL SYMBOLIC METADATA DIRECTLY IN THE TEXT INTERPRETATIONS:
   Do not quote or paraphrase the metadata fields mechanically inside the positionalInterpretation, contextualInterpretation, relationshipAnalysis, or synthesis fields. The metadata is for display in the metadata cards, not to be read like dry text.

4. INTERPRETATION STEPS:
   - LOOK AT THE SCENE: Begin with what is actually happening in the artwork based on the visual description. Describe one or two concrete visual details that matter to the interpretation.
   - FIND THE HUMAN EXPERIENCE: Identify the human experience taking place in that scene.
   - CONNECT TO POSITION & QUERY: Connect it naturally to the user's question and the card's position.
     * Past: how it contributed to the present situation.
     * Present: what dynamic is currently active.
     * Future: describe a possible direction or emerging experience (never as certain or predetermined).
     * Translate the scene to the user's actual question context (no generic spiritual advice).
     * Use Tarot knowledge invisibly (do not use tarot terms directly).

5. KEEP THE LANGUAGE SIMPLE:
   Use clear, warm, contemporary, and intimate language. Prefer concrete sentences over abstract spiritual terminology.
   Avoid: overly mystical language, therapy-speak, corporate language, unnecessary philosophical jargon, excessive metaphors, or repeating the same idea in different words.
   STRICTLY avoid clichés like: "In your current life trajectory", "cosmic energies", "on your spiritual journey", "your life path", "universal flow", "your roadmap", "energetic plane".
`;
    }

    logDebug(`Sending request to OpenRouter API (model: ${OPENROUTER_MODEL})`);

    // Retry logic for rate limits (429) - up to 3 attempts with exponential backoff
    const MAX_RETRIES = 3;
    const RETRY_DELAYS = [5000, 10000, 20000]; // 5s, 10s, 20s
    let openRouterRes: Response | null = null;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      openRouterRes = await fetch(OPENROUTER_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
          "HTTP-Referer": "https://panorama.garden",
          "X-Title": "Reading the Panorama",
        },
        body: JSON.stringify({
          model: OPENROUTER_MODEL,
          messages: [
            {
              role: "user",
              content: prompt,
            }
          ],
          temperature: 0.8,
          max_tokens: 4096,
        }),
      });

      logDebug(`OpenRouter API response code: ${openRouterRes.status} (attempt ${attempt + 1}/${MAX_RETRIES})`);

      if (openRouterRes.status === 429 && attempt < MAX_RETRIES - 1) {
        const waitMs = RETRY_DELAYS[attempt];
        logDebug(`Rate limited (429). Waiting ${waitMs / 1000}s before retry...`);
        await new Promise(resolve => setTimeout(resolve, waitMs));
        continue;
      }

      break;
    }

    if (!openRouterRes || !openRouterRes.ok) {
      const errorText = openRouterRes ? await openRouterRes.text() : "No response";
      logDebug(`OpenRouter API Error: Status ${openRouterRes?.status} | Body: ${errorText}`);
      throw new Error(`OpenRouter API returned status ${openRouterRes?.status}: ${errorText}`);
    }

    const openRouterData = await openRouterRes.json();

    if (!openRouterData) {
      logDebug("Error: OpenRouter API response is empty.");
      return NextResponse.json({ success: false, reason: "INVALID_OPENROUTER_RESPONSE" });
    }

    const responseText = openRouterData?.choices?.[0]?.message?.content;

    if (!responseText) {
      logDebug(`OpenRouter API response choices empty or missing content. Raw data: ${JSON.stringify(openRouterData)}`);
      console.error("No text returned from OpenRouter API:", JSON.stringify(openRouterData));
      return NextResponse.json({ success: false, reason: "EMPTY_RESPONSE" });
    }

    logDebug(`Received raw text response (length: ${responseText.length})`);

    // Clean response text: strip markdown code fences if present
    let cleanedResponse = responseText.trim();
    if (cleanedResponse.startsWith("```json")) {
      cleanedResponse = cleanedResponse.slice(7);
    } else if (cleanedResponse.startsWith("```")) {
      cleanedResponse = cleanedResponse.slice(3);
    }
    if (cleanedResponse.endsWith("```")) {
      cleanedResponse = cleanedResponse.slice(0, -3);
    }
    cleanedResponse = cleanedResponse.trim();

    let parsedResponse: any = null;
    try {
      parsedResponse = JSON.parse(cleanedResponse);
    } catch (parseErr: any) {
      logDebug(`Failed to parse responseText JSON: ${parseErr?.message || parseErr}`);
      logDebug(`Raw response was: ${cleanedResponse.substring(0, 500)}`);
      console.error("Failed to parse responseText as JSON:", cleanedResponse);
      return NextResponse.json({ success: false, reason: "INVALID_RESPONSE_JSON" });
    }

    // Build the final ReadingResult object, using the dynamically generated tableau metadata
    let reading = {};
    if (isSingle) {
      reading = {
        question: cleanQuestion,
        cards: {
          Single: {
            tableau: {
              id: selectedIds[0],
              title: parsedResponse.cards.Single.title,
              imageUrl: singleTableau.imageUrl,
              originalPrompt: parsedResponse.cards.Single.originalPrompt,
              coreEssence: parsedResponse.cards.Single.coreEssence,
              coreVerb: parsedResponse.cards.Single.coreVerb,
              centralTension: parsedResponse.cards.Single.centralTension,
              transformation: {
                from: parsedResponse.cards.Single.transformation.from,
                to: parsedResponse.cards.Single.transformation.to,
              },
              primaryArchetypes: parsedResponse.cards.Single.primaryArchetypes,
              secondaryArchetypes: [],
              symbols: parsedResponse.cards.Single.symbols,
              lightExpression: parsedResponse.cards.Single.lightExpression,
              shadowExpression: parsedResponse.cards.Single.shadowExpression,
              invitation: parsedResponse.cards.Single.invitation || "",
              warning: parsedResponse.cards.Single.warning || "",
              supportedMeanings: [],
              unsupportedMeanings: [],
              tarotResonances: parsedResponse.cards.Single.tarotResonances,
              visualObservations: parsedResponse.cards.Single.visualObservations,
              promptObservations: parsedResponse.cards.Single.promptObservations,
            },
            selectedId: selectedIds[0],
            role: "Single",
            positionalInterpretation: parsedResponse.cards.Single.positionalInterpretation,
            contextualInterpretation: parsedResponse.cards.Single.contextualInterpretation,
          }
        },
        relationshipAnalysis: "Single card inquiry. No relationship analysis is required.",
        synthesis: parsedResponse.synthesis,
        whatSees: parsedResponse.whatSees,
        whatAsks: parsedResponse.whatAsks,
        invitation: parsedResponse.invitation,
      };
    } else {
      reading = {
        question: cleanQuestion,
        cards: {
          Past: {
            tableau: {
              id: selectedIds[0],
              title: parsedResponse.cards.Past.title,
              imageUrl: pastTableau.imageUrl,
              originalPrompt: parsedResponse.cards.Past.originalPrompt,
              coreEssence: parsedResponse.cards.Past.coreEssence,
              coreVerb: parsedResponse.cards.Past.coreVerb,
              centralTension: parsedResponse.cards.Past.centralTension,
              transformation: {
                from: parsedResponse.cards.Past.transformation.from,
                to: parsedResponse.cards.Past.transformation.to,
              },
              primaryArchetypes: parsedResponse.cards.Past.primaryArchetypes,
              secondaryArchetypes: [],
              symbols: parsedResponse.cards.Past.symbols,
              lightExpression: parsedResponse.cards.Past.lightExpression,
              shadowExpression: parsedResponse.cards.Past.shadowExpression,
              invitation: parsedResponse.cards.Past.invitation || "",
              warning: parsedResponse.cards.Past.warning || "",
              supportedMeanings: [],
              unsupportedMeanings: [],
              tarotResonances: parsedResponse.cards.Past.tarotResonances,
              visualObservations: parsedResponse.cards.Past.visualObservations,
              promptObservations: parsedResponse.cards.Past.promptObservations,
            },
            selectedId: selectedIds[0],
            role: "Past",
            positionalInterpretation: parsedResponse.cards.Past.positionalInterpretation,
            contextualInterpretation: parsedResponse.cards.Past.contextualInterpretation,
          },
          Present: {
            tableau: {
              id: selectedIds[1],
              title: parsedResponse.cards.Present.title,
              imageUrl: presentTableau.imageUrl,
              originalPrompt: parsedResponse.cards.Present.originalPrompt,
              coreEssence: parsedResponse.cards.Present.coreEssence,
              coreVerb: parsedResponse.cards.Present.coreVerb,
              centralTension: parsedResponse.cards.Present.centralTension,
              transformation: {
                from: parsedResponse.cards.Present.transformation.from,
                to: parsedResponse.cards.Present.transformation.to,
              },
              primaryArchetypes: parsedResponse.cards.Present.primaryArchetypes,
              secondaryArchetypes: [],
              symbols: parsedResponse.cards.Present.symbols,
              lightExpression: parsedResponse.cards.Present.lightExpression,
              shadowExpression: parsedResponse.cards.Present.shadowExpression,
              invitation: parsedResponse.cards.Present.invitation || "",
              warning: parsedResponse.cards.Present.warning || "",
              supportedMeanings: [],
              unsupportedMeanings: [],
              tarotResonances: parsedResponse.cards.Present.tarotResonances,
              visualObservations: parsedResponse.cards.Present.visualObservations,
              promptObservations: parsedResponse.cards.Present.promptObservations,
            },
            selectedId: selectedIds[1],
            role: "Present",
            positionalInterpretation: parsedResponse.cards.Present.positionalInterpretation,
            contextualInterpretation: parsedResponse.cards.Present.contextualInterpretation,
          },
          Future: {
            tableau: {
              id: selectedIds[2],
              title: parsedResponse.cards.Future.title,
              imageUrl: futureTableau.imageUrl,
              originalPrompt: parsedResponse.cards.Future.originalPrompt,
              coreEssence: parsedResponse.cards.Future.coreEssence,
              coreVerb: parsedResponse.cards.Future.coreVerb,
              centralTension: parsedResponse.cards.Future.centralTension,
              transformation: {
                from: parsedResponse.cards.Future.transformation.from,
                to: parsedResponse.cards.Future.transformation.to,
              },
              primaryArchetypes: parsedResponse.cards.Future.primaryArchetypes,
              secondaryArchetypes: [],
              symbols: parsedResponse.cards.Future.symbols,
              lightExpression: parsedResponse.cards.Future.lightExpression,
              shadowExpression: parsedResponse.cards.Future.shadowExpression,
              invitation: parsedResponse.cards.Future.invitation || "",
              warning: parsedResponse.cards.Future.warning || "",
              supportedMeanings: [],
              unsupportedMeanings: [],
              tarotResonances: parsedResponse.cards.Future.tarotResonances,
              visualObservations: parsedResponse.cards.Future.visualObservations,
              promptObservations: parsedResponse.cards.Future.promptObservations,
            },
            selectedId: selectedIds[2],
            role: "Future",
            positionalInterpretation: parsedResponse.cards.Future.positionalInterpretation,
            contextualInterpretation: parsedResponse.cards.Future.contextualInterpretation,
          }
        },
        relationshipAnalysis: parsedResponse.relationshipAnalysis,
        synthesis: parsedResponse.synthesis,
        whatSees: parsedResponse.whatSees,
        whatAsks: parsedResponse.whatAsks,
        invitation: parsedResponse.invitation,
      };
    }

    logDebug("Reading generated and parsed successfully via OpenRouter. Returning success.");
    return NextResponse.json({ success: true, reading });
  } catch (err: any) {
    logDebug(`Exception in API route: ${err?.message || err}\nStack: ${err?.stack || ""}`);
    console.error("Error generating OpenRouter reading:", err);
    return NextResponse.json({ success: false, reason: "API_ERROR" });
  }
}
