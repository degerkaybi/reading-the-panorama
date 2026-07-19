// Deprecated: Share API is no longer used. Sharing is now database-free and handled client-side via URL encoding.
export async function GET() {
  return new Response("Share API is deprecated.", { status: 410 });
}
