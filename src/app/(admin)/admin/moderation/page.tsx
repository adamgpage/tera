"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface ModerationItem {
  id: string;
  type: string;
  reported_entity_type: string;
  reported_entity_id: string;
  reporter_name: string;
  reason: string;
  status: string;
  created_at: string;
}

export default function AdminModerationPage() {
  const [items, setItems] = useState<ModerationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"pending" | "all">("pending");

  useEffect(() => {
    async function loadItems() {
      setLoading(true);
      const res = await fetch(`/api/admin/moderation?status=${filter}`);
      if (res.ok) {
        const data = await res.json();
        setItems(data.items || []);
      }
      setLoading(false);
    }
    loadItems();
  }, [filter]);

  async function handleAction(itemId: string, action: "approve" | "warn" | "suspend" | "dismiss") {
    await fetch(`/api/admin/moderation/${itemId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });

    setItems((prev) => prev.filter((i) => i.id !== itemId));
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Moderation Queue</h1>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant={filter === "pending" ? "default" : "outline"}
            onClick={() => setFilter("pending")}
          >
            Pending
          </Button>
          <Button
            size="sm"
            variant={filter === "all" ? "default" : "outline"}
            onClick={() => setFilter("all")}
          >
            All
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading…</div>
      ) : items.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-gray-500 text-lg">No items in moderation queue</p>
          <p className="text-gray-400 text-sm mt-1">All clear!</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {items.map((item) => (
            <Card key={item.id} className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="outline">{item.reported_entity_type}</Badge>
                    <Badge
                      variant={item.status === "pending" ? "destructive" : "secondary"}
                    >
                      {item.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-700 mb-1">{item.reason}</p>
                  <p className="text-xs text-gray-500">
                    Reported by {item.reporter_name} ·{" "}
                    {new Date(item.created_at).toLocaleString()}
                  </p>
                </div>

                {item.status === "pending" && (
                  <div className="flex gap-2 flex-shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleAction(item.id, "dismiss")}
                    >
                      Dismiss
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleAction(item.id, "warn")}
                    >
                      Warn
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleAction(item.id, "suspend")}
                    >
                      Suspend
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
