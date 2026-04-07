import { redirect } from "next/navigation";

// Audience Campaigns has been merged into /campaigns (Audience Campaigns tab)
export default function AudienceCampaignsRedirect() {
  redirect("/campaigns");
}
