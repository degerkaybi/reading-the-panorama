import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import crypto from "crypto";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid data format" }, { status: 400 });
    }

    // Generate an 18-character unique alphanumeric ID
    const id = crypto.randomUUID().replace(/-/g, "").slice(0, 18);
    const readingsDir = path.join(process.cwd(), "data", "readings");

    // Ensure the readings folder exists
    await fs.mkdir(readingsDir, { recursive: true });

    // Write the JSON file to disk
    const filePath = path.join(readingsDir, `${id}.json`);
    await fs.writeFile(filePath, JSON.stringify(body, null, 2), "utf-8");

    return NextResponse.json({ success: true, id });
  } catch (error) {
    console.error("Failed to save shared reading:", error);
    return NextResponse.json({ error: "Failed to save reading" }, { status: 500 });
  }
}
