import { NextResponse } from "next/server";
import crypto from "crypto";

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
    const id = crypto.randomUUID().replace(/-/g, "").slice(0, 8);

    // Call Upstash REST API using POST command array syntax
    const response = await fetch(baseUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${kvToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(["SET", `readings:${id}`, JSON.stringify(body)]),
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
