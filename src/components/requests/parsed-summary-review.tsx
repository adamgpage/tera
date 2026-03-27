"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface ParsedData {
  parsed_summary: string;
  stated_problem: string;
  inferred_problem: string | null;
  expertise_tags: string[];
  geographic_context: {
    country: string | null;
    region: string | null;
    inferred_cultural_context: string | null;
  };
  urgency: string;
  recommended_format: string;
}

interface ParsedSummaryReviewProps {
  data: ParsedData;
  onConfirm: (editedData: ParsedData) => void;
  onBack: () => void;
  loading?: boolean;
}

export function ParsedSummaryReview({
  data,
  onConfirm,
  onBack,
  loading,
}: ParsedSummaryReviewProps) {
  const [editedSummary, setEditedSummary] = useState(data.parsed_summary);
  const [tags, setTags] = useState(data.expertise_tags);
  const [newTag, setNewTag] = useState("");

  function removeTag(tag: string) {
    setTags(tags.filter((t) => t !== tag));
  }

  function addTag() {
    const trimmed = newTag.trim().toLowerCase();
    if (trimmed && !tags.includes(trimmed)) {
      setTags([...tags, trimmed]);
      setNewTag("");
    }
  }

  function handleConfirm() {
    onConfirm({
      ...data,
      parsed_summary: editedSummary,
      expertise_tags: tags,
    });
  }

  return (
    <div className="space-y-4">
      <Card>
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-medium text-text-secondary">
              Problem as we understand it
            </h3>
            <Textarea
              rows={3}
              value={editedSummary}
              onChange={(e) => setEditedSummary(e.target.value)}
              className="mt-1"
            />
          </div>

          {data.inferred_problem && (
            <div className="rounded-lg bg-yellow-50 border border-yellow-200 p-3">
              <p className="text-xs font-medium text-yellow-800">
                We think there may be a deeper issue
              </p>
              <p className="mt-1 text-sm text-yellow-700">
                {data.inferred_problem}
              </p>
            </div>
          )}

          <div>
            <h3 className="text-sm font-medium text-text-secondary">
              Expertise needed
            </h3>
            <div className="mt-2 flex flex-wrap gap-2">
              {tags.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => removeTag(tag)}
                  className="group inline-flex items-center gap-1 rounded-full bg-tera-100 px-3 py-1 text-xs font-medium text-tera-700 hover:bg-red-100 hover:text-red-700 transition-colors"
                >
                  {tag}
                  <svg
                    className="h-3 w-3 opacity-50 group-hover:opacity-100"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              ))}
            </div>
            <div className="mt-2 flex gap-2">
              <input
                type="text"
                placeholder="Add a tag..."
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addTag();
                  }
                }}
                className="flex-1 rounded-lg border border-border bg-surface px-3 py-1.5 text-sm placeholder:text-text-muted focus:border-tera-500 focus:outline-none focus:ring-1 focus:ring-tera-500"
              />
              <button
                type="button"
                onClick={addTag}
                disabled={!newTag.trim()}
                className="rounded-lg bg-surface-secondary px-3 py-1.5 text-sm font-medium text-text-secondary hover:bg-gray-200 disabled:opacity-50"
              >
                Add
              </button>
            </div>
          </div>

          <div className="flex gap-6 text-sm">
            <div>
              <span className="text-text-muted">Urgency: </span>
              <Badge
                variant={
                  data.urgency === "high"
                    ? "danger"
                    : data.urgency === "medium"
                    ? "warning"
                    : "default"
                }
              >
                {data.urgency}
              </Badge>
            </div>
            <div>
              <span className="text-text-muted">Suggested format: </span>
              <span className="font-medium text-text-primary">
                {data.recommended_format === "synchronous" ? "Video call" : "Message thread"}
              </span>
            </div>
            {data.geographic_context?.country && (
              <div>
                <span className="text-text-muted">Region: </span>
                <span className="font-medium text-text-primary">
                  {data.geographic_context.country}
                  {data.geographic_context.region
                    ? `, ${data.geographic_context.region}`
                    : ""}
                </span>
              </div>
            )}
          </div>
        </div>
      </Card>

      <div className="flex justify-between">
        <Button variant="ghost" onClick={onBack}>
          Edit my request
        </Button>
        <Button onClick={handleConfirm} loading={loading} disabled={tags.length === 0}>
          Confirm and find a match
        </Button>
      </div>
    </div>
  );
}
