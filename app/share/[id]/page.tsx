import fs from "fs/promises";
import path from "path";
import { notFound } from "next/navigation";
import { ReadingResult } from "../../../types/reading";
import SharedReadingClient from "./SharedReadingClient";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function SharePage({ params }: PageProps) {
  const { id } = await params;
  const readingsDir = path.join(process.cwd(), "data", "readings");
  const filePath = path.join(readingsDir, `${id}.json`);

  let result: ReadingResult;
  try {
    const fileContent = await fs.readFile(filePath, "utf-8");
    result = JSON.parse(fileContent) as ReadingResult;
  } catch (error) {
    notFound();
  }

  return <SharedReadingClient result={result} />;
}
