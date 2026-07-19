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

function extractValidJson(text: string): string {
  const firstBrace = text.indexOf("{");
  if (firstBrace === -1) return text;
  
  let braceCount = 0;
  let inString = false;
  let escapeNext = false;
  
  for (let i = firstBrace; i < text.length; i++) {
    const char = text[i];
    
    if (escapeNext) {
      escapeNext = false;
      continue;
    }
    
    if (char === "\\") {
      escapeNext = true;
      continue;
    }
    
    if (char === '"') {
      inString = !inString;
      continue;
    }
    
    if (!inString) {
      if (char === "{") {
        braceCount++;
      } else if (char === "}") {
        braceCount--;
        if (braceCount === 0) {
          return text.substring(firstBrace, i + 1);
        }
      }
    }
  }
  
  // Fallback to lastIndex if matching brace count didn't close (e.g. if truncated)
  const lastBrace = text.lastIndexOf("}");
  if (lastBrace !== -1 && lastBrace > firstBrace) {
    return text.substring(firstBrace, lastBrace + 1);
  }
  
  return text;
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

    // Rate limit check disabled

    const apiKey = process.env.OPENROUTER_API_KEY;

    if (!apiKey) {
      logDebug("Error: No OPENROUTER_API_KEY found in process.env.");
      console.log("No OPENROUTER_API_KEY found in environment variables. Using offline fallback.");
      return NextResponse.json({ success: false, reason: "NO_API_KEY" });
    }

    logDebug(`OPENROUTER_API_KEY is present (length: ${apiKey.length}, starts with: ${apiKey.substring(0, 10)}...)`);
    logDebug(`Using model: ${OPENROUTER_MODEL}`);

    const cleanQuestion = question && question.trim() !== "" ? question.trim() : null;
    
    // Turkish vs English logic:
    // Only if the question begins with "Türkçe:" or "Turkce:" (case-insensitive),
    // it will be interpreted in Turkish. Otherwise, default is English.
    const isTurkishRequested = cleanQuestion ? /^(türkçe|turkce):\s*/i.test(cleanQuestion) : false;
    
    // Extract actual query text if "Türkçe:" prefix is present
    let actualQuestion = cleanQuestion;
    if (isTurkishRequested && cleanQuestion) {
      const prefixMatch = cleanQuestion.match(/^(türkçe|turkce):\s*/i);
      if (prefixMatch) {
        actualQuestion = cleanQuestion.substring(prefixMatch[0].length).trim();
      }
    }
    const cleanActualQuestion = actualQuestion && actualQuestion.trim() !== "" ? actualQuestion.trim() : null;

    const isSingle = selectedIds.length === 1;

    // Helper to translate Turkish month names to English for English mode
    const translateDateToEnglish = (dateStr: string): string => {
      if (!dateStr) return dateStr;
      const monthMap: Record<string, string> = {
        "Ocak": "January",
        "Şubat": "February",
        "Mart": "March",
        "Nisan": "April",
        "Mayıs": "May",
        "Haziran": "June",
        "Temmuz": "July",
        "Ağustos": "August",
        "Eylül": "September",
        "Ekim": "October",
        "Kasım": "November",
        "Aralık": "December"
      };
      let result = dateStr;
      for (const [tr, en] of Object.entries(monthMap)) {
        result = result.replace(tr, en);
      }
      return result;
    };

    // Build tableau descriptions for the prompt — using date name as primary card identity
    const describeTableau = (tableau: any) => {
      const cardName = isTurkishRequested ? (tableau.dateName || tableau.title) : translateDateToEnglish(tableau.dateName || tableau.title);
      
      if (!tableau.isPredefined) {
        return `Card: "${cardName}"
- Card Date Name: ${cardName}
- Live Card Image URL: ${tableau.imageUrl}
- Predefined Metadata/Theme Status: None (This is a unique daily painting).
- Instructions: You MUST look at the actual image at the provided URL. There is no predefined text description or template for this day. You are the sole interpreter. Describe what you actually see in the image as the "originalPrompt" field and generate all other metadata fields (poetic title, symbols, coreEssence, etc.) dynamically from the visual contents of the artwork.`;
      }

      return `Card: "${cardName}"
- Card Date Name: ${cardName}
- Live Card Image URL: ${tableau.imageUrl}
- Predefined Metadata/Theme Status: Predefined Template Active.
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

User Query: "${cleanActualQuestion || "Silent Inquiry (no question asked)"}"

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
      "title": "${isTurkishRequested ? "Generate a unique poetic title inspired by what you SEE in the actual image (in Turkish)" : "Generate a unique poetic title inspired by what you SEE in the actual image (in English)"}",
      "coreVerb": "${isTurkishRequested ? "The exact core verb of this card, translated into Turkish" : "The exact core verb of this card in English"}",
      "coreEssence": "${isTurkishRequested ? "The exact core essence of this card, translated into Turkish" : "The exact core essence of this card in English"}",
      "centralTension": "${isTurkishRequested ? "The exact central tension of this card, translated into Turkish" : "The exact central tension of this card in English"}",
      "transformationFrom": "${isTurkishRequested ? "The exact 'from' state of this card, translated into Turkish" : "The exact 'from' state of this card in English"}",
      "transformationTo": "${isTurkishRequested ? "The exact 'to' state of this card, translated into Turkish" : "The exact 'to' state of this card in English"}",
      "primaryArchetypes": ["${isTurkishRequested ? "The exact archetypes of this card, translated into Turkish" : "The exact archetypes of this card in English"}"],
      "symbols": ["${isTurkishRequested ? "The exact symbols of this card, translated into Turkish" : "The exact symbols of this card in English"}"],
      "lightExpression": "${isTurkishRequested ? "The exact light expression of this card, translated into Turkish" : "The exact light expression of this card in English"}",
      "shadowExpression": "${isTurkishRequested ? "The exact shadow expression of this card, translated into Turkish" : "The exact shadow expression of this card in English"}",
      "tarotResonances": ["${isTurkishRequested ? "The exact tarot resonances of this card, translated into Turkish" : "The exact tarot resonances of this card in English"}"],
      "visualObservations": ["${isTurkishRequested ? "The exact visual observations of this card, translated into Turkish" : "The exact visual observations of this card in English"}"],
      "promptObservations": ["${isTurkishRequested ? "The exact prompt observations of this card, translated into Turkish" : "The exact prompt observations of this card in English"}"],
      "originalPrompt": "${isTurkishRequested ? "The exact original prompt description of this card, translated into Turkish" : "The exact original prompt description of this card in English"}",
      "invitation": "${isTurkishRequested ? "The exact invitation of this card, translated into Turkish" : "The exact invitation of this card in English"}",
      "warning": "${isTurkishRequested ? "The exact warning of this card, translated into Turkish" : "The exact warning of this card in English"}",
      "positionalInterpretation": "${isTurkishRequested ? "A clear, plain 2-3 sentences description of how this card represents the focal point of the query, written specifically for this user in Turkish." : "A clear, plain 2-3 sentences description of how this card represents the focal point of the query, written specifically for this user in English."}",
      "contextualInterpretation": "${isTurkishRequested ? `A direct, clear 3-5 sentences interpretation of the card's visual symbols and its essence in relation to the query: ${cleanActualQuestion || 'their situation'}, in Turkish.` : `A direct, clear 3-5 sentences interpretation of the card's visual symbols and its essence in relation to the query: ${cleanActualQuestion || 'their situation'}, in English.`}"
    }
  },
  "synthesis": "${isTurkishRequested ? `A simple, poetic, yet very clear and plain 3-5 sentences summary of the narrative message of the card relating to the query: ${cleanActualQuestion || 'their path'}, in Turkish.` : `A simple, poetic, yet very clear and plain 3-5 sentences summary of the narrative message of the card relating to the query: ${cleanActualQuestion || 'their path'}, in English.`}",
  "whatSees": "${isTurkishRequested ? "What the Panorama sees in this card (1 short, clean, direct sentence, related to the user's query), in Turkish." : "What the Panorama sees in this card (1 short, clean, direct sentence, related to the user's query), in English."}",
  "whatAsks": "${isTurkishRequested ? "What the Panorama asks you through this card (1 short, clean, direct question, related to the user's query), in Turkish." : "What the Panorama asks you through this card (1 short, clean, direct question, related to the user's query), in English."}",
  "invitation": "${isTurkishRequested ? "The Panorama's overall invitation based on this card (1 short, clean, direct invite, related to the user's query), in Turkish." : "The Panorama's overall invitation based on this card (1 short, clean, direct invite, related to the user's query), in English."}"
}

Respond ONLY with valid JSON. Do not include markdown code block syntax (like \`\`\`json) in your raw output.

READING VOICE AND WRITING STYLE RULES (CRITICAL):
1. THE ARTWORK MUST LEAD:
   The final reading must feel grounded in what you ACTUALLY SEE in the card image. Describe concrete visual details from the real image — colors, figures, landscapes, objects, lighting, mood. If the reading could still make sense without referencing specific visual elements you see in the image, it is too generic. Rewrite it.
   NOTE: The "Symbolic Template Description" field is an approximate description and may not perfectly match the actual image. Always describe what you see, not what the template says.

2. MANDATORY FOCUS ON USER'S QUESTION:
   If the user has written/asked a question, every interpretation, synthesis, and card commentary MUST be directly, deeply, and explicitly related to that question. There must be a clear, logical, and intuitive connection/bridge between the visual elements/symbols of the card and the user's query. Do not just describe or interpret the card in isolation; you must actively answer or address the user's question using the card's visual cues. The question must be the primary lens of the entire reading.
   CRITICAL: Do NOT mechanically repeat or mention the user's question at the beginning of every card's interpretation. The connection to the question must be woven smoothly and naturally into the narrative of the interpretation without formulaic phrasing or repetitive citations at the start of the text blocks.

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

${
  isTurkishRequested ? `6. LANGUAGE RULE (CRITICAL):
   The user has explicitly requested the response in Turkish. You MUST translate all text values in the JSON response to Turkish (translate all generated fields like title, coreVerb, coreEssence, centralTension, transformation.from, transformation.to, primaryArchetypes, symbols, lightExpression, shadowExpression, tarotResonances, visualObservations, promptObservations, originalPrompt, invitation, warning, positionalInterpretation, contextualInterpretation, synthesis, whatSees, whatAsks, overall invitation, etc. into poetic, natural Turkish). Write all generated texts and translations in Turkish.`
  : `6. LANGUAGE RULE (CRITICAL):
   You MUST write all text values in the JSON response in English. Translate all metadata fields (like title, coreVerb, coreEssence, centralTension, transformation.from, transformation.to, primaryArchetypes, symbols, lightExpression, shadowExpression, tarotResonances, visualObservations, promptObservations, originalPrompt, invitation, warning, positionalInterpretation, contextualInterpretation, synthesis, whatSees, whatAsks, overall invitation, etc.) into English. The entire response must be strictly in English. Do NOT use Turkish.`
}

7. DYNAMIC VARIETY RULE (CRITICAL):
    This card is "${isTurkishRequested ? singleTableau.dateName : translateDateToEnglish(singleTableau.dateName)}" — a unique panorama with its own distinct image. You MUST generate completely unique, customized descriptions, metaphors, and interpretations based on what you actually SEE in the image. Do not reuse any interpretation from any other reading. Vary the emotional focus, the visual focus, and the advice so that the user gets a completely fresh experience.
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

User Query: "${cleanActualQuestion || "Silent Inquiry (no question asked)"}"

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
      "title": "${isTurkishRequested ? "Generate a unique poetic title inspired by what you SEE in the Past card image (in Turkish)" : "Generate a unique poetic title inspired by what you SEE in the Past card image (in English)"}",
      "coreVerb": "${isTurkishRequested ? "The exact core verb of the Past card, translated into Turkish" : "The exact core verb of the Past card in English"}",
      "coreEssence": "${isTurkishRequested ? "The exact core essence of the Past card, translated into Turkish" : "The exact core essence of the Past card in English"}",
      "centralTension": "${isTurkishRequested ? "The exact central tension of the Past card, translated into Turkish" : "The exact central tension of the Past card in English"}",
      "transformationFrom": "${isTurkishRequested ? "The exact 'from' state of the Past card, translated into Turkish" : "The exact 'from' state of the Past card in English"}",
      "transformationTo": "${isTurkishRequested ? "The exact 'to' state of the Past card, translated into Turkish" : "The exact 'to' state of the Past card in English"}",
      "primaryArchetypes": ["${isTurkishRequested ? "The exact archetypes of the Past card, translated into Turkish" : "The exact archetypes of the Past card in English"}"],
      "symbols": ["${isTurkishRequested ? "The exact symbols of the Past card, translated into Turkish" : "The exact symbols of the Past card in English"}"],
      "lightExpression": "${isTurkishRequested ? "The exact light expression of the Past card, translated into Turkish" : "The exact light expression of the Past card in English"}",
      "shadowExpression": "${isTurkishRequested ? "The exact shadow expression of the Past card, translated into Turkish" : "The exact shadow expression of the Past card in English"}",
      "tarotResonances": ["${isTurkishRequested ? "The exact tarot resonances of the Past card, translated into Turkish" : "The exact tarot resonances of the Past card in English"}"],
      "visualObservations": ["${isTurkishRequested ? "The exact visual observations of the Past card, translated into Turkish" : "The exact visual observations of the Past card in English"}"],
      "promptObservations": ["${isTurkishRequested ? "The exact prompt observations of the Past card, translated into Turkish" : "The exact prompt observations of the Past card in English"}"],
      "originalPrompt": "${isTurkishRequested ? "The exact original prompt description of the Past card, translated into Turkish" : "The exact original prompt description of the Past card in English"}",
      "invitation": "${isTurkishRequested ? "The exact invitation of the Past card, translated into Turkish" : "The exact invitation of the Past card in English"}",
      "warning": "${isTurkishRequested ? "The exact warning of the Past card, translated into Turkish" : "The exact warning of the Past card in English"}",
      "positionalInterpretation": "${isTurkishRequested ? "A clear, plain 2-3 sentences description of how this position represents the roots/foundation of the query in Turkish." : "A clear, plain 2-3 sentences description of how this position represents the roots/foundation of the query in English."}",
      "contextualInterpretation": "${isTurkishRequested ? `A direct, clear 3-5 sentences interpretation of the card's visual symbols and its essence in relation to the query: ${cleanActualQuestion || 'their situation'}, in Turkish.` : `A direct, clear 3-5 sentences interpretation of the card's visual symbols and its essence in relation to the query: ${cleanActualQuestion || 'their situation'}, in English.`}"
    },
    "Present": {
      "title": "${isTurkishRequested ? "Generate a unique poetic title inspired by what you SEE in the Present card image (in Turkish)" : "Generate a unique poetic title inspired by what you SEE in the Present card image (in English)"}",
      "coreVerb": "${isTurkishRequested ? "The exact core verb of the Present card, translated into Turkish" : "The exact core verb of the Present card in English"}",
      "coreEssence": "${isTurkishRequested ? "The exact core essence of the Present card, translated into Turkish" : "The exact core essence of the Present card in English"}",
      "centralTension": "${isTurkishRequested ? "The exact central tension of the Present card, translated into Turkish" : "The exact central tension of the Present card in English"}",
      "transformationFrom": "${isTurkishRequested ? "The exact 'from' state of the Present card, translated into Turkish" : "The exact 'from' state of the Present card in English"}",
      "transformationTo": "${isTurkishRequested ? "The exact 'to' state of the Present card, translated into Turkish" : "The exact 'to' state of the Present card in English"}",
      "primaryArchetypes": ["${isTurkishRequested ? "The exact archetypes of the Present card, translated into Turkish" : "The exact archetypes of the Present card in English"}"],
      "symbols": ["${isTurkishRequested ? "The exact symbols of the Present card, translated into Turkish" : "The exact symbols of the Present card in English"}"],
      "lightExpression": "${isTurkishRequested ? "The exact light expression of the Present card, translated into Turkish" : "The exact light expression of the Present card in English"}",
      "shadowExpression": "${isTurkishRequested ? "The exact shadow expression of the Present card, translated into Turkish" : "The exact shadow expression of the Present card in English"}",
      "tarotResonances": ["${isTurkishRequested ? "The exact tarot resonances of the Present card, translated into Turkish" : "The exact tarot resonances of the Present card in English"}"],
      "visualObservations": ["${isTurkishRequested ? "The exact visual observations of the Present card, translated into Turkish" : "The exact visual observations of the Present card in English"}"],
      "promptObservations": ["${isTurkishRequested ? "The exact prompt observations of the Present card, translated into Turkish" : "The exact prompt observations of the Present card in English"}"],
      "originalPrompt": "${isTurkishRequested ? "The exact original prompt description of the Present card, translated into Turkish" : "The exact original prompt description of the Present card in English"}",
      "invitation": "${isTurkishRequested ? "The exact invitation of the Present card, translated into Turkish" : "The exact invitation of the Present card in English"}",
      "warning": "${isTurkishRequested ? "The exact warning of the Present card, translated into Turkish" : "The exact warning of the Present card in English"}",
      "positionalInterpretation": "${isTurkishRequested ? "A clear, plain 2-3 sentences description of how this position represents the current active state/challenges in Turkish." : "A clear, plain 2-3 sentences description of how this position represents the current active state/challenges in English."}",
      "contextualInterpretation": "${isTurkishRequested ? `A direct, clear 3-5 sentences interpretation of the card's visual symbols and its essence in relation to the query: ${cleanActualQuestion || 'their situation'}, in Turkish.` : `A direct, clear 3-5 sentences interpretation of the card's visual symbols and its essence in relation to the query: ${cleanActualQuestion || 'their situation'}, in English.`}"
    },
    "Future": {
      "title": "${isTurkishRequested ? "Generate a unique poetic title inspired by what you SEE in the Future card image (in Turkish)" : "Generate a unique poetic title inspired by what you SEE in the Future card image (in English)"}",
      "coreVerb": "${isTurkishRequested ? "The exact core verb of the Future card, translated into Turkish" : "The exact core verb of the Future card in English"}",
      "coreEssence": "${isTurkishRequested ? "The exact core essence of the Future card, translated into Turkish" : "The exact core essence of the Future card in English"}",
      "centralTension": "${isTurkishRequested ? "The exact central tension of the Future card, translated into Turkish" : "The exact central tension of the Future card in English"}",
      "transformationFrom": "${isTurkishRequested ? "The exact 'from' state of the Future card, translated into Turkish" : "The exact 'from' state of the Future card in English"}",
      "transformationTo": "${isTurkishRequested ? "The exact 'to' state of the Future card, translated into Turkish" : "The exact 'to' state of the Future card in English"}",
      "primaryArchetypes": ["${isTurkishRequested ? "The exact archetypes of the Future card, translated into Turkish" : "The exact archetypes of the Future card in English"}"],
      "symbols": ["${isTurkishRequested ? "The exact symbols of the Future card, translated into Turkish" : "The exact symbols of the Future card in English"}"],
      "lightExpression": "${isTurkishRequested ? "The exact light expression of the Future card, translated into Turkish" : "The exact light expression of the Future card in English"}",
      "shadowExpression": "${isTurkishRequested ? "The exact shadow expression of the Future card, translated into Turkish" : "The exact shadow expression of the Future card in English"}",
      "tarotResonances": ["${isTurkishRequested ? "The exact tarot resonances of the Future card, translated into Turkish" : "The exact tarot resonances of the Future card in English"}"],
      "visualObservations": ["${isTurkishRequested ? "The exact visual observations of the Future card, translated into Turkish" : "The exact visual observations of the Future card in English"}"],
      "promptObservations": ["${isTurkishRequested ? "The exact prompt observations of the Future card, translated into Turkish" : "The exact prompt observations of the Future card in English"}"],
      "originalPrompt": "${isTurkishRequested ? "The exact original prompt description of the Future card, translated into Turkish" : "The exact original prompt description of the Future card in English"}",
      "invitation": "${isTurkishRequested ? "The exact invitation of the Future card, translated into Turkish" : "The exact invitation of the Future card in English"}",
      "warning": "${isTurkishRequested ? "The exact warning of the Future card, translated into Turkish" : "The exact warning of the Future card in English"}",
      "positionalInterpretation": "${isTurkishRequested ? "A clear, plain 2-3 sentences description of how this position represents the future direction/advice in Turkish." : "A clear, plain 2-3 sentences description of how this position represents the future direction/advice in English."}",
      "contextualInterpretation": "${isTurkishRequested ? `A direct, clear 3-5 sentences interpretation of the card's visual symbols and its essence in relation to the query: ${cleanActualQuestion || 'their situation'}, in Turkish.` : `A direct, clear 3-5 sentences interpretation of the card's visual symbols and its essence in relation to the query: ${cleanActualQuestion || 'their situation'}, in English.`}"
    }
  },
  "relationshipAnalysis": "${isTurkishRequested ? "A clean, direct 3-5 sentences analysis of the visual transition between the three images (crowd/density changes, open vs. closed spaces) in Turkish." : "A clean, direct 3-5 sentences analysis of the visual transition between the three images (crowd/density changes, open vs. closed spaces) in English."}",
  "synthesis": "${isTurkishRequested ? `A simple, poetic, yet very clear and plain 3-5 sentences summary of the narrative arc (Past -> Present -> Future) relating to the query: ${cleanActualQuestion || 'their path'}, in Turkish.` : `A simple, poetic, yet very clear and plain 3-5 sentences summary of the narrative arc (Past -> Present -> Future) relating to the query: ${cleanActualQuestion || 'their path'}, in English.`}",
  "whatSees": "${isTurkishRequested ? "What the Panorama sees (1 short, clean, direct sentence) in Turkish." : "What the Panorama sees (1 short, clean, direct sentence) in English."}",
  "whatAsks": "${isTurkishRequested ? "What the Panorama asks (1 short, clean, direct question) in Turkish." : "What the Panorama asks (1 short, clean, direct question) in English."}",
  "invitation": "${isTurkishRequested ? "The Panorama's overall invitation (1 short, clean, direct invite) in Turkish." : "The Panorama's overall invitation (1 short, clean, direct invite) in English."}"
}

Respond ONLY with valid JSON. Do not include markdown code block syntax (like \`\`\`json) in your raw output.

READING VOICE AND WRITING STYLE RULES (CRITICAL):
1. THE ARTWORK MUST LEAD:
   The final reading must feel grounded in what you ACTUALLY SEE in the card images. Describe concrete visual details from the real images — colors, figures, landscapes, objects, lighting, mood. If the reading could still make sense without referencing specific visual elements you see in the images, it is too generic. Rewrite it.
   NOTE: The "Symbolic Template Description" fields are approximate descriptions and may not perfectly match the actual images. Always describe what you see, not what the template says.

2. MANDATORY FOCUS ON USER'S QUESTION:
   If the user has written/asked a question, every interpretation, synthesis, relationship analysis, and card commentary MUST be directly, deeply, and explicitly related to that question. There must be a clear, logical, and intuitive connection/bridge between the visual elements/symbols of the cards and the user's query. Do not just describe or interpret the cards in isolation; you must actively answer or address the user's question using the cards' visual cues. The question must be the primary lens of the entire reading.
   CRITICAL: Do NOT mechanically repeat or mention the user's question at the beginning of every card's interpretation. The connection to the question must be woven smoothly and naturally into the narrative of the interpretation without formulaic phrasing or repetitive citations at the start of the text blocks.

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

${
  isTurkishRequested ? `6. LANGUAGE RULE (CRITICAL):
   The user has explicitly requested the response in Turkish. You MUST translate all text values in the JSON response to Turkish (translate all generated fields like title, coreVerb, coreEssence, centralTension, transformation.from, transformation.to, primaryArchetypes, symbols, lightExpression, shadowExpression, tarotResonances, visualObservations, promptObservations, originalPrompt, invitation, warning, positionalInterpretation, contextualInterpretation, relationshipAnalysis, synthesis, whatSees, whatAsks, overall invitation, etc. into poetic, natural Turkish). Write all generated texts and translations in Turkish.`
  : `6. LANGUAGE RULE (CRITICAL):
   You MUST write all text values in the JSON response in English. Translate all metadata fields (like title, coreVerb, coreEssence, centralTension, transformation.from, transformation.to, primaryArchetypes, symbols, lightExpression, shadowExpression, tarotResonances, visualObservations, promptObservations, originalPrompt, invitation, warning, positionalInterpretation, contextualInterpretation, relationshipAnalysis, synthesis, whatSees, whatAsks, overall invitation, etc.) into English. The entire response must be strictly in English. Do NOT use Turkish.`
}

7. DYNAMIC VARIETY RULE (CRITICAL):
    The selected cards are unique panoramas: Past ("${isTurkishRequested ? pastTableau.dateName : translateDateToEnglish(pastTableau.dateName)}"), Present ("${isTurkishRequested ? presentTableau.dateName : translateDateToEnglish(presentTableau.dateName)}"), Future ("${isTurkishRequested ? futureTableau.dateName : translateDateToEnglish(futureTableau.dateName)}"). Each has its own distinct image. You MUST generate completely unique descriptions, metaphors, and interpretations based on what you actually SEE in each image. Do not reuse any interpretation from any other reading. Vary the focus, emotional tone, and specific angle of the advice so that no two readings ever feel identical.
`;
    }

    // List of fallback models to try if the primary model fails or is rate-limited
    const modelCandidates = Array.from(new Set([
      OPENROUTER_MODEL,
      "google/gemini-2.5-flash",
      "google/gemini-3.1-flash-lite",
      "google/gemini-1.5-flash",
      "qwen/qwen3-vl-8b-instruct",
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
          let maxTokens = 4096;
          if (model.includes("kimi")) {
            maxTokens = 2048;
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
              response_format: { type: "json_object" },
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

    // Clean response text: robust JSON extraction finding matching closing brace
    let cleanedResponse = extractValidJson(responseText);

    let parsedResponse: any = null;
    try {
      parsedResponse = JSON.parse(cleanedResponse);
      logDebug(`Parsed OpenRouter response: ${JSON.stringify(parsedResponse, null, 2)}`);
    } catch (parseErr: any) {
      logDebug(`Failed to parse responseText JSON: ${parseErr?.message || parseErr}`);
      try {
        fs.writeFileSync(path.join(process.cwd(), "api_response_fail.json"), cleanedResponse);
      } catch (writeErr) {
        console.error("Failed to write api_response_fail.json:", writeErr);
      }
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
                from: parsedResponse.cards.Single.transformationFrom || parsedResponse.cards.Single.transformation?.from || "",
                to: parsedResponse.cards.Single.transformationTo || parsedResponse.cards.Single.transformation?.to || "",
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
              dateSlashLabel: singleTableau.dateSlashLabel,
              isPredefined: singleTableau.isPredefined,
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
                from: parsedResponse.cards.Past.transformationFrom || parsedResponse.cards.Past.transformation?.from || "",
                to: parsedResponse.cards.Past.transformationTo || parsedResponse.cards.Past.transformation?.to || "",
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
              dateSlashLabel: pastTableau.dateSlashLabel,
              isPredefined: pastTableau.isPredefined,
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
                from: parsedResponse.cards.Present.transformationFrom || parsedResponse.cards.Present.transformation?.from || "",
                to: parsedResponse.cards.Present.transformationTo || parsedResponse.cards.Present.transformation?.to || "",
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
              dateSlashLabel: presentTableau.dateSlashLabel,
              isPredefined: presentTableau.isPredefined,
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
                from: parsedResponse.cards.Future.transformationFrom || parsedResponse.cards.Future.transformation?.from || "",
                to: parsedResponse.cards.Future.transformationTo || parsedResponse.cards.Future.transformation?.to || "",
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
              dateSlashLabel: futureTableau.dateSlashLabel,
              isPredefined: futureTableau.isPredefined,
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
