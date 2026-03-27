"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";

interface TagReviewProps {
  tags: string[];
  onChange: (tags: string[]) => void;
}

export function TagReview({ tags, onChange }: TagReviewProps) {
  const [newTag, setNewTag] = useState("");

  function removeTag(tag: string) {
    onChange(tags.filter((t) => t !== tag));
  }

  function addTag() {
    const trimmed = newTag.trim().toLowerCase();
    if (trimmed && !tags.includes(trimmed)) {
      onChange([...tags, trimmed]);
      setNewTag("");
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      e.preventDefault();
      addTag();
    }
  }

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-text-primary">
        Expertise tags
      </label>
      <p className="text-xs text-text-muted">
        These were generated from your biography. Remove any that don&apos;t fit
        and add any that are missing.
      </p>

      <div className="flex flex-wrap gap-2">
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
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        ))}
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          placeholder="Add a tag..."
          value={newTag}
          onChange={(e) => setNewTag(e.target.value)}
          onKeyDown={handleKeyDown}
          className="flex-1 rounded-lg border border-border bg-surface px-3 py-1.5 text-sm placeholder:text-text-muted focus:border-tera-500 focus:outline-none focus:ring-1 focus:ring-tera-500"
        />
        <button
          type="button"
          onClick={addTag}
          disabled={!newTag.trim()}
          className="rounded-lg bg-surface-secondary px-3 py-1.5 text-sm font-medium text-text-secondary hover:bg-gray-200 disabled:opacity-50 transition-colors"
        >
          Add
        </button>
      </div>
    </div>
  );
}
