import { NextResponse } from "next/server";
import fs from "fs";
import fsPromises from "fs/promises";
import path from "path";
import crypto from "crypto";

function logDebug(message: string) {
  try {
    const logPath = path.join(process.cwd(), "api_debug.log");
    const timestamp = new Date().toISOString();
    fs.appendFileSync(logPath, `[${timestamp}] [SHARE API] ${message}\n`);
  } catch (err) {
    console.error("Failed to write to api_debug.log:", err);
  }
}

export async function POST(request: Request) {
  try {
    logDebug("POST request received");
    const body = await request.json();
    if (!body || typeof body !== "object") {
      logDebug("Error: Invalid data format");
      return NextResponse.json({ error: "Invalid data format" }, { status: 400 });
    }

    logDebug(`Data format valid. Creating ID...`);
    // Generate an 18-character unique alphanumeric ID
    const id = crypto.randomUUID().replace(/-/g, "").slice(0, 18);
    logDebug(`Generated ID: ${id}`);
    
    const readingsDir = path.join(process.cwd(), "data", "readings");
    logDebug(`Readings directory: ${readingsDir}`);

    // Ensure the readings folder exists
    logDebug("Creating directory if not exists...");
    await fsPromises.mkdir(readingsDir, { recursive: true });

    // Write the JSON file to disk
    const filePath = path.join(readingsDir, `${id}.json`);
    logDebug(`Writing file to path: ${filePath}`);
    await fsPromises.writeFile(filePath, JSON.stringify(body, null, 2), "utf-8");

    logDebug("File written successfully!");
    return NextResponse.json({ success: true, id });
  } catch (error: any) {
    logDebug(`Exception in Share API route: ${error.message}\nStack: ${error.stack}`);
    console.error("Failed to save shared reading:", error);
    return NextResponse.json({ error: "Failed to save reading" }, { status: 500 });
  }
}
