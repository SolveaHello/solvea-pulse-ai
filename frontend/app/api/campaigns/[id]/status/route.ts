import { auth } from "@/lib/auth-mock";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { userId } = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const user = await prisma.user.findUnique({ where: { clerkId: userId } });
  if (!user) return new Response("User not found", { status: 404 });

  const campaign = await prisma.campaign.findFirst({
    where: { id: params.id, userId: user.id },
  });
  if (!campaign) return new Response("Not found", { status: 404 });

  // Proxy SSE from FastAPI
  const fastapiUrl = `${process.env.FASTAPI_INTERNAL_URL}/api/v1/campaigns/${params.id}/sse`;
  const fastapiRes = await fetch(fastapiUrl, {
    headers: { Accept: "text/event-stream" },
  });

  if (!fastapiRes.ok || !fastapiRes.body) {
    return new Response("SSE unavailable", { status: 503 });
  }

  return new Response(fastapiRes.body, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
