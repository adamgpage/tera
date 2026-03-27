"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/hooks/use-user";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { BiographyForm } from "@/components/profiles/biography-form";
import { TagReview } from "@/components/profiles/tag-review";
import { AvailabilitySelect } from "@/components/profiles/availability-select";
import { LANGUAGES } from "@/lib/utils/formatting";

type Step = "biography" | "generating" | "review" | "details" | "saving";

export default function HelperOnboardingPage() {
  const router = useRouter();
  const supabase = createClient();
  const { authUser, profile, refresh } = useUser();

  const [step, setStep] = useState<Step>("biography");
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [biography, setBiography] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [availability, setAvailability] = useState("available");
  const [languages, setLanguages] = useState<string[]>(profile?.languages ?? []);
  const [linkedinUrl, setLinkedinUrl] = useState("");

  const wordCount = biography.trim().split(/\s+/).filter((w) => w.length > 0).length;

  async function handleGenerateTags() {
    if (wordCount < 100) {
      setError("Please write at least 100 words.");
      return;
    }

    setError(null);
    setStep("generating");

    try {
      // Call our API route to generate tags from biography
      const response = await fetch("/api/jobs/generate-tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ biography }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Failed to generate tags");
      }

      const data = await response.json();
      setTags(data.expertise_tags || []);
      setStep("review");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to generate tags. Please try again."
      );
      setStep("biography");
    }
  }

  async function handleSaveProfile() {
    if (!authUser) return;
    setError(null);
    setStep("saving");

    try {
      // Generate a URL-safe slug from the user's name
      const baseName = profile?.name || authUser.email || "helper";
      const slug =
        baseName
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "") +
        "-" +
        Math.random().toString(36).slice(2, 8);

      // Create the helper profile
      const { error: insertError } = await supabase
        .from("helper_profiles")
        .insert({
          user_id: authUser.id,
          biography,
          expertise_tags: tags,
          availability_status: availability,
          linkedin_url: linkedinUrl || null,
          public_profile_slug: slug,
        } as Record<string, unknown>);

      if (insertError) throw new Error(insertError.message);

      // Mark user as helper
      await supabase
        .from("users")
        .update({ is_helper: true, languages } as Record<string, unknown>)
        .eq("id", authUser.id);

      // Generate embedding in the background
      const { data: helperProfile } = await supabase
        .from("helper_profiles")
        .select("id")
        .eq("user_id", authUser.id)
        .single();

      if (helperProfile) {
        // Fire and forget — embedding generates async via our API route
        fetch("/api/jobs/embed-helper", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            helperProfileId: (helperProfile as Record<string, unknown>).id,
          }),
        }).catch(console.error);
      }

      await refresh();
      router.push("/dashboard");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to save profile."
      );
      setStep("details");
    }
  }

  // Already a helper — redirect
  if (profile?.is_helper) {
    router.push("/helper/profile");
    return null;
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">
          Become a helper
        </h1>
        <p className="mt-1 text-text-secondary">
          Share your experience and help people who are facing problems
          you&apos;ve already solved.
        </p>
      </div>

      {error && <Alert variant="error">{error}</Alert>}

      {/* Step 1: Biography */}
      {step === "biography" && (
        <Card>
          <div className="space-y-6">
            <BiographyForm
              value={biography}
              onChange={setBiography}
            />
            <div className="flex justify-end">
              <Button
                onClick={handleGenerateTags}
                disabled={wordCount < 100}
              >
                Generate expertise tags
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Step 1.5: Generating tags */}
      {step === "generating" && (
        <Card>
          <div className="flex flex-col items-center gap-4 py-8">
            <LoadingSpinner size="lg" />
            <div className="text-center">
              <p className="font-medium text-text-primary">
                Analysing your experience...
              </p>
              <p className="text-sm text-text-secondary">
                We&apos;re reading your biography and generating expertise tags.
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Step 2: Review tags */}
      {step === "review" && (
        <Card>
          <div className="space-y-6">
            <Alert variant="success" title="Tags generated">
              We identified {tags.length} areas of expertise from your
              biography. Review them below — remove any that don&apos;t fit and
              add any we missed.
            </Alert>
            <TagReview tags={tags} onChange={setTags} />
            <div className="flex justify-between">
              <Button
                variant="ghost"
                onClick={() => setStep("biography")}
              >
                Back to biography
              </Button>
              <Button
                onClick={() => setStep("details")}
                disabled={tags.length === 0}
              >
                Continue
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Step 3: Availability and optional details */}
      {step === "details" && (
        <Card>
          <div className="space-y-6">
            <AvailabilitySelect
              value={availability}
              onChange={setAvailability}
            />

            <div className="space-y-2">
              <label className="block text-sm font-medium text-text-primary">
                Languages you can help in
              </label>
              <div className="flex flex-wrap gap-2">
                {LANGUAGES.map((lang) => (
                  <button
                    key={lang.value}
                    type="button"
                    onClick={() =>
                      setLanguages((prev) =>
                        prev.includes(lang.value)
                          ? prev.filter((l) => l !== lang.value)
                          : [...prev, lang.value]
                      )
                    }
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

            <Input
              id="linkedin"
              label="LinkedIn URL (optional)"
              placeholder="https://linkedin.com/in/yourprofile"
              value={linkedinUrl}
              onChange={(e) => setLinkedinUrl(e.target.value)}
            />

            <div className="flex justify-between">
              <Button
                variant="ghost"
                onClick={() => setStep("review")}
              >
                Back to tags
              </Button>
              <Button onClick={handleSaveProfile}>
                Create helper profile
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Step 4: Saving */}
      {step === "saving" && (
        <Card>
          <div className="flex flex-col items-center gap-4 py-8">
            <LoadingSpinner size="lg" />
            <p className="font-medium text-text-primary">
              Creating your profile...
            </p>
          </div>
        </Card>
      )}
    </div>
  );
}
