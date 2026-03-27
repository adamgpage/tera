"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/hooks/use-user";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { COUNTRIES, LANGUAGES } from "@/lib/utils/formatting";
import { NotificationPreferences } from "@/components/settings/notification-preferences";
import { StripeConnectSection } from "@/components/settings/stripe-connect-section";

export default function SettingsPage() {
  const router = useRouter();
  const supabase = createClient();
  const { profile, loading: userLoading, refresh } = useUser();

  const [name, setName] = useState("");
  const [country, setCountry] = useState("");
  const [languages, setLanguages] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (profile) {
      setName(profile.name);
      setCountry(profile.country);
      setLanguages(profile.languages);
    }
  }, [profile]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (!name.trim() || !country) {
      setError("Name and country are required.");
      return;
    }

    setSaving(true);
    try {
      const { error: updateError } = await supabase
        .from("users")
        .update({ name: name.trim(), country, languages })
        .eq("id", profile!.id);

      if (updateError) {
        setError(updateError.message);
        return;
      }

      setSuccess(true);
      await refresh();
    } finally {
      setSaving(false);
    }
  }

  function toggleLanguage(code: string) {
    setLanguages((prev) =>
      prev.includes(code) ? prev.filter((l) => l !== code) : [...prev, code]
    );
  }

  if (userLoading) {
    return (
      <div className="flex justify-center py-20">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold text-text-primary">Settings</h1>

      <Card>
        <form onSubmit={handleSave} className="space-y-4">
          {error && <Alert variant="error">{error}</Alert>}
          {success && (
            <Alert variant="success">Settings saved.</Alert>
          )}

          <Input
            id="name"
            label="Full name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          <Select
            id="country"
            label="Country"
            options={COUNTRIES}
            value={country}
            onChange={(e) => setCountry(e.target.value)}
          />

          <div className="space-y-1">
            <label className="block text-sm font-medium text-text-primary">
              Languages
            </label>
            <div className="flex flex-wrap gap-2">
              {LANGUAGES.map((lang) => (
                <button
                  key={lang.value}
                  type="button"
                  onClick={() => toggleLanguage(lang.value)}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                    languages.includes(lang.value)
                      ? "bg-tera-100 text-tera-700 ring-1 ring-tera-300"
                      : "bg-gray-100 text-text-secondary hover:bg-gray-200"
                  }`}
                >
                  {lang.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button type="submit" loading={saving}>
              Save changes
            </Button>
          </div>
        </form>
      </Card>

      <NotificationPreferences />

      <StripeConnectSection />
    </div>
  );
}
