import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { extensionIngestSchema } from "@/lib/validations";

export async function POST(request: NextRequest) {
  try {
    const payload = extensionIngestSchema.parse(await request.json());

    const existing = await prisma.opportunity.findFirst({ where: { jobUrl: payload.url } });

    if (existing) {
      return NextResponse.json(
        { data: existing, ignored: true, message: "Job link already saved." },
        { status: 200 },
      );
    }

    const opportunity = await prisma.opportunity.create({
      data: {
        companyName: payload.companyName,
        roleTitle: payload.roleTitle ?? "Unknown Role",
        source: payload.source,
        jobUrl: payload.url,
        scrapedRawText: payload.pageText,
        scrapedHtml: payload.rawHtml,
        statusHistory: {
          create: { fromStatus: "SAVED", toStatus: "SAVED" },
        },
      },
    });

    return NextResponse.json({ data: opportunity }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: "Malformed extension payload", detail: `${error}` },
      { status: 400 },
    );
  }
}
