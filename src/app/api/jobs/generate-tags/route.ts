import { NextRequest, NextResponse } from "next/server";
import { generateHelperTags, screenContent } from "@/lib/claude/client";

/**
 * Generate expertise tags from a helper's biography.
 * Called during helper onboarding.
 */
export async function POST(request: NextRequest) {
  const { biography } = await request.json();

  if (!biography || biography.trim().split(/\s+/).length < 50) {
    return NextResponse.json(
      { error: "Biography must be at least 50 words" },
      { status: 400 }
    );
  }

  try {
    // Screen content first
    const screening = await screenContent(biography);
    if (!screening.safe) {
      return NextResponse.json(
        { error: `Biography flagged: ${screening.reason}. Please revise.` },
        { status: 400 }
      );
    }

    // Generate tags
    const result = await generateHelperTags(biography);

    return NextResponse.json({
      expertise_tags: result.expertise_tags,
      domains: result.domains,
      geographic_expertise: result.geographic_expertise,
    });
  } catch (err) {
    console.error("Generate tags error:", err);
    return NextResponse.json(
      { error: "Failed to generate tags. Please try again." },
      { status: 500 }
    );
  }
}
