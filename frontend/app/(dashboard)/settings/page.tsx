import { Phone, Calendar, Key, Bot, Bell, MapPin, Mail, CheckCircle2 } from "lucide-react";
import { PhoneSaveForm } from "@/components/settings/PhoneSaveForm";
import { GoogleCalendarConnect } from "@/components/settings/GoogleCalendarConnect";
import { SettingsApiKeyRow } from "@/components/settings/SettingsApiKeyRow";

export default function SettingsPage() {
  return (
    <div className="p-8 max-w-3xl">
      <h1 className="text-2xl font-bold mb-2">Settings</h1>
      <p className="text-sm text-muted-foreground mb-8">
        Configure integrations, API keys, and notification preferences.
      </p>

      <div className="space-y-6">

        {/* AI & Voice */}
        <section>
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">
            AI & Voice
          </h2>
          <div className="border rounded-xl divide-y">
            <div className="p-5">
              <div className="flex items-center gap-2 mb-1">
                <Bot className="h-4 w-4 text-primary" />
                <span className="font-medium text-sm">Vapi — AI Calling</span>
                <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-medium flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" /> Connected
                </span>
              </div>
              <p className="text-xs text-muted-foreground mb-3">
                Vapi powers all AI outbound calls. Your assistant ID and phone number are configured per campaign.
              </p>
              <SettingsApiKeyRow label="API Key" valueHint="vapi_••••••••3f2a" />
              <SettingsApiKeyRow label="Phone Number ID" valueHint="pn_••••••••8c1d" className="mt-2" />
            </div>

            <div className="p-5">
              <div className="flex items-center gap-2 mb-1">
                <Key className="h-4 w-4 text-primary" />
                <span className="font-medium text-sm">Anthropic — Claude AI</span>
                <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-medium flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" /> Connected
                </span>
              </div>
              <p className="text-xs text-muted-foreground mb-3">
                Used for call summarization, follow-up content generation, and daily report insights.
              </p>
              <SettingsApiKeyRow label="API Key" valueHint="sk-ant-••••••••9b4e" />
            </div>
          </div>
        </section>

        {/* Contacts & Data */}
        <section>
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">
            Contacts & Data
          </h2>
          <div className="border rounded-xl divide-y">
            <div className="p-5">
              <div className="flex items-center gap-2 mb-1">
                <MapPin className="h-4 w-4 text-primary" />
                <span className="font-medium text-sm">Google Maps API</span>
                <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-medium flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" /> Connected
                </span>
              </div>
              <p className="text-xs text-muted-foreground mb-3">
                Searches for local SMB contacts by industry, location, and rating.
              </p>
              <SettingsApiKeyRow label="API Key" valueHint="AIza••••••••Xk7p" />
            </div>
          </div>
        </section>

        {/* Follow-up Channels */}
        <section>
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">
            Follow-up Channels
          </h2>
          <div className="border rounded-xl divide-y">
            <div className="p-5">
              <div className="flex items-center gap-2 mb-1">
                <Mail className="h-4 w-4 text-primary" />
                <span className="font-medium text-sm">Resend — Email</span>
                <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-medium flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" /> Connected
                </span>
              </div>
              <p className="text-xs text-muted-foreground mb-3">
                Sends personalized follow-up emails after calls (up to 3,000/month on free plan).
              </p>
              <SettingsApiKeyRow label="API Key" valueHint="re_••••••••7wQm" />
              <SettingsApiKeyRow label="From Email" valueHint="hello@yourdomain.com" className="mt-2" />
            </div>

            <div className="p-5">
              <div className="flex items-center gap-2 mb-1">
                <Phone className="h-4 w-4 text-primary" />
                <span className="font-medium text-sm">Twilio — SMS</span>
                <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700 font-medium">
                  Not configured
                </span>
              </div>
              <p className="text-xs text-muted-foreground mb-3">
                Sends SMS follow-ups for callback-requested and voicemail dispositions.
              </p>
              <SettingsApiKeyRow label="Account SID" valueHint="AC••••••••  (not set)" />
              <SettingsApiKeyRow label="Auth Token" valueHint="(not set)" className="mt-2" />
              <SettingsApiKeyRow label="From Number" valueHint="(not set)" className="mt-2" />
            </div>
          </div>
        </section>

        {/* Calendar & Scheduling */}
        <section>
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">
            Calendar & Scheduling
          </h2>
          <div className="border rounded-xl p-5">
            <div className="flex items-center gap-2 mb-1">
              <Calendar className="h-4 w-4 text-primary" />
              <span className="font-medium text-sm">Google Calendar</span>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Connect your Google Calendar to enable automatic meeting booking during AI calls.
            </p>
            <GoogleCalendarConnect connected={false} />
          </div>
        </section>

        {/* Test Phone */}
        <section>
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">
            Test & Preview
          </h2>
          <div className="border rounded-xl p-5">
            <div className="flex items-center gap-2 mb-1">
              <Phone className="h-4 w-4 text-primary" />
              <span className="font-medium text-sm">Test Phone Number</span>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Save your phone number to receive test calls when previewing campaign scripts.
            </p>
            <PhoneSaveForm />
          </div>
        </section>

        {/* Notifications */}
        <section>
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">
            Notifications
          </h2>
          <div className="border rounded-xl divide-y">
            {[
              { label: "New INTERESTED lead", desc: "Notify when a contact is marked Interested", enabled: true },
              { label: "Lead confirmed", desc: "Notify when a lead moves to Confirmed stage", enabled: true },
              { label: "Campaign completed", desc: "Notify when all contacts in a campaign have been called", enabled: true },
              { label: "Daily report ready", desc: "Notify when the daily AI report is generated", enabled: false },
              { label: "Follow-up reply received", desc: "Notify when a contact replies to a follow-up email", enabled: false },
            ].map((n) => (
              <div key={n.label} className="flex items-center justify-between px-5 py-4">
                <div>
                  <p className="text-sm font-medium">{n.label}</p>
                  <p className="text-xs text-muted-foreground">{n.desc}</p>
                </div>
                <div className={`w-10 h-6 rounded-full relative cursor-pointer transition-colors ${n.enabled ? "bg-primary" : "bg-muted"}`}>
                  <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${n.enabled ? "translate-x-5" : "translate-x-1"}`} />
                </div>
              </div>
            ))}
          </div>
        </section>

      </div>
    </div>
  );
}
