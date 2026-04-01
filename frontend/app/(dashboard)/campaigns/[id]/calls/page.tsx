import { auth } from "@/lib/auth-mock";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { CallDetailRow } from "@/components/calls/CallDetailRow";

export default async function CampaignCallsPage({
  params,
}: {
  params: { id: string };
}) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const user = await prisma.user.findUnique({ where: { clerkId: userId } });
  if (!user) redirect("/");

  const calls = await prisma.call.findMany({
    where: { campaign: { id: params.id, userId: user.id } },
    orderBy: { createdAt: "desc" },
    include: {
      contact: true,
      recording: true,
      transcript: true,
      summary: true,
      appointment: true,
    },
  });

  return (
    <div className="p-8">
      <h1 className="text-xl font-bold mb-6">Call Results</h1>

      {calls.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <p>No calls yet. Launch the campaign to start calling.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {/* Header */}
          <div className="grid grid-cols-[1fr_120px_100px_100px_auto] gap-4 px-4 py-2 text-xs text-muted-foreground uppercase tracking-wide border-b">
            <span>Contact</span>
            <span>Status</span>
            <span>Duration</span>
            <span>Disposition</span>
            <span>Details</span>
          </div>
          {calls.map((call) => (
            <CallDetailRow
              key={call.id}
              call={call as unknown as Parameters<typeof CallDetailRow>[0]["call"]}
            />
          ))}
        </div>
      )}
    </div>
  );
}
