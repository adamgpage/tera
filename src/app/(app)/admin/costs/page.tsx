"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

interface AiJobRow {
  id: string;
  job_type: string;
  priority: number;
  status: string;
  entity_type: string;
  token_usage: number;
  cost_usd: number;
  completed_at: string | null;
  error_message: string | null;
  created_at: string;
}

export default function AdminCostsPage() {
  const supabase = createClient();
  const [jobs, setJobs] = useState<AiJobRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("ai_jobs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      setJobs((data || []) as unknown as AiJobRow[]);
      setLoading(false);
    }
    load();
  }, [supabase]);

  const totalCost = jobs.reduce((sum, j) => sum + Number(j.cost_usd || 0), 0);
  const totalTokens = jobs.reduce((sum, j) => sum + (j.token_usage || 0), 0);
  const completedJobs = jobs.filter((j) => j.status === "complete").length;
  const failedJobs = jobs.filter((j) => j.status === "failed").length;

  if (loading) {
    return <div className="flex justify-center py-20"><LoadingSpinner size="lg" /></div>;
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <h1 className="text-2xl font-bold text-text-primary">AI Cost Monitor</h1>

      <div className="grid gap-4 sm:grid-cols-4">
        <Card>
          <p className="text-sm text-text-secondary">Total Cost</p>
          <p className="text-2xl font-bold text-text-primary">${totalCost.toFixed(4)}</p>
        </Card>
        <Card>
          <p className="text-sm text-text-secondary">Total Tokens</p>
          <p className="text-2xl font-bold text-text-primary">{totalTokens.toLocaleString()}</p>
        </Card>
        <Card>
          <p className="text-sm text-text-secondary">Completed Jobs</p>
          <p className="text-2xl font-bold text-green-600">{completedJobs}</p>
        </Card>
        <Card>
          <p className="text-sm text-text-secondary">Failed Jobs</p>
          <p className="text-2xl font-bold text-red-600">{failedJobs}</p>
        </Card>
      </div>

      <Card>
        <h2 className="text-lg font-semibold text-text-primary mb-4">Recent Jobs</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-text-muted">
                <th className="pb-2 pr-3">Type</th>
                <th className="pb-2 pr-3">Priority</th>
                <th className="pb-2 pr-3">Status</th>
                <th className="pb-2 pr-3">Tokens</th>
                <th className="pb-2 pr-3">Cost</th>
                <th className="pb-2">Time</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((job) => (
                <tr key={job.id} className="border-b border-border/50">
                  <td className="py-2 pr-3 font-medium">{job.job_type}</td>
                  <td className="py-2 pr-3">P{job.priority}</td>
                  <td className="py-2 pr-3">
                    <Badge
                      variant={
                        job.status === "complete" ? "success" :
                        job.status === "failed" ? "danger" :
                        "warning"
                      }
                    >
                      {job.status}
                    </Badge>
                  </td>
                  <td className="py-2 pr-3">{(job.token_usage || 0).toLocaleString()}</td>
                  <td className="py-2 pr-3">${Number(job.cost_usd || 0).toFixed(4)}</td>
                  <td className="py-2 text-text-muted">
                    {new Date(job.created_at).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
