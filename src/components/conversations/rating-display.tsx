"use client";

import { Card } from "@/components/ui/card";

interface RatingDisplayProps {
  label: string;
  narrativeText: string;
  resolved: boolean | null;
}

export function RatingDisplay({ label, narrativeText, resolved }: RatingDisplayProps) {
  return (
    <Card>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-text-primary">{label}</h3>
          {resolved !== null && (
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                resolved
                  ? "bg-green-100 text-green-700"
                  : "bg-red-100 text-red-700"
              }`}
            >
              {resolved ? "Resolved" : "Not resolved"}
            </span>
          )}
        </div>
        <p className="text-sm text-text-secondary leading-relaxed">{narrativeText}</p>
      </div>
    </Card>
  );
}
