import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Card } from "@/components/ui/card";

export default async function AdminDashboard() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Check admin status
  const admin = createAdminClient();
  const { data: userData } = await admin
    .from("users")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!userData || !(userData as Record<string, unknown>).is_admin) {
    redirect("/dashboard");
  }

  // Get platform stats
  const [
    { count: userCount },
    { count: helperCount },
    { count: requestCount },
    { count: conversationCount },
    { count: activeConvCount },
    { count: commonsCount },
    { count: reportCount },
    { count: aiJobCount },
  ] = await Promise.all([
    admin.from("users").select("*", { count: "exact", head: true }),
    admin.from("helper_profiles").select("*", { count: "exact", head: true }),
    admin.from("requests").select("*", { count: "exact", head: true }),
    admin.from("conversations").select("*", { count: "exact", head: true }),
    admin.from("conversations").select("*", { count: "exact", head: true }).eq("status", "active"),
    admin.from("knowledge_commons_entries").select("*", { count: "exact", head: true }).eq("published", true),
    admin.from("moderation_reports").select("*", { count: "exact", head: true }).eq("status", "pending"),
    admin.from("ai_jobs").select("*", { count: "exact", head: true }),
  ]);

  // AI cost stats
  const { data: costData } = await admin
    .from("ai_jobs")
    .select("cost_usd")
    .eq("status", "complete");

  const totalCost = (costData || []).reduce(
    (sum: number, row: Record<string, unknown>) => sum + Number(row.cost_usd || 0),
    0
  );

  const stats = [
    { label: "Total Users", value: userCount ?? 0, href: "/admin/users" },
    { label: "Helpers", value: helperCount ?? 0, href: "/admin/users" },
    { label: "Requests", value: requestCount ?? 0, href: "/admin/requests" },
    { label: "Conversations", value: conversationCount ?? 0, href: "/admin/conversations" },
    { label: "Active Conversations", value: activeConvCount ?? 0, href: "/admin/conversations" },
    { label: "Commons Entries", value: commonsCount ?? 0, href: null },
    { label: "Pending Reports", value: reportCount ?? 0, href: "/admin/moderation" },
    { label: "AI Jobs Run", value: aiJobCount ?? 0, href: "/admin/costs" },
    { label: "Total AI Cost", value: `$${totalCost.toFixed(2)}`, href: "/admin/costs" },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <h1 className="text-2xl font-bold text-text-primary">Admin Dashboard</h1>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <p className="text-sm font-medium text-text-secondary">{stat.label}</p>
            <p className="mt-1 text-3xl font-bold text-text-primary">{stat.value}</p>
            {stat.href && (
              <Link
                href={stat.href}
                className="mt-2 inline-block text-sm text-tera-600 hover:text-tera-700"
              >
                View details
              </Link>
            )}
          </Card>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card padding="lg">
          <h2 className="text-lg font-semibold text-text-primary">Quick Actions</h2>
          <div className="mt-4 space-y-2">
            <Link href="/admin/moderation" className="block rounded-lg border border-border p-3 hover:bg-surface-secondary transition-colors">
              <p className="font-medium text-text-primary">Moderation Queue</p>
              <p className="text-sm text-text-secondary">{reportCount ?? 0} pending reports</p>
            </Link>
            <Link href="/admin/users" className="block rounded-lg border border-border p-3 hover:bg-surface-secondary transition-colors">
              <p className="font-medium text-text-primary">User Management</p>
              <p className="text-sm text-text-secondary">Search and manage accounts</p>
            </Link>
            <Link href="/admin/api-keys" className="block rounded-lg border border-border p-3 hover:bg-surface-secondary transition-colors">
              <p className="font-medium text-text-primary">API Keys</p>
              <p className="text-sm text-text-secondary">Manage institutional access</p>
            </Link>
          </div>
        </Card>

        <Card padding="lg">
          <h2 className="text-lg font-semibold text-text-primary">Platform Health</h2>
          <div className="mt-4 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-text-secondary">Active conversations</span>
              <span className="font-medium text-text-primary">{activeConvCount ?? 0}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-text-secondary">Knowledge Commons entries</span>
              <span className="font-medium text-text-primary">{commonsCount ?? 0}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-text-secondary">AI processing cost (total)</span>
              <span className="font-medium text-text-primary">${totalCost.toFixed(2)}</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
