"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

interface Report {
  id: string;
  reporter_name: string;
  reported_entity_type: string;
  reported_entity_id: string;
  reason: string;
  status: string;
  created_at: string;
}

export default function ModerationPage() {
  const supabase = createClient();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("moderation_reports")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);

      setReports((data || []) as unknown as Report[]);
      setLoading(false);
    }
    load();
  }, [supabase]);

  async function handleAction(reportId: string, action: string) {
    await supabase
      .from("moderation_reports")
      .update({
        status: action === "dismiss" ? "dismissed" : "actioned",
        action_taken: action,
        reviewed_at: new Date().toISOString(),
      } as Record<string, unknown>)
      .eq("id", reportId);

    setReports((prev) => prev.filter((r) => r.id !== reportId));
  }

  if (loading) {
    return <div className="flex justify-center py-20"><LoadingSpinner size="lg" /></div>;
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <h1 className="text-2xl font-bold text-text-primary">Moderation Queue</h1>

      {reports.length === 0 ? (
        <Card><p className="py-8 text-center text-text-secondary">No reports to review.</p></Card>
      ) : (
        <div className="space-y-3">
          {reports.map((report) => (
            <Card key={report.id}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant={report.status === "pending" ? "warning" : "default"}>
                      {report.status}
                    </Badge>
                    <span className="text-xs text-text-muted">
                      {report.reported_entity_type} • {new Date(report.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-sm text-text-primary">{report.reason}</p>
                  <p className="text-xs text-text-muted mt-1">
                    Reported by: {report.reporter_name || "Anonymous"} • Entity: {report.reported_entity_id.slice(0, 8)}...
                  </p>
                </div>
                {report.status === "pending" && (
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => handleAction(report.id, "actioned")}>
                      Action
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => handleAction(report.id, "dismiss")}>
                      Dismiss
                    </Button>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
