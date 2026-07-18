import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const apiKey = process.env.OPENROUTER_API_KEY;
    const model = process.env.OPENROUTER_MODEL || "google/gemma-4-31b-it:free";

    if (!apiKey) {
      return NextResponse.json({
        success: false,
        error: "No OPENROUTER_API_KEY found in process.env. Make sure .env.local is loaded and Next.js dev server is restarted."
      });
    }

    const testPayload = {
      model: model,
      messages: [{ role: "user", content: "Say 'Hello' in 1 word." }],
      max_tokens: 10
    };

    console.log("Diagnostic: Sending test request to OpenRouter with model:", model);
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
        "HTTP-Referer": "https://panorama.garden",
        "X-Title": "Reading the Panorama Diagnostics",
      },
      body: JSON.stringify(testPayload)
    });

    const status = res.status;
    const text = await res.text();
    let parsed = null;
    try {
      parsed = JSON.parse(text);
    } catch (e) {}

    return NextResponse.json({
      success: res.ok,
      status: status,
      modelUsed: model,
      keyLength: apiKey.length,
      keyPrefix: apiKey.substring(0, 10) + "...",
      response: parsed || text
    });
  } catch (err: any) {
    return NextResponse.json({
      success: false,
      error: err?.message || err,
      stack: err?.stack
    });
  }
}
