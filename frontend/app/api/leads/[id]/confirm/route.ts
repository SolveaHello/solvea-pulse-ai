import { auth } from "@/lib/auth-mock";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));

  const contact = await prisma.contact.update({
    where: { id: params.id },
    data: {
      disposition: "CONFIRMED",
      confirmedAt: new Date(),
      ...(body.assignedTo ? { assignedTo: body.assignedTo } : {}),
    },
  });

  return NextResponse.json(contact);
}
