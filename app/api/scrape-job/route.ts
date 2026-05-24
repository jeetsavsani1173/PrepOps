import { NextRequest, NextResponse } from "next/server";
import { scrapeJobSchema } from "@/lib/validations";
import { AI_ENABLED } from "@/lib/env";

export async function POST(request: NextRequest) {
  try {
    const { url } = scrapeJobSchema.parse(await request.json());

    return NextResponse.json({
      data: {
        url,
        message: "Scraper pipeline scaffolded. Fetch + extraction layer will be wired next.",
        aiEnabled: AI_ENABLED,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Invalid scrape request", detail: `${error}` },
      { status: 400 },
    );
  }
}
