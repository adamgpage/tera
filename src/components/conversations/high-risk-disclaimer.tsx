interface HighRiskDisclaimerProps {
  topics: string[];
}

export function HighRiskDisclaimer({ topics }: HighRiskDisclaimerProps) {
  if (topics.length === 0) return null;

  const labels: Record<string, string> = {
    health: "health or medical",
    legal: "legal",
    financial: "financial",
  };

  const topicLabels = topics.map((t) => labels[t] || t).join(", ");

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
      <div className="flex gap-3">
        <svg
          className="h-5 w-5 flex-shrink-0 text-amber-600 mt-0.5"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
          />
        </svg>
        <div>
          <p className="text-sm font-medium text-amber-800">
            Important disclaimer
          </p>
          <p className="mt-1 text-sm text-amber-700">
            This conversation involves {topicLabels} topics. The guidance
            shared here is based on personal experience only and does not
            constitute professional advice. Always consult a qualified
            professional for {topicLabels} decisions.
          </p>
        </div>
      </div>
    </div>
  );
}
