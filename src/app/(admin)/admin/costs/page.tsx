"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";

interface CostMetrics {
  dailyCost: number;
  monthlyCost: number;
  avgCostPerConversation: number;
  totalTokensToday: number;
  jobsByPriority: { priority: number; count: number; cost: number }[];
  costByDomain: { domain: string; cost: number; count: number }[];
  budgetAlerts: { level: string; threshold: number; current: number }[];
}

export default function AdminCostsPage() {
  const [metrics, setMetrics] = useState<CostMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const res = await fetch("/api/admin/costs");
      if (res.ok) {
        setMetrics(await res.json());
      }
      setLoading(false);
    }
    load();
  }, []);

  if (loading) {
    return <div className="text-center py-12 text-gray-500">Loading cost data…</div>;
  }

  if (!metrics) {
    return <div className="text-center py-12 text-gray-500">Unable to load cost data</div>;
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-8">AI Cost Monitoring</h1>

      {/* Budget alerts */}
      {metrics.budgetAlerts.length > 0 && (
        <div className="mb-6 space-y-2">
          {metrics.budgetAlerts.map((alert, i) => (
            <div
              key={i}
              className={`p-4 rounded-lg border ${
                alert.level === "critical"
                  ? "bg-red-50 border-red-200 text-red-800"
                  : "bg-amber-50 border-amber-200 text-amber-800"
              }`}
            >
              <span className="font-medium">
                {alert.level === "critical" ? "⚠️ Critical" : "⚡ Warning"}:
              </span>{" "}
              Daily cost ${alert.current.toFixed(2)} has exceeded{" "}
              {alert.level} threshold of ${alert.threshold.toFixed(2)}
            </div>
          ))}
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Card className="p-5">
          <div className="text-sm text-gray-500">Today&apos;s Cost</div>
          <div className="text-3xl font-bold text-gray-900 mt-1">
            ${metrics.dailyCost.toFixed(2)}
          </div>
        </Card>
        <Card className="p-5">
          <div className="text-sm text-gray-500">Monthly Cost</div>
          <div className="text-3xl font-bold text-gray-900 mt-1">
            ${metrics.monthlyCost.toFixed(2)}
          </div>
        </Card>
        <Card className="p-5">
          <div className="text-sm text-gray-500">Avg Per Conversation</div>
          <div className="text-3xl font-bold text-gray-900 mt-1">
            ${metrics.avgCostPerConversation.toFixed(3)}
          </div>
        </Card>
        <Card className="p-5">
          <div className="text-sm text-gray-500">Tokens Today</div>
          <div className="text-3xl font-bold text-gray-900 mt-1">
            {(metrics.totalTokensToday / 1000).toFixed(0)}k
          </div>
        </Card>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Cost by job priority */}
        <Card className="p-6">
          <h2 className="font-semibold text-lg mb-4">Cost by Job Priority</h2>
          <div className="space-y-3">
            {metrics.jobsByPriority.map((tier) => {
              const labels = ["", "Critical (Match)", "High (Parse)", "Medium (Summary)", "Low (Index)"];
              return (
                <div key={tier.priority} className="flex justify-between items-center">
                  <div>
                    <div className="text-sm font-medium">{labels[tier.priority] || `Priority ${tier.priority}`}</div>
                    <div className="text-xs text-gray-500">{tier.count} jobs</div>
                  </div>
                  <div className="text-sm font-mono">${tier.cost.toFixed(2)}</div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Cost by domain */}
        <Card className="p-6">
          <h2 className="font-semibold text-lg mb-4">Cost by Domain</h2>
          <div className="space-y-3">
            {metrics.costByDomain.map((d) => (
              <div key={d.domain} className="flex justify-between items-center">
                <div>
                  <div className="text-sm font-medium">{d.domain}</div>
                  <div className="text-xs text-gray-500">{d.count} conversations</div>
                </div>
                <div className="text-sm font-mono">${d.cost.toFixed(2)}</div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
