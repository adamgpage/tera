"use client";

import { useState, useEffect } from "react";
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

interface HelperProfileData {
  id: string;
  biography: string;
  expertise_tags: string[];
  availability_status: string;
  linkedin_url: string | null;
  public_profile_slug: string;
  paid_tier_active: boolean;
  session_rate_cents: number | null;
  reputation_score: number;
  total_conversations: number;
}

export default function HelperProfilePage() {
  const router = useRouter();
  const supabase = createClient();
  const { authUser, profile, loading: userLoading } = useUser();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [helperProfile, setHelperProfile] = useState<HelperProfileData | null>(null);
  const [biography, setBiography] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [availability, setAvailability] = useState("available");
  const [linkedinUrl, setLinkedinUrl] = useState("");

  useEffect(() => {
    if (!authUser) return;

    async function fetchProfile() {
      const { data } = await supabase
        .from("helper_profiles")
        .select("*")
        .eq("user_id", authUser!.id)
        .single();

      if (data) {
        const hp = data as unknown as HelperProfileData;
        setHelperProfile(hp);
        setBiography(hp.biography);
        setTags(hp.expertise_tags);
        setAvailability(hp.availability_status);
        setLinkedinUrl(hp.linkedin_url || "");
      }
      setLoading(false);
    }

    fetchProfile();
  }, [authUser]);

  async function handleRegenerateTags() {
    setRegenerating(true);
    setError(null);

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/generate-tags`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({ biography }),
        }
      );

      if (!response.ok) throw new Error("Failed to regenerate tags");
      const data = await response.json();
      setTags(data.tags);
    } catch (err) {
      setError("Failed to regenerate tags. Please try again.");
    } finally {
      setRegenerating(false);
    }
  }

  async function handleSave() {
    if (!helperProfile) return;
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const { error: updateError } = await supabase
        .from("helper_profiles")
        .update({
          biography,
          expertise_tags: tags,
          availability_status: availability,
          linkedin_url: linkedinUrl || null,
        } as Record<string, unknown>)
        .eq("id", helperProfile.id);

      if (updateError) throw new Error(updateError.message);

      // Regenerate embedding with updated biography + tags
      fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/generate-embedding`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            text: `${biography}\n\nExpertise: ${tags.join(", ")}`,
            targetTable: "helper_profiles",
            targetId: helperProfile.id,
            embeddingColumn: "expertise_embedding",
          }),
        }
      ).catch(console.error);

      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save.");
    } finally {
      setSaving(false);
    }
  }

  if (userLoading) {
    return (
      <div className="flex justify-center py-20">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!profile?.is_helper) {
    router.push("/helper/onboarding");
    return null;
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-text-primary">
          Helper profile
        </h1>
        {helperProfile && (
          <a
            href={`/p/${helperProfile.public_profile_slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium text-tera-600 hover:text-tera-700"
          >
            View public profile
          </a>
        )}
      </div>

      {error && <Alert variant="error">{error}</Alert>}
      {success && <Alert variant="success">Profile updated.</Alert>}

      <Card>
        <div className="space-y-6">
          <BiographyForm value={biography} onChange={setBiography} />

          <div className="flex items-center justify-between">
            <TagReview tags={tags} onChange={setTags} />
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleRegenerateTags}
            loading={regenerating}
          >
            Regenerate tags from biography
          </Button>

          <AvailabilitySelect value={availability} onChange={setAvailability} />

          <Input
            id="linkedin"
            label="LinkedIn URL (optional)"
            placeholder="https://linkedin.com/in/yourprofile"
            value={linkedinUrl}
            onChange={(e) => setLinkedinUrl(e.target.value)}
          />

          <div className="flex justify-end">
            <Button onClick={handleSave} loading={saving}>
              Save changes
            </Button>
          </div>
        </div>
      </Card>

      {helperProfile && (
        <Card padding="sm">
          <div className="flex items-center justify-between text-sm text-text-secondary">
            <span>
              Conversations: {helperProfile.total_conversations} | Reputation
              score: {(helperProfile.reputation_score * 100).toFixed(0)}%
            </span>
            <span>
              Slug: /p/{helperProfile.public_profile_slug}
            </span>
          </div>
        </Card>
      )}
    </div>
  );
}
