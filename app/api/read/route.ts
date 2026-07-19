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
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || "moonshotai/kimi-k2.6";

// Models that support vision (image_url in messages)
function isVisionCapable(model: string): boolean {
  const visionModels = [
    "gemini", "gpt-4o", "gpt-4-vision", "claude-3", "claude-4",
    "qwen3-vl", "qwen2-vl", "llava", "pixtral"
  ];
  return visionModels.some(v => model.toLowerCase().includes(v));
}

function safeArrayOfStrings(val: any): string[] {
  if (Array.isArray(val)) {
    return val.filter(item => typeof item === "string");
  }
  if (typeof val === "string" && val.trim() !== "") {
    return [val.trim()];
  }
  return [];
}

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

    // Build tableau descriptions for the prompt — using date name as primary card identity
    const describeTableau = (tableau: any) => {
      const cardName = tableau.dateName || tableau.title;
      return `Card: "${cardName}"
- Card Date Name: ${cardName}
- Live Card Image URL: ${tableau.imageUrl}
- Symbolic Reference Description (approximate — use actual image as PRIMARY reference): ${tableau.originalPrompt}
- Core Essence: ${tableau.coreEssence}
- Core Verb: ${tableau.coreVerb}
- Central Tension: ${tableau.centralTension}
- Transformation: from "${tableau.transformation.from}" to "${tableau.transformation.to}"
- Primary Archetypes: ${JSON.stringify(tableau.primaryArchetypes)}
- Key Symbols: ${JSON.stringify(tableau.symbols)}
- Light Expression: ${tableau.lightExpression}
- Shadow Expression: ${tableau.shadowExpression}
- Invitation: ${tableau.invitation}
- Warning: ${tableau.warning}
- Interpretive Resonances: ${JSON.stringify(tableau.tarotResonances)}
- Visual Observations: ${JSON.stringify(tableau.visualObservations)}
- Prompt Observations: ${JSON.stringify(tableau.promptObservations)}`;
    };

    let prompt = "";
    let singleTableau: any = null;
    let pastTableau: any = null;
    let presentTableau: any = null;
    let futureTableau: any = null;

    if (isSingle) {
      singleTableau = getTableauById(selectedIds[0]);
      const tableauDesc = describeTableau(singleTableau);

      prompt = `
You are the interpretive guide for "Reading the Panorama".
"Reading the Panorama" is a symbolic, deeply personalized reading experience. Users select a single hidden card from the "Panorama" deck representing their focus.

User Query: "${cleanQuestion || "Silent Inquiry (no question asked)"}"

Selected Card Details:
${tableauDesc}

CRITICAL REQUIREMENT:
You MUST base your interpretation primarily on the ACTUAL IMAGE(S) provided. The card images attached to this request are the absolute source of truth for what each card visually depicts. Describe what you actually SEE in the image.
The metadata fields below (Title, Core Essence, Archetypes, etc.) serve as a symbolic interpretive framework and emotional vocabulary to guide your reading. However, the visual description ("Symbolic Template Description") may NOT exactly match the actual image — when there is any discrepancy, ALWAYS prioritize what you see in the real image.
Do not invent scenes or details that are not visible in the actual card image.

Generate a JSON response conforming strictly to this structure:
{
  "cards": {
    "Single": {
      "title": "Generate a unique poetic title inspired by what you SEE in the actual image (in the language of the query)",
      "coreVerb": "The exact core verb of this card (or its translation in Turkish if the query is in Turkish)",
      "coreEssence": "The exact core essence of this card (or its translation in Turkish if the query is in Turkish)",
      "centralTension": "The exact central tension of this card (or its translation in Turkish if the query is in Turkish)",
      "transformation": {
        "from": "The exact 'from' state of this card (or its translation in Turkish if the query is in Turkish)",
        "to": "The exact 'to' state of this card (or its translation in Turkish if the query is in Turkish)"
      },
      "primaryArchetypes": ["The exact archetypes of this card (or their translation in Turkish if the query is in Turkish)"],
      "symbols": ["The exact symbols of this card (or their translation in Turkish if the query is in Turkish)"],
      "lightExpression": "The exact light expression of this card (or its translation in Turkish if the query is in Turkish)",
      "shadowExpression": "The exact shadow expression of this card (or its translation in Turkish if the query is in Turkish)",
      "tarotResonances": ["The exact tarot resonances of this card (or their translation in Turkish if the query is in Turkish)"],
      "visualObservations": ["The exact visual observations of this card (or their translation in Turkish if the query is in Turkish)"],
      "promptObservations": ["The exact prompt observations of this card (or their translation in Turkish if the query is in Turkish)"],
      "originalPrompt": "The exact original prompt description of this card (or its translation in Turkish if the query is in Turkish)",
      "invitation": "The exact invitation of this card (or its translation in Turkish if the query is in Turkish)",
      "warning": "The exact warning of this card (or its translation in Turkish if the query is in Turkish)",
      "positionalInterpretation": "A clear, plain 1-2 sentence description of how this card represents the focal point of the query, written specifically for this user.",
      "contextualInterpretation": "A direct, clear 2-3 sentence interpretation of the card's visual symbols and its essence in relation to the query: ${cleanQuestion || "their situation"}."
    }
  },
  "synthesis": "A simple, poetic, yet very clear and plain 2-3 sentence summary of the narrative message of the card relating to the query: ${cleanQuestion || "their path"}.",
  "whatSees": "What the Panorama sees in this card (1 short, clean, direct sentence, related to the user's query).",
  "whatAsks": "What the Panorama asks you through this card (1 short, clean, direct question, related to the user's query).",
  "invitation": "The Panorama's overall invitation based on this card (1 short, clean, direct invite, related to the user's query)."
}

Respond ONLY with valid JSON. Do not include markdown code block syntax (like \`\`\`json) in your raw output.

READING VOICE AND WRITING STYLE RULES (CRITICAL):
1. THE ARTWORK MUST LEAD:
   The final reading must feel grounded in what you ACTUALLY SEE in the card image. Describe concrete visual details from the real image — colors, figures, landscapes, objects, lighting, mood. If the reading could still make sense without referencing specific visual elements you see in the image, it is too generic. Rewrite it.
   NOTE: The "Symbolic Template Description" field is an approximate description and may not perfectly match the actual image. Always describe what you see, not what the template says.

2. MANDATORY FOCUS ON USER'S QUESTION:
   If the user has written/asked a question, every interpretation, synthesis, and card commentary MUST be directly, deeply, and explicitly related to that question. There must be a clear, logical, and intuitive connection/bridge between the visual elements/symbols of the card and the user's query. Do not just describe or interpret the card in isolation; you must actively answer or address the user's question using the card's visual cues. The question must be the primary lens of the entire reading.

3. NEVER EXPOSE INTERNAL SYMBOLIC METADATA DIRECTLY IN THE TEXT INTERPRETATIONS:
   Do not quote or paraphrase the metadata fields mechanically inside the positionalInterpretation, contextualInterpretation, or synthesis fields. The metadata is for display in the metadata cards, not to be read like dry text.

4. INTERPRETATION STEPS:
   - LOOK AT THE SCENE: Begin with what is actually happening in the artwork based on the visual description (originalPrompt). Describe one or two concrete visual details that matter to the interpretation.
   - FIND THE HUMAN EXPERIENCE: Identify the human experience taking place in that scene.
   - CONNECT TO QUERY: Connect it naturally to the user's question.

5. KEEP THE LANGUAGE SIMPLE:
   Use clear, warm, contemporary, and intimate language. Prefer concrete sentences over abstract spiritual terminology.
   Avoid: overly mystical language, therapy-speak, corporate language, unnecessary philosophical jargon, excessive metaphors, or repeating the same idea in different words.
   STRICTLY avoid clichés like: "In your current life trajectory", "cosmic energies", "on your spiritual journey", "your life path", "universal flow", "your roadmap", "energetic plane".

6. LANGUAGE RULE (CRITICAL):
   If the User Query "${cleanQuestion || "Silent Inquiry"}" is in Turkish, or contains Turkish words, you MUST write all text values in the JSON response in Turkish (translate all generated fields like title, coreVerb, coreEssence, centralTension, transformation.from, transformation.to, primaryArchetypes, symbols, lightExpression, shadowExpression, tarotResonances, visualObservations, promptObservations, originalPrompt, invitation, warning, positionalInterpretation, contextualInterpretation, synthesis, whatSees, whatAsks, overall invitation, etc. into poetic, natural Turkish). If the query is in English or is a Silent Inquiry, write in English.

7. DYNAMIC VARIETY RULE (CRITICAL):
    This card is "${singleTableau.dateName}" — a unique panorama with its own distinct image. You MUST generate completely unique, customized descriptions, metaphors, and interpretations based on what you actually SEE in the image. Do not reuse any interpretation from any other reading. Vary the emotional focus, the visual focus, and the advice so that the user gets a completely fresh experience.
`;
    } else {
      pastTableau = getTableauById(selectedIds[0]);
      presentTableau = getTableauById(selectedIds[1]);
      futureTableau = getTableauById(selectedIds[2]);

      const pastDesc = describeTableau(pastTableau);
      const presentDesc = describeTableau(presentTableau);
      const futureDesc = describeTableau(futureTableau);

      prompt = `
You are the interpretive guide for "Reading the Panorama".
"Reading the Panorama" is a symbolic, deeply personalized reading experience. Users select three hidden cards from the "Panorama" collection representing Past, Present, and Future.

User Query: "${cleanQuestion || "Silent Inquiry (no question asked)"}"

Selected Cards Details:

1. PAST:
${pastDesc}

2. PRESENT:
${presentDesc}

3. FUTURE:
${futureDesc}

CRITICAL REQUIREMENT:
You MUST base your interpretation primarily on the ACTUAL IMAGES provided. The card images attached to this request are the absolute source of truth for what each card visually depicts. Describe what you actually SEE in each image.
The metadata fields below (Title, Core Essence, Archetypes, etc.) serve as a symbolic interpretive framework and emotional vocabulary to guide your reading. However, the visual description ("Symbolic Template Description") may NOT exactly match the actual image — when there is any discrepancy, ALWAYS prioritize what you see in the real images.
Do not invent scenes or details that are not visible in the actual card images.

Generate a JSON response conforming strictly to this structure:
{
  "cards": {
    "Past": {
      "title": "Generate a unique poetic title inspired by what you SEE in the Past card image (in the language of the query)",
      "coreVerb": "The exact core verb of the Past card (or its translation in Turkish if the query is in Turkish)",
      "coreEssence": "The exact core essence of the Past card (or its translation in Turkish if the query is in Turkish)",
      "centralTension": "The exact central tension of the Past card (or its translation in Turkish if the query is in Turkish)",
      "transformation": {
        "from": "The exact 'from' state of the Past card (or its translation in Turkish if the query is in Turkish)",
        "to": "The exact 'to' state of the Past card (or its translation in Turkish if the query is in Turkish)"
      },
      "primaryArchetypes": ["The exact archetypes of the Past card (or their translation in Turkish if the query is in Turkish)"],
      "symbols": ["The exact symbols of the Past card (or their translation in Turkish if the query is in Turkish)"],
      "lightExpression": "The exact light expression of the Past card (or its translation in Turkish if the query is in Turkish)",
      "shadowExpression": "The exact shadow expression of the Past card (or its translation in Turkish if the query is in Turkish)",
      "tarotResonances": ["The exact tarot resonances of the Past card (or their translation in Turkish if the query is in Turkish)"],
      "visualObservations": ["The exact visual observations of the Past card (or their translation in Turkish if the query is in Turkish)"],
      "promptObservations": ["The exact prompt observations of the Past card (or their translation in Turkish if the query is in Turkish)"],
      "originalPrompt": "The exact original prompt description of the Past card (or its translation in Turkish if the query is in Turkish)",
      "invitation": "The exact invitation of the Past card (or its translation in Turkish if the query is in Turkish)",
      "warning": "The exact warning of the Past card (or its translation in Turkish if the query is in Turkish)",
      "positionalInterpretation": "A clear, plain 1-2 sentence description of how this position represents the roots/foundation of the query.",
      "contextualInterpretation": "A direct, clear 2-3 sentence interpretation of the card's visual symbols and its essence in relation to the query: ${cleanQuestion || "their situation"}."
    },
    "Present": {
      "title": "Generate a unique poetic title inspired by what you SEE in the Present card image (in the language of the query)",
      "coreVerb": "The exact core verb of the Present card (or its translation in Turkish if the query is in Turkish)",
      "coreEssence": "The exact core essence of the Present card (or its translation in Turkish if the query is in Turkish)",
      "centralTension": "The exact central tension of the Present card (or its translation in Turkish if the query is in Turkish)",
      "transformation": {
        "from": "The exact 'from' state of the Present card (or its translation in Turkish if the query is in Turkish)",
        "to": "The exact 'to' state of the Present card (or its translation in Turkish if the query is in Turkish)"
      },
      "primaryArchetypes": ["The exact archetypes of the Present card (or their translation in Turkish if the query is in Turkish)"],
      "symbols": ["The exact symbols of the Present card (or their translation in Turkish if the query is in Turkish)"],
      "lightExpression": "The exact light expression of the Present card (or its translation in Turkish if the query is in Turkish)",
      "shadowExpression": "The exact shadow expression of the Present card (or its translation in Turkish if the query is in Turkish)",
      "tarotResonances": ["The exact tarot resonances of the Present card (or their translation in Turkish if the query is in Turkish)"],
      "visualObservations": ["The exact visual observations of the Present card (or their translation in Turkish if the query is in Turkish)"],
      "promptObservations": ["The exact prompt observations of the Present card (or their translation in Turkish if the query is in Turkish)"],
      "originalPrompt": "The exact original prompt description of the Present card (or its translation in Turkish if the query is in Turkish)",
      "invitation": "The exact invitation of the Present card (or its translation in Turkish if the query is in Turkish)",
      "warning": "The exact warning of the Present card (or its translation in Turkish if the query is in Turkish)",
      "positionalInterpretation": "A clear, plain 1-2 sentence description of how this position represents the current active state/challenges.",
      "contextualInterpretation": "A direct, clear 2-3 sentence interpretation of the card's visual symbols and its essence in relation to the query: ${cleanQuestion || "their situation"}."
    },
    "Future": {
      "title": "Generate a unique poetic title inspired by what you SEE in the Future card image (in the language of the query)",
      "coreVerb": "The exact core verb of the Future card (or its translation in Turkish if the query is in Turkish)",
      "coreEssence": "The exact core essence of the Future card (or its translation in Turkish if the query is in Turkish)",
      "centralTension": "The exact central tension of the Future card (or its translation in Turkish if the query is in Turkish)",
      "transformation": {
        "from": "The exact 'from' state of the Future card (or its translation in Turkish if the query is in Turkish)",
        "to": "The exact 'to' state of the Future card (or its translation in Turkish if the query is in Turkish)"
      },
      "primaryArchetypes": ["The exact archetypes of the Future card (or their translation in Turkish if the query is in Turkish)"],
      "symbols": ["The exact symbols of the Future card (or their translation in Turkish if the query is in Turkish)"],
      "lightExpression": "The exact light expression of the Future card (or its translation in Turkish if the query is in Turkish)",
      "shadowExpression": "The exact shadow expression of the Future card (or its translation in Turkish if the query is in Turkish)",
      "tarotResonances": ["The exact tarot resonances of the Future card (or their translation in Turkish if the query is in Turkish)"],
      "visualObservations": ["The exact visual observations of the Future card (or their translation in Turkish if the query is in Turkish)"],
      "promptObservations": ["The exact prompt observations of the Future card (or their translation in Turkish if the query is in Turkish)"],
      "originalPrompt": "The exact original prompt description of the Future card (or its translation in Turkish if the query is in Turkish)",
      "invitation": "The exact invitation of the Future card (or its translation in Turkish if the query is in Turkish)",
      "warning": "The exact warning of the Future card (or its translation in Turkish if the query is in Turkish)",
      "positionalInterpretation": "A clear, plain 1-2 sentence description of how this position represents the future direction/advice.",
      "contextualInterpretation": "A direct, clear 2-3 sentence interpretation of the card's visual symbols and its essence in relation to the query: ${cleanQuestion || "their situation"}."
    }
  },
  "relationshipAnalysis": "A clean, direct 2-3 sentence analysis of the visual transition between the three images (crowd/density changes, open vs. closed spaces).",
  "synthesis": "A simple, poetic, yet very clear and plain 2-3 sentence summary of the narrative arc (Past -> Present -> Future) relating to the query: ${cleanQuestion || "their path"}.",
  "whatSees": "What the Panorama sees (1 short, clean, direct sentence).",
  "whatAsks": "What the Panorama asks (1 short, clean, direct question).",
  "invitation": "The Panorama's overall invitation (1 short, clean, direct invite)."
}

Respond ONLY with valid JSON. Do not include markdown code block syntax (like \`\`\`json) in your raw output.

READING VOICE AND WRITING STYLE RULES (CRITICAL):
1. THE ARTWORK MUST LEAD:
   The final reading must feel grounded in what you ACTUALLY SEE in the card images. Describe concrete visual details from the real images — colors, figures, landscapes, objects, lighting, mood. If the reading could still make sense without referencing specific visual elements you see in the images, it is too generic. Rewrite it.
   NOTE: The "Symbolic Template Description" fields are approximate descriptions and may not perfectly match the actual images. Always describe what you see, not what the template says.

2. MANDATORY FOCUS ON USER'S QUESTION:
   If the user has written/asked a question, every interpretation, synthesis, relationship analysis, and card commentary MUST be directly, deeply, and explicitly related to that question. There must be a clear, logical, and intuitive connection/bridge between the visual elements/symbols of the cards and the user's query. Do not just describe or interpret the cards in isolation; you must actively answer or address the user's question using the cards' visual cues. The question must be the primary lens of the entire reading.

3. NEVER EXPOSE INTERNAL SYMBOLIC METADATA DIRECTLY IN THE TEXT INTERPRETATIONS:
   Do not quote or paraphrase the metadata fields mechanically inside the positionalInterpretation, contextualInterpretation, relationshipAnalysis, or synthesis fields. The metadata is for display in the metadata cards, not to be read like dry text.

4. INTERPRETATION STEPS:
   - LOOK AT THE SCENES: Begin with what is actually happening in the artwork based on the visual description. Describe one or two concrete visual details that matter to the interpretation.
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

6. LANGUAGE RULE (CRITICAL):
   If the User Query "${cleanQuestion || "Silent Inquiry"}" is in Turkish, or contains Turkish words, you MUST write all text values in the JSON response in Turkish (translate all generated fields like title, coreVerb, coreEssence, centralTension, transformation.from, transformation.to, primaryArchetypes, symbols, lightExpression, shadowExpression, tarotResonances, visualObservations, promptObservations, originalPrompt, invitation, warning, positionalInterpretation, contextualInterpretation, relationshipAnalysis, synthesis, whatSees, whatAsks, overall invitation, etc. into poetic, natural Turkish). If the query is in English or is a Silent Inquiry, write in English.

7. DYNAMIC VARIETY RULE (CRITICAL):
    The selected cards are unique panoramas: Past ("${pastTableau.dateName}"), Present ("${presentTableau.dateName}"), Future ("${futureTableau.dateName}"). Each has its own distinct image. You MUST generate completely unique descriptions, metaphors, and interpretations based on what you actually SEE in each image. Do not reuse any interpretation from any other reading. Vary the focus, emotional tone, and specific angle of the advice so that no two readings ever feel identical.
`;
    }

    // List of fallback models to try if the primary model fails or is rate-limited
    const modelCandidates = Array.from(new Set([
      OPENROUTER_MODEL,
      "moonshotai/kimi-k2.6",
      "moonshotai/kimi-k3",
      "qwen/qwen3-vl-8b-instruct",
      "google/gemma-4-31b-it:free",
      "openrouter/auto"
    ]));

    let openRouterRes: Response | null = null;
    let successfulModel = "";
    let openRouterData: any = null;

    for (const model of modelCandidates) {
      logDebug(`Attempting to send request to OpenRouter API with model: ${model}`);
      const MAX_RETRIES = 3;
      const RETRY_DELAYS = [3000, 6000, 12000]; // 3s, 6s, 12s
      let tempRes: Response | null = null;
      let success = false;

      for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        try {
          let maxTokens = 2048;
          if (model.includes("kimi")) {
            maxTokens = 1000;
          } else if (model.includes("gemini")) {
            maxTokens = 8192;
          }

          // Build message content: use vision (image+text) for capable models, text-only otherwise
          const useVision = isVisionCapable(model);
          let messageContent: any;

          if (useVision) {
            // Collect all card image URLs
            const imageUrls: string[] = [];
            if (isSingle && singleTableau) {
              imageUrls.push(singleTableau.imageUrl);
            } else {
              if (pastTableau) imageUrls.push(pastTableau.imageUrl);
              if (presentTableau) imageUrls.push(presentTableau.imageUrl);
              if (futureTableau) imageUrls.push(futureTableau.imageUrl);
            }

            // Build multi-modal content array: images first, then text prompt
            messageContent = [
              ...imageUrls.map((url, idx) => ({
                type: "image_url" as const,
                image_url: { url, detail: "high" as const },
              })),
              { type: "text" as const, text: prompt },
            ];
            logDebug(`Using VISION mode with ${imageUrls.length} image(s) for model ${model}`);
          } else {
            messageContent = prompt;
            logDebug(`Using TEXT-ONLY mode for model ${model}`);
          }

          tempRes = await fetch(OPENROUTER_API_URL, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${apiKey}`,
              "HTTP-Referer": "https://panorama.garden",
              "X-Title": "Reading the Panorama",
            },
            body: JSON.stringify({
              model: model,
              messages: [
                {
                  role: "user",
                  content: messageContent,
                }
              ],
              temperature: 0.8,
              max_tokens: maxTokens,
              include_reasoning: false,
              reasoning: {
                exclude: true
              }
            }),
          });

          logDebug(`OpenRouter API response code for model ${model}: ${tempRes.status} (attempt ${attempt + 1}/${MAX_RETRIES})`);

          if (tempRes.status === 429 && attempt < MAX_RETRIES - 1) {
            const waitMs = RETRY_DELAYS[attempt];
            logDebug(`Rate limited (429) for model ${model}. Waiting ${waitMs / 1000}s before retry...`);
            await new Promise(resolve => setTimeout(resolve, waitMs));
            continue;
          }

          if (tempRes.ok) {
            success = true;
            break;
          } else {
            const errText = await tempRes.text();
            logDebug(`Failed attempt for model ${model}: Status ${tempRes.status} | Body: ${errText}`);
            break; // Try next model
          }
        } catch (fetchErr: any) {
          logDebug(`Network or fetch error for model ${model} (attempt ${attempt + 1}): ${fetchErr?.message || fetchErr}`);
          if (attempt < MAX_RETRIES - 1) {
            const waitMs = RETRY_DELAYS[attempt];
            await new Promise(resolve => setTimeout(resolve, waitMs));
            continue;
          }
        }
      }

      if (success && tempRes && tempRes.ok) {
        try {
          openRouterData = await tempRes.json();
          if (openRouterData && openRouterData.choices?.[0]?.message?.content) {
            openRouterRes = tempRes;
            successfulModel = model;
            break; // Succeeded! Break the candidate models loop.
          } else {
            logDebug(`Response for model ${model} JSON parsed, but choices/content was empty. Raw: ${JSON.stringify(openRouterData)}`);
          }
        } catch (jsonErr: any) {
          logDebug(`JSON parse failed for model ${model} response: ${jsonErr?.message || jsonErr}`);
        }
      }
    }

    if (!openRouterRes || !openRouterData) {
      logDebug("Error: All OpenRouter API candidate models failed or returned empty responses.");
      return NextResponse.json({ success: false, reason: "ALL_MODELS_FAILED" });
    }

    const responseText = openRouterData?.choices?.[0]?.message?.content;

    if (!responseText) {
      logDebug(`OpenRouter API response choices empty or missing content. Raw data: ${JSON.stringify(openRouterData)}`);
      console.error("No text returned from OpenRouter API:", JSON.stringify(openRouterData));
      return NextResponse.json({ success: false, reason: "EMPTY_RESPONSE" });
    }

    logDebug(`Received raw text response (length: ${responseText.length}) using model: ${successfulModel}`);

    // Clean response text: robust JSON extraction
    let cleanedResponse = responseText.trim();
    const firstBrace = cleanedResponse.indexOf("{");
    const lastBrace = cleanedResponse.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      cleanedResponse = cleanedResponse.substring(firstBrace, lastBrace + 1);
    }
    cleanedResponse = cleanedResponse.trim();

    let parsedResponse: any = null;
    try {
      parsedResponse = JSON.parse(cleanedResponse);
      logDebug(`Parsed OpenRouter response: ${JSON.stringify(parsedResponse, null, 2)}`);
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
              primaryArchetypes: safeArrayOfStrings(parsedResponse.cards?.Single?.primaryArchetypes),
              secondaryArchetypes: [],
              symbols: safeArrayOfStrings(parsedResponse.cards?.Single?.symbols),
              lightExpression: parsedResponse.cards?.Single?.lightExpression || "",
              shadowExpression: parsedResponse.cards?.Single?.shadowExpression || "",
              invitation: parsedResponse.cards?.Single?.invitation || "",
              warning: parsedResponse.cards?.Single?.warning || "",
              supportedMeanings: [],
              unsupportedMeanings: [],
              tarotResonances: safeArrayOfStrings(parsedResponse.cards?.Single?.tarotResonances),
              visualObservations: safeArrayOfStrings(parsedResponse.cards?.Single?.visualObservations),
              promptObservations: safeArrayOfStrings(parsedResponse.cards?.Single?.promptObservations),
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
              primaryArchetypes: safeArrayOfStrings(parsedResponse.cards?.Past?.primaryArchetypes),
              secondaryArchetypes: [],
              symbols: safeArrayOfStrings(parsedResponse.cards?.Past?.symbols),
              lightExpression: parsedResponse.cards?.Past?.lightExpression || "",
              shadowExpression: parsedResponse.cards?.Past?.shadowExpression || "",
              invitation: parsedResponse.cards?.Past?.invitation || "",
              warning: parsedResponse.cards?.Past?.warning || "",
              supportedMeanings: [],
              unsupportedMeanings: [],
              tarotResonances: safeArrayOfStrings(parsedResponse.cards?.Past?.tarotResonances),
              visualObservations: safeArrayOfStrings(parsedResponse.cards?.Past?.visualObservations),
              promptObservations: safeArrayOfStrings(parsedResponse.cards?.Past?.promptObservations),
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
              primaryArchetypes: safeArrayOfStrings(parsedResponse.cards?.Present?.primaryArchetypes),
              secondaryArchetypes: [],
              symbols: safeArrayOfStrings(parsedResponse.cards?.Present?.symbols),
              lightExpression: parsedResponse.cards?.Present?.lightExpression || "",
              shadowExpression: parsedResponse.cards?.Present?.shadowExpression || "",
              invitation: parsedResponse.cards?.Present?.invitation || "",
              warning: parsedResponse.cards?.Present?.warning || "",
              supportedMeanings: [],
              unsupportedMeanings: [],
              tarotResonances: safeArrayOfStrings(parsedResponse.cards?.Present?.tarotResonances),
              visualObservations: safeArrayOfStrings(parsedResponse.cards?.Present?.visualObservations),
              promptObservations: safeArrayOfStrings(parsedResponse.cards?.Present?.promptObservations),
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
              primaryArchetypes: safeArrayOfStrings(parsedResponse.cards?.Future?.primaryArchetypes),
              secondaryArchetypes: [],
              symbols: safeArrayOfStrings(parsedResponse.cards?.Future?.symbols),
              lightExpression: parsedResponse.cards?.Future?.lightExpression || "",
              shadowExpression: parsedResponse.cards?.Future?.shadowExpression || "",
              invitation: parsedResponse.cards?.Future?.invitation || "",
              warning: parsedResponse.cards?.Future?.warning || "",
              supportedMeanings: [],
              unsupportedMeanings: [],
              tarotResonances: safeArrayOfStrings(parsedResponse.cards?.Future?.tarotResonances),
              visualObservations: safeArrayOfStrings(parsedResponse.cards?.Future?.visualObservations),
              promptObservations: safeArrayOfStrings(parsedResponse.cards?.Future?.promptObservations),
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

    logDebug(`Reading generated and parsed successfully via OpenRouter using model ${successfulModel}. Returning success.`);
    return NextResponse.json({ success: true, reading, modelUsed: successfulModel });
  } catch (err: any) {
    logDebug(`Exception in API route: ${err?.message || err}\nStack: ${err?.stack || ""}`);
    console.error("Error generating OpenRouter reading:", err);
    return NextResponse.json({ success: false, reason: "API_ERROR" });
  }
}
