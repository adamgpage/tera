import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Metadata } from "next";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();
  const { data: user } = await supabase.from("users").select("name").eq("id", id).single();
  const name = (user as Record<string, unknown>)?.name as string || "Helper";
  return {
    title: `${name} — Tera Helper Profile`,
    description: `View ${name}'s helper profile on Tera — expertise, ratings, and impact.`,
  };
}

export default async function HelperPublicProfile({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: user } = await supabase.from("users").select("*").eq("id", id).single();
  if (!user) notFound();

  const u = user as Record<string, unknown>;

  const { data: profile } = await supabase
    .from("helper_profiles")
    .select("*")
    .eq("user_id", id)
    .single();

  if (!profile) notFound();
  const p = profile as Record<string, unknown>;

  // Get ratings
  const { data: ratings } = await supabase
    .from("ratings")
    .select("*, conversations!inner(helper_user_id)")
    .eq("conversations.helper_user_id", id)
    .neq("rated_by", "helper")
    .order("created_at", { ascending: false })
    .limit(20);

  // Get public documents
  const { data: publicDocs } = await supabase
    .from("files")
    .select("id, filename, file_type, file_size, storage_url")
    .eq("uploaded_by", id)
    .eq("visibility", "public");

  const tags = (p.expertise_tags as string[]) || [];
  const languages = (u.languages as string[]) || [];

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      {/* Header */}
      <div className="flex items-start gap-6 mb-8">
        <div className="w-20 h-20 rounded-full bg-teal-100 flex items-center justify-center text-3xl font-bold text-teal-700">
          {((u.name as string) || "?")[0].toUpperCase()}
        </div>
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold">{u.name as string}</h1>
            {Boolean(p.verified_badge) && (
              <Badge className="bg-teal-100 text-teal-700 border-teal-200">✓ Verified</Badge>
            )}
          </div>
          <p className="text-gray-600 mt-1">{u.country as string}</p>
          <div className="flex gap-2 mt-2">
            {languages.map((lang) => (
              <Badge key={lang} variant="outline">{lang}</Badge>
            ))}
          </div>
        </div>
        <div className="ml-auto">
          <Badge variant={
            p.availability_status === "available" ? "secondary" :
            p.availability_status === "limited" ? "outline" : "destructive"
          }>
            {p.availability_status as string}
          </Badge>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        {[
          { label: "Conversations", value: String(p.leaderboard_conversations_count || 0) },
          { label: "Countries Reached", value: String(p.leaderboard_geographies_count || 0) },
          { label: "Domains", value: String(p.leaderboard_domains_count || 0) },
          { label: "Resolution Rate", value: `${Math.round(((p.leaderboard_resolution_rate as number) || 0) * 100)}%` },
        ].map((stat) => (
          <Card key={stat.label} className="p-4 text-center">
            <div className="text-2xl font-bold text-teal-600">{stat.value}</div>
            <div className="text-xs text-gray-500 mt-1">{stat.label}</div>
          </Card>
        ))}
      </div>

      {/* Expertise */}
      <Card className="p-6 mb-6">
        <h2 className="font-semibold text-lg mb-3">Expertise</h2>
        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <Badge key={tag} variant="secondary">{tag}</Badge>
          ))}
        </div>
      </Card>

      {/* Biography */}
      <Card className="p-6 mb-6">
        <h2 className="font-semibold text-lg mb-3">About</h2>
        <div className="prose prose-sm max-w-none text-gray-700">
          {((p.biography as string) || "").split("\n").map((para, i) => (
            <p key={i}>{para}</p>
          ))}
        </div>
      </Card>

      {/* Paid tier */}
      {Boolean(p.paid_tier_active) && (
        <Card className="p-6 mb-6 bg-amber-50 border-amber-200">
          <h2 className="font-semibold text-lg mb-1">Paid Consultation Available</h2>
          <p className="text-gray-700">
            This helper charges <span className="font-bold">${p.per_session_rate as number}</span> per session.
            You will not be charged until the conversation is complete.
          </p>
        </Card>
      )}

      {/* Public documents */}
      {(publicDocs || []).length > 0 && (
        <Card className="p-6 mb-6">
          <h2 className="font-semibold text-lg mb-3">Public Documents</h2>
          <div className="space-y-2">
            {(publicDocs || []).map((doc) => {
              const d = doc as Record<string, unknown>;
              return (
                <a
                  key={d.id as string}
                  href={d.storage_url as string}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block p-3 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="font-medium text-sm">{d.filename as string}</div>
                  <div className="text-xs text-gray-500">{d.file_type as string}</div>
                </a>
              );
            })}
          </div>
        </Card>
      )}

      {/* Ratings */}
      <Card className="p-6">
        <h2 className="font-semibold text-lg mb-4">
          What People Say ({(ratings || []).length})
        </h2>
        {(ratings || []).length === 0 ? (
          <p className="text-gray-500">No ratings yet.</p>
        ) : (
          <div className="space-y-4">
            {(ratings || []).map((rating) => {
              const r = rating as Record<string, unknown>;
              return (
                <div key={r.id as string} className="border-b last:border-0 pb-4 last:pb-0">
                  <div className="flex items-center gap-2 mb-1">
                    {r.resolved ? (
                      <Badge variant="secondary" className="text-xs">✓ Resolved</Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs">Unresolved</Badge>
                    )}
                    <span className="text-xs text-gray-500">
                      {new Date(r.created_at as string).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700">{r.narrative as string}</p>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
