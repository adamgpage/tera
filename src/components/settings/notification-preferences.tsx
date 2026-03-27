"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/hooks/use-user";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface Preferences {
  email_match_found: boolean;
  email_new_message: boolean;
  email_call_reminder: boolean;
  email_summary_ready: boolean;
  email_moderation_flag: boolean;
  email_request_status: boolean;
}

const PREF_LABELS: { key: keyof Preferences; label: string; description: string }[] = [
  { key: "email_match_found", label: "Match found", description: "When someone accepts your request or you receive an invitation" },
  { key: "email_new_message", label: "New messages", description: "When you receive a message in a conversation" },
  { key: "email_call_reminder", label: "Call reminders", description: "Reminders before scheduled video calls" },
  { key: "email_summary_ready", label: "Summary ready", description: "When your conversation summary is generated" },
  { key: "email_request_status", label: "Request updates", description: "When your request status changes (expired, unmatched)" },
  { key: "email_moderation_flag", label: "Moderation alerts", description: "When a conversation is flagged or action is taken" },
];

const DEFAULT_PREFS: Preferences = {
  email_match_found: true,
  email_new_message: false,
  email_call_reminder: true,
  email_summary_ready: true,
  email_moderation_flag: true,
  email_request_status: true,
};

export function NotificationPreferences() {
  const supabase = createClient();
  const { authUser } = useUser();
  const [prefs, setPrefs] = useState<Preferences>(DEFAULT_PREFS);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!authUser) return;

    async function load() {
      const { data } = await supabase
        .from("notification_preferences")
        .select("*")
        .eq("user_id", authUser!.id)
        .single();

      if (data) {
        const d = data as Record<string, unknown>;
        setPrefs({
          email_match_found: d.email_match_found as boolean ?? true,
          email_new_message: d.email_new_message as boolean ?? false,
          email_call_reminder: d.email_call_reminder as boolean ?? true,
          email_summary_ready: d.email_summary_ready as boolean ?? true,
          email_moderation_flag: d.email_moderation_flag as boolean ?? true,
          email_request_status: d.email_request_status as boolean ?? true,
        });
      }
    }

    load();
  }, [authUser, supabase]);

  function toggle(key: keyof Preferences) {
    setPrefs((prev) => ({ ...prev, [key]: !prev[key] }));
    setSaved(false);
  }

  async function handleSave() {
    if (!authUser) return;
    setSaving(true);

    // Upsert preferences
    const { error } = await supabase
      .from("notification_preferences")
      .upsert({
        user_id: authUser.id,
        ...prefs,
      } as Record<string, unknown>, { onConflict: "user_id" });

    setSaving(false);
    if (!error) setSaved(true);
  }

  return (
    <Card>
      <div className="space-y-4">
        <div>
          <h2 className="text-base font-semibold text-text-primary">Email Notifications</h2>
          <p className="text-xs text-text-muted mt-1">
            In-app notifications are always active. Choose which events also send an email.
          </p>
        </div>

        <div className="divide-y divide-border">
          {PREF_LABELS.map(({ key, label, description }) => (
            <div key={key} className="flex items-center justify-between py-3">
              <div>
                <p className="text-sm font-medium text-text-primary">{label}</p>
                <p className="text-xs text-text-muted">{description}</p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={prefs[key]}
                onClick={() => toggle(key)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  prefs[key] ? "bg-tera-600" : "bg-gray-200"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${
                    prefs[key] ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <Button size="sm" onClick={handleSave} loading={saving}>
            Save Preferences
          </Button>
          {saved && (
            <span className="text-xs text-green-600">Saved</span>
          )}
        </div>
      </div>
    </Card>
  );
}
