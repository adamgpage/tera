"use client";

import { Textarea } from "@/components/ui/textarea";

interface BiographyFormProps {
  value: string;
  onChange: (value: string) => void;
  error?: string;
}

function countWords(text: string): number {
  return text
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 0).length;
}

export function BiographyForm({ value, onChange, error }: BiographyFormProps) {
  const wordCount = countWords(value);
  const isValid = wordCount >= 100;

  return (
    <div className="space-y-2">
      <Textarea
        id="biography"
        label="Tell us about your experience"
        placeholder="Describe your background, the problems you've solved, the industries you've worked in, the contexts you know well. Be specific — the more detail you give, the better we can match you with people who need your help."
        rows={8}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        error={error}
      />
      <div className="flex items-center justify-between">
        <p className="text-xs text-text-muted">
          Minimum 100 words. Be specific about your lived experience.
        </p>
        <p
          className={`text-xs font-medium ${
            isValid ? "text-tera-600" : "text-text-muted"
          }`}
        >
          {wordCount} / 100 words
        </p>
      </div>
    </div>
  );
}
