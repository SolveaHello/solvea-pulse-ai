import { auth } from "@/lib/auth-mock";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { clerkId: userId } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const { campaignId, contacts } = await req.json();
  if (!campaignId || !Array.isArray(contacts) || contacts.length === 0) {
    return NextResponse.json({ error: "campaignId and contacts[] required" }, { status: 400 });
  }

  // Verify campaign belongs to user
  const campaign = await prisma.campaign.findFirst({
    where: { id: campaignId, userId: user.id },
  });
  if (!campaign) return NextResponse.json({ error: "Campaign not found" }, { status: 404 });

  // Get or create MANUAL contact list for this campaign
  let contactList = await prisma.contactList.findFirst({
    where: { campaignId, sourceType: "MANUAL" },
  });
  if (!contactList) {
    contactList = await prisma.contactList.create({
      data: {
        campaignId,
        userId: user.id,
        name: "Manual Entries",
        sourceType: "MANUAL",
      },
    });
  }

  const created = await prisma.$transaction(
    contacts.map((c) =>
      prisma.contact.upsert({
        where: { contactListId_phone: { contactListId: contactList!.id, phone: c.phone } },
        update: { name: c.name, email: c.email, businessName: c.businessName },
        create: {
          contactListId: contactList!.id,
          phone: c.phone,
          name: c.name,
          email: c.email,
          businessName: c.businessName,
        },
      })
    )
  );

  return NextResponse.json(created, { status: 201 });
}
