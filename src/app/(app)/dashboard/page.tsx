import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data } = await supabase
    .from("users")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!data) redirect("/login");
  const profile = data;

  // Get counts for the dashboard
  const { count: requestCount } = await supabase
    .from("requests")
    .select("*", { count: "exact", head: true })
    .eq("asker_user_id", user.id);

  const { count: conversationCount } = await supabase
    .from("conversations")
    .select("*", { count: "exact", head: true })
    .or(`asker_user_id.eq.${user.id},helper_user_id.eq.${user.id}`);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">
          Welcome back, {profile.name || "there"}
        </h1>
        <p className="mt-1 text-text-secondary">
          {profile.is_helper
            ? "Check your invitations or submit a new request."
            : "Describe your problem and get matched with someone who has solved it."}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <p className="text-sm font-medium text-text-secondary">
            My requests
          </p>
          <p className="mt-1 text-3xl font-bold text-text-primary">
            {requestCount ?? 0}
          </p>
          <Link
            href="/requests"
            className="mt-3 inline-block text-sm font-medium text-tera-600 hover:text-tera-700"
          >
            View all
          </Link>
        </Card>

        <Card>
          <p className="text-sm font-medium text-text-secondary">
            Conversations
          </p>
          <p className="mt-1 text-3xl font-bold text-text-primary">
            {conversationCount ?? 0}
          </p>
          <Link
            href="/conversations"
            className="mt-3 inline-block text-sm font-medium text-tera-600 hover:text-tera-700"
          >
            View all
          </Link>
        </Card>

        <Card>
          <p className="text-sm font-medium text-text-secondary">Status</p>
          <p className="mt-1 text-lg font-semibold text-text-primary">
            {profile.is_helper ? "Helper" : "Asker"}
          </p>
          {!profile.is_helper && (
            <Link
              href="/helper/onboarding"
              className="mt-3 inline-block text-sm font-medium text-tera-600 hover:text-tera-700"
            >
              Become a helper
            </Link>
          )}
        </Card>
      </div>

      <Card padding="lg">
        <h2 className="text-lg font-semibold text-text-primary">
          Need help with something?
        </h2>
        <p className="mt-1 text-sm text-text-secondary">
          Describe your problem in plain language. We&apos;ll match you with
          someone who has direct experience solving it.
        </p>
        <div className="mt-4">
          <Link href="/requests/new">
            <Button>Submit a request</Button>
          </Link>
        </div>
      </Card>
    </div>
  );
}
