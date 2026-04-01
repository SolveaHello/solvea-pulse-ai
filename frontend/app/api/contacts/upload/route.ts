import { auth } from "@/lib/auth-mock";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const campaignId = formData.get("campaignId") as string | null;

  if (!file || !campaignId) {
    return NextResponse.json({ error: "file and campaignId required" }, { status: 400 });
  }

  // Forward multipart form to FastAPI
  const proxyForm = new FormData();
  proxyForm.append("file", file);
  proxyForm.append("campaign_id", campaignId);

  const res = await fetch(
    `${process.env.FASTAPI_INTERNAL_URL}/api/v1/contacts/parse-csv`,
    { method: "POST", body: proxyForm }
  );

  if (!res.ok) {
    const err = await res.text();
    return NextResponse.json({ error: err }, { status: res.status });
  }

  return NextResponse.json(await res.json());
}
