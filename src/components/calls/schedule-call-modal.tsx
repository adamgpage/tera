"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";

interface ScheduleCallModalProps {
  conversationId: string;
  helperName: string;
  onClose: () => void;
  onScheduled: (data: { startTime: string; ical: string }) => void;
}

export function ScheduleCallModal({
  conversationId,
  helperName,
  onClose,
  onScheduled,
}: ScheduleCallModalProps) {
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [platform, setPlatform] = useState<"native" | "google_meet" | "teams" | "zoom">("native");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get minimum date (today)
  const today = new Date().toISOString().split("T")[0];

  async function handleSchedule() {
    if (!date || !time) {
      setError("Please select a date and time");
      return;
    }

    const startTime = new Date(`${date}T${time}`);
    if (startTime <= new Date()) {
      setError("Please select a future time");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/calls/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId,
          startTime: startTime.toISOString(),
          platform,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to schedule");
      }

      const result = await res.json();
      onScheduled(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to schedule call");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-semibold">Schedule Call with {helperName}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
            <Input type="date" min={today} value={date} onChange={(e) => setDate(e.target.value)} />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Time</label>
            <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Platform</label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: "native" as const, label: "Tera Video" },
                { value: "google_meet" as const, label: "Google Meet" },
                { value: "teams" as const, label: "MS Teams" },
                { value: "zoom" as const, label: "Zoom" },
              ].map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setPlatform(opt.value)}
                  className={`p-2 rounded-lg border text-sm transition-colors ${
                    platform === opt.value
                      ? "border-teal-500 bg-teal-50 text-teal-700"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="text-red-600 text-sm bg-red-50 p-3 rounded-lg">{error}</div>
          )}

          <div className="flex gap-3 pt-2">
            <Button
              onClick={handleSchedule}
              disabled={submitting}
              className="flex-1 bg-teal-600 hover:bg-teal-700"
            >
              {submitting ? "Scheduling…" : "Schedule & Send Invite"}
            </Button>
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
          </div>

          <p className="text-xs text-gray-500 text-center">
            Both parties will receive a calendar invitation by email.
          </p>
        </div>
      </Card>
    </div>
  );
}
