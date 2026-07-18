import { NextResponse } from "next/server";
import https from "https";

export async function GET() {
  // Launch date was April 23, 2026.
  // Day 0: 2026-04-23
  // Day 8: 2026-05-01
  // Day 24: 2026-05-17
  // Day 45: 2026-06-07
  // Day 62: 2026-06-24
  // Day 81: 2026-07-13
  
  const testUrls = [
    { day: 0, url: "https://cdn.panorama.garden/generated_2026-04-23.jpg" },
    { day: 1, url: "https://cdn.panorama.garden/generated_2026-04-24.jpg" },
    { day: 8, url: "https://cdn.panorama.garden/generated_2026-05-01.jpg" },
    { day: 24, url: "https://cdn.panorama.garden/generated_2026-05-17.jpg" },
    { day: 45, url: "https://cdn.panorama.garden/generated_2026-06-07.jpg" },
    { day: 62, url: "https://cdn.panorama.garden/generated_2026-06-24.jpg" },
    { day: 81, url: "https://cdn.panorama.garden/generated_2026-07-13.jpg" },
  ];

  const probe = (url: string): Promise<number> => {
    return new Promise((resolve) => {
      https.get(url, (res) => {
        resolve(res.statusCode || 0);
      }).on("error", () => {
        resolve(500);
      });
    });
  };

  const results = [];
  for (const item of testUrls) {
    const status = await probe(item.url);
    results.push({ day: item.day, url: item.url, status });
  }

  return NextResponse.json({ success: true, results });
}
