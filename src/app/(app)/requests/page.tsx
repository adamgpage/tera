import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/requests/status-badge";
import { formatDate } from "@/lib/utils/formatting";

export default async function RequestsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: requests } = await supabase
    .from("requests")
    .select("*")
    .eq("asker_user_id", user.id)
    .order("created_at", { ascending: false });

  const items = (requests ?? []) as Array<{
    id: string;
    parsed_summary: string | null;
    raw_text: string;
    status: string;
    urgency: string;
    expertise_tags: string[];
    created_at: string;
  }>;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-text-primary">My requests</h1>
        <Link href="/requests/new">
          <Button>New request</Button>
        </Link>
      </div>

      {items.length === 0 ? (
        <Card>
          <div className="py-8 text-center">
            <p className="text-text-secondary">
              You haven&apos;t submitted any requests yet.
            </p>
            <Link href="/requests/new">
              <Button className="mt-4">Describe your problem</Button>
            </Link>
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          {items.map((req) => (
            <Link key={req.id} href={`/requests/${req.id}`}>
              <Card className="hover:border-tera-300 transition-colors cursor-pointer">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-text-primary line-clamp-2">
                      {req.parsed_summary || req.raw_text}
                    </p>
                    {req.expertise_tags.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {req.expertise_tags.slice(0, 4).map((tag) => (
                          <span
                            key={tag}
                            className="inline-block rounded-full bg-gray-100 px-2 py-0.5 text-xs text-text-secondary"
                          >
                            {tag}
                          </span>
                        ))}
                        {req.expertise_tags.length > 4 && (
                          <span className="text-xs text-text-muted">
                            +{req.expertise_tags.length - 4} more
                          </span>
                        )}
                      </div>
                    )}
                    <p className="mt-2 text-xs text-text-muted">
                      {formatDate(req.created_at)}
                    </p>
                  </div>
                  <StatusBadge status={req.status} />
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
