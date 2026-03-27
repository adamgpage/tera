import { NextResponse } from "next/server";
import { generateSampleGlobeData } from "@/lib/globe/data-service";

/**
 * GET /api/globe/activity
 * Returns aggregated globe activity data.
 * At MVP returns sample data; in production this is replaced
 * by the Globe Data Service WebSocket.
 */
export async function GET() {
  // In production: query aggregated data from Redis/cache
  // At MVP: return sample data
  const data = generateSampleGlobeData();

  return NextResponse.json(data, {
    headers: {
      "Cache-Control": "public, s-maxage=3, stale-while-revalidate=6",
    },
  });
}
