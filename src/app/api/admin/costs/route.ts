import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: adminCheck } = await supabase
    .from("users")
    .select("is_admin")
    .eq("id", user.id)
    .single();
  if (!(adminCheck as Record<string, unknown>)?.is_admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

  // Get daily cost from ai_jobs
  const { data: dailyJobs } = await supabase
    .from("ai_jobs")
    .select("cost_usd, token_usage, priority")
    .gte("completed_at", today.toISOString());

  const { data: monthlyJobs } = await supabase
    .from("ai_jobs")
    .select("cost_usd")
    .gte("completed_at", monthStart.toISOString());

  const { count: totalConvs } = await supabase
    .from("conversations")
    .select("*", { count: "exact", head: true })
    .gte("created_at", monthStart.toISOString());

  const dailyCost = (dailyJobs || []).reduce((sum, j) => sum + ((j as Record<string, unknown>).cost_usd as number || 0), 0);
  const monthlyCost = (monthlyJobs || []).reduce((sum, j) => sum + ((j as Record<string, unknown>).cost_usd as number || 0), 0);
  const totalTokensToday = (dailyJobs || []).reduce((sum, j) => sum + ((j as Record<string, unknown>).token_usage as number || 0), 0);

  // Group by priority
  const priorityMap = new Map<number, { count: number; cost: number }>();
  for (const job of dailyJobs || []) {
    const j = job as Record<string, unknown>;
    const p = j.priority as number || 4;
    const existing = priorityMap.get(p) || { count: 0, cost: 0 };
    priorityMap.set(p, {
      count: existing.count + 1,
      cost: existing.cost + (j.cost_usd as number || 0),
    });
  }

  const DAILY_WARNING = parseFloat(process.env.AI_COST_WARNING_THRESHOLD || "50");
  const DAILY_CRITICAL = parseFloat(process.env.AI_COST_CRITICAL_THRESHOLD || "100");
  const budgetAlerts = [];
  if (dailyCost >= DAILY_CRITICAL) {
    budgetAlerts.push({ level: "critical", threshold: DAILY_CRITICAL, current: dailyCost });
  } else if (dailyCost >= DAILY_WARNING) {
    budgetAlerts.push({ level: "warning", threshold: DAILY_WARNING, current: dailyCost });
  }

  return NextResponse.json({
    dailyCost,
    monthlyCost,
    avgCostPerConversation: totalConvs ? monthlyCost / totalConvs : 0,
    totalTokensToday,
    jobsByPriority: Array.from(priorityMap.entries())
      .map(([priority, data]) => ({ priority, ...data }))
      .sort((a, b) => a.priority - b.priority),
    costByDomain: [], // Would aggregate from conversations — simplified at MVP
    budgetAlerts,
  });
}
