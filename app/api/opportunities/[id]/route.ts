import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { updateOpportunitySchema } from "@/lib/validations";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;

  try {
    const json = await request.json();
    const payload = updateOpportunitySchema.parse(json);

    const current = await prisma.opportunity.findUnique({ where: { id } });
    if (!current) {
      return NextResponse.json({ error: "Opportunity not found" }, { status: 404 });
    }

    if (payload.jobUrl && payload.jobUrl !== current.jobUrl) {
      const duplicate = await prisma.opportunity.findFirst({ where: { jobUrl: payload.jobUrl } });
      if (duplicate) {
        return NextResponse.json(
          { error: "Duplicate job link. This URL is already saved." },
          { status: 409 },
        );
      }
    }

    const result = await prisma.$transaction(async (tx) => {
      const updated = await tx.opportunity.update({ where: { id }, data: payload });

      if (payload.status && payload.status !== current.status) {
        await tx.statusHistory.create({
          data: {
            opportunityId: id,
            fromStatus: current.status,
            toStatus: payload.status,
          },
        });
      }

      return updated;
    });

    return NextResponse.json({ data: result });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { error: "Duplicate job link. This URL is already saved." },
        { status: 409 },
      );
    }

    return NextResponse.json(
      { error: "Invalid request payload", detail: `${error}` },
      { status: 400 },
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;

  try {
    await prisma.opportunity.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Opportunity not found" }, { status: 404 });
  }
}
