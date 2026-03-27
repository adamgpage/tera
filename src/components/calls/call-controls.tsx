"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface CallControlsProps {
  conversationId: string;
  helperName: string;
  onStartCall: () => void;
  onScheduleCall: () => void;
  isStarting?: boolean;
}

export function CallControls({
  conversationId,
  helperName,
  onStartCall,
  onScheduleCall,
  isStarting,
}: CallControlsProps) {
  const [platform, setPlatform] = useState<"native" | "google_meet" | "teams" | "zoom">("native");

  return (
    <Card className="p-6">
      <h3 className="font-semibold text-lg mb-4">Start a Video Call</h3>
      <p className="text-sm text-gray-600 mb-6">
        Connect with {helperName} via video to discuss your problem in real time.
      </p>

      <div className="space-y-3 mb-6">
        <label className="text-sm font-medium text-gray-700">Platform</label>
        <div className="grid grid-cols-2 gap-2">
          {[
            { value: "native" as const, label: "Tera Video", desc: "Built-in (recommended)" },
            { value: "google_meet" as const, label: "Google Meet", desc: "External" },
            { value: "teams" as const, label: "MS Teams", desc: "External" },
            { value: "zoom" as const, label: "Zoom", desc: "External" },
          ].map((opt) => (
            <button
              key={opt.value}
              onClick={() => setPlatform(opt.value)}
              className={`p-3 rounded-lg border text-left transition-colors ${
                platform === opt.value
                  ? "border-teal-500 bg-teal-50 text-teal-700"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <div className="font-medium text-sm">{opt.label}</div>
              <div className="text-xs text-gray-500">{opt.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {platform !== "native" && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4 text-sm text-amber-800">
          External platform calls require transcription to be enabled. You&apos;ll receive instructions before the call.
        </div>
      )}

      <div className="flex gap-3">
        <Button
          onClick={onStartCall}
          disabled={isStarting}
          className="flex-1 bg-teal-600 hover:bg-teal-700"
        >
          {isStarting ? "Setting up…" : "Start Now"}
        </Button>
        <Button variant="outline" onClick={onScheduleCall} className="flex-1">
          Schedule
        </Button>
      </div>

      <input type="hidden" name="conversationId" value={conversationId} />
      <input type="hidden" name="platform" value={platform} />
    </Card>
  );
}
