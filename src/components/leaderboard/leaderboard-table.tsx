"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface LeaderboardEntry {
  rank: number;
  userId: string;
  name: string;
  country: string;
  conversationsCount: number;
  geographiesCount: number;
  domainsCount: number;
  resolutionRate: number;
}

interface LeaderboardTableProps {
  initialData?: LeaderboardEntry[];
  compact?: boolean;
}

export function LeaderboardTable({ initialData, compact }: LeaderboardTableProps) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>(initialData || []);
  const [loading, setLoading] = useState(!initialData);
  const [domain, setDomain] = useState("");

  useEffect(() => {
    if (initialData) return;

    async function load() {
      setLoading(true);
      const params = new URLSearchParams();
      if (domain) params.set("domain", domain);
      if (compact) params.set("limit", "10");

      const res = await fetch(`/api/leaderboard?${params}`);
      if (res.ok) {
        const data = await res.json();
        setEntries(data.leaderboard || []);
      }
      setLoading(false);
    }
    load();
  }, [domain, compact, initialData]);

  return (
    <Card className={compact ? "" : "overflow-hidden"}>
      {!compact && (
        <div className="p-4 border-b flex items-center justify-between">
          <h2 className="font-semibold text-lg">Top Helpers</h2>
          <div className="flex gap-2">
            {["", "agriculture", "technology", "finance", "education"].map((d) => (
              <Button
                key={d}
                size="sm"
                variant={domain === d ? "default" : "outline"}
                onClick={() => setDomain(d)}
              >
                {d || "All"}
              </Button>
            ))}
          </div>
        </div>
      )}

      {loading ? (
        <div className="p-8 text-center text-gray-500">Loading…</div>
      ) : entries.length === 0 ? (
        <div className="p-8 text-center text-gray-500">No helpers yet</div>
      ) : (
        <div className="divide-y">
          {entries.map((entry) => (
            <a
              key={entry.userId}
              href={`/helpers/${entry.userId}`}
              className="flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors"
            >
              {/* Rank */}
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                entry.rank === 1
                  ? "bg-yellow-100 text-yellow-700"
                  : entry.rank === 2
                  ? "bg-gray-100 text-gray-700"
                  : entry.rank === 3
                  ? "bg-amber-100 text-amber-700"
                  : "bg-gray-50 text-gray-500"
              }`}>
                {entry.rank}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{entry.name}</div>
                <div className="text-sm text-gray-500">{entry.country}</div>
              </div>

              {/* Stats */}
              {!compact && (
                <div className="hidden md:flex gap-6 text-sm text-gray-600">
                  <div className="text-center">
                    <div className="font-bold text-gray-900">{entry.conversationsCount}</div>
                    <div className="text-xs">conversations</div>
                  </div>
                  <div className="text-center">
                    <div className="font-bold text-gray-900">{entry.geographiesCount}</div>
                    <div className="text-xs">countries</div>
                  </div>
                  <div className="text-center">
                    <div className="font-bold text-gray-900">{entry.domainsCount}</div>
                    <div className="text-xs">domains</div>
                  </div>
                  <div className="text-center">
                    <div className="font-bold text-teal-600">
                      {Math.round(entry.resolutionRate * 100)}%
                    </div>
                    <div className="text-xs">resolved</div>
                  </div>
                </div>
              )}

              {compact && (
                <div className="text-sm font-bold text-teal-600">
                  {entry.conversationsCount}
                </div>
              )}
            </a>
          ))}
        </div>
      )}
    </Card>
  );
}
