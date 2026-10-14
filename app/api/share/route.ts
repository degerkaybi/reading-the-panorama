import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid data format" }, { status: 400 });
    }

    const kvUrl = process.env.KV_REST_API_URL;
    const kvToken = process.env.KV_REST_API_TOKEN;

    if (!kvUrl || !kvToken) {
      console.error("Vercel KV environment variables are missing!");
      return NextResponse.json({ error: "Storage configuration error" }, { status: 500 });
    }

    // Clean base URL (strip trailing slash)
    const baseUrl = kvUrl.endsWith("/") ? kvUrl.slice(0, -1) : kvUrl;

    // Generate an 8-character unique alphanumeric ID
    const bytes = new Uint8Array(6);
    crypto.getRandomValues(bytes);
    const id = Array.from(bytes, (b) => b.toString(36).padStart(2, "0")).join("").slice(0, 8);

    const key = `readings:${id}`;
    const value = JSON.stringify(body);
    // 30-day expiration to prevent unbounded data growth
    const exSeconds = 30 * 24 * 60 * 60;

    // Use Upstash REST API URL-based command format:
    // POST /{command}/{arg1}/{arg2}/...
    const encodedValue = encodeURIComponent(value);
    const url = `${baseUrl}/set/${key}/${encodedValue}/ex/${exSeconds}`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${kvToken}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Upstash REST API error: Status ${response.status} - ${errorText}`);
    }

    const resultData = await response.json();
    if (resultData.error) {
      throw new Error(`Upstash returned error: ${resultData.error}`);
    }

    return NextResponse.json({ success: true, id });
  } catch (error: any) {
    console.error("Failed to save reading in Upstash Redis:", error);
    return NextResponse.json({ error: error.message || "Failed to save reading" }, { status: 500 });
  }
}

