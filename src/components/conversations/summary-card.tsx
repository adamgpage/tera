"use client";

import { Card } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { HIGH_RISK_DOMAINS } from "@/lib/utils/constants";

interface Summary {
  problem_as_stated: string | null;
  problem_as_understood: string | null;
  approach_provided: string | null;
  key_actions: string | null;
  follow_up_required: string | null;
  high_risk_disclaimer: boolean;
}

interface SummaryCardProps {
  summary: Summary;
}

function SummarySection({ title, content }: { title: string; content: string | null }) {
  if (!content) return null;
  return (
    <div>
      <h3 className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-1.5">
        {title}
      </h3>
      <p className="text-sm text-text-primary leading-relaxed">{content}</p>
    </div>
  );
}

export function SummaryCard({ summary }: SummaryCardProps) {
  return (
    <div className="space-y-4">
      {summary.high_risk_disclaimer && (
        <Alert variant="warning">
          <strong>Important:</strong> This conversation involved health, legal, or financial
          topics. Tera connects you with people who have direct personal experience.
          Conversations on this platform do not constitute professional medical, legal, or
          financial advice. Always consult a qualified professional for important decisions.
        </Alert>
      )}

      <Card>
        <div className="space-y-5">
          <div className="flex items-center gap-2">
            <svg className="h-5 w-5 text-tera-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
            <h2 className="text-base font-semibold text-text-primary">AI-Generated Summary</h2>
          </div>

          <SummarySection title="Problem as Stated" content={summary.problem_as_stated} />
          <SummarySection title="Problem as Understood" content={summary.problem_as_understood} />
          <SummarySection title="Approach & Advice" content={summary.approach_provided} />
          <SummarySection title="Key Actions" content={summary.key_actions} />
          <SummarySection title="Follow-up" content={summary.follow_up_required} />
        </div>
      </Card>
    </div>
  );
}
