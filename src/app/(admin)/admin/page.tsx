import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";

export default async function AdminOverview() {
  const supabase = await createClient();

  // Fetch platform metrics
  const [
    { count: totalUsers },
    { count: totalHelpers },
    { count: totalConversations },
    { count: activeConversations },
    { count: totalRequests },
    { count: openRequests },
    { count: commonsEntries },
    { count: moderationQueue },
  ] = await Promise.all([
    supabase.from("users").select("*", { count: "exact", head: true }),
    supabase.from("helper_profiles").select("*", { count: "exact", head: true }),
    supabase.from("conversations").select("*", { count: "exact", head: true }),
    supabase.from("conversations").select("*", { count: "exact", head: true }).eq("status", "active"),
    supabase.from("requests").select("*", { count: "exact", head: true }),
    supabase.from("requests").select("*", { count: "exact", head: true }).eq("status", "open"),
    supabase.from("knowledge_commons_entries").select("*", { count: "exact", head: true }),
    supabase.from("moderation_reports").select("*", { count: "exact", head: true }).eq("status", "pending"),
  ]);

  const metrics = [
    { label: "Total Users", value: totalUsers || 0 },
    { label: "Registered Helpers", value: totalHelpers || 0 },
    { label: "Total Conversations", value: totalConversations || 0 },
    { label: "Active Now", value: activeConversations || 0, highlight: true },
    { label: "Total Requests", value: totalRequests || 0 },
    { label: "Open Requests", value: openRequests || 0 },
    { label: "Commons Entries", value: commonsEntries || 0 },
    { label: "Moderation Queue", value: moderationQueue || 0, alert: (moderationQueue || 0) > 0 },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold mb-8">Platform Overview</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {metrics.map((m) => (
          <Card
            key={m.label}
            className={`p-5 ${m.alert ? "border-red-300 bg-red-50" : ""}`}
          >
            <div className="text-sm text-gray-500">{m.label}</div>
            <div className={`text-3xl font-bold mt-1 ${
              m.highlight ? "text-teal-600" : m.alert ? "text-red-600" : "text-gray-900"
            }`}>
              {m.value.toLocaleString()}
            </div>
          </Card>
        ))}
      </div>

      {/* Quick actions */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card className="p-6">
          <h2 className="font-semibold text-lg mb-4">Quick Actions</h2>
          <div className="space-y-2">
            <a href="/admin/moderation" className="block p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors text-sm">
              Review moderation queue ({moderationQueue || 0} pending)
            </a>
            <a href="/admin/api-keys" className="block p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors text-sm">
              Manage API keys
            </a>
            <a href="/admin/costs" className="block p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors text-sm">
              Review AI costs
            </a>
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="font-semibold text-lg mb-4">System Health</h2>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Database</span>
              <span className="text-green-600 font-medium">● Healthy</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Job Queue</span>
              <span className="text-green-600 font-medium">● Processing</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Typesense</span>
              <span className="text-green-600 font-medium">● Connected</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Daily.co</span>
              <span className="text-green-600 font-medium">● Available</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
