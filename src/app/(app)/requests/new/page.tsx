"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/hooks/use-user";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { ParsedSummaryReview } from "@/components/requests/parsed-summary-review";

type Step = "write" | "parsing" | "review" | "confirming";

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

export default function NewRequestPage() {
  const router = useRouter();
  const supabase = createClient();
  const { authUser } = useUser();

  const [step, setStep] = useState<Step>("write");
  const [rawText, setRawText] = useState("");
  const [parsedData, setParsedData] = useState<ParsedData | null>(null);
  const [parseAttempts, setParseAttempts] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [requestId, setRequestId] = useState<string | null>(null);

  async function handleParse() {
    if (rawText.trim().length < 20) {
      setError("Please describe your problem in more detail.");
      return;
    }

    setError(null);
    setStep("parsing");

    try {
      // Create the request in DB first, then trigger AI parsing
      if (!authUser) {
        setError("Please sign in to submit a request.");
        setStep("write");
        return;
      }

      const { data: request, error: insertErr } = await supabase
        .from("requests")
        .insert({
          asker_user_id: authUser.id,
          raw_text: rawText,
          status: "parsing",
          parse_attempt_count: 0,
        } as Record<string, unknown>)
        .select("id")
        .single();

      if (insertErr || !request) {
        throw new Error(insertErr?.message || "Failed to create request");
      }

      const requestId = (request as Record<string, unknown>).id as string;

      // Call our API route to parse via Claude
      const response = await fetch("/api/jobs/parse-request", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ requestId }),
      });

      const data = await response.json();

      if (!response.ok || data.status === "flagged") {
        const newAttempts = parseAttempts + 1;
        setParseAttempts(newAttempts);

        if (data.status === "flagged") {
          setError(`Your request was flagged: ${data.reason}. Please revise.`);
          setStep("write");
          return;
        }

        if (newAttempts >= 2) {
          setError(
            "We're having trouble understanding your request. It has been submitted for manual review — we'll notify you when a match is found."
          );
          setStep("write");
          return;
        }

        setError(data.error || "Could you describe the problem differently or add more context?");
        setStep("write");
        return;
      }

      // Fetch the updated request to get parsed data
      const { data: parsed } = await supabase
        .from("requests")
        .select("parsed_summary, stated_problem, inferred_problem, expertise_tags, geographic_context, urgency")
        .eq("id", requestId)
        .single();

      if (parsed) {
        const p = parsed as Record<string, unknown>;
        setParsedData({
          parsed_summary: p.parsed_summary as string || "",
          stated_problem: p.stated_problem as string || "",
          inferred_problem: p.inferred_problem as string || null,
          expertise_tags: p.expertise_tags as string[] || [],
          geographic_context: (p.geographic_context as ParsedData["geographic_context"]) || { country: null, region: null, inferred_cultural_context: null },
          urgency: p.urgency as string || "medium",
          recommended_format: "asynchronous",
        });
        // Store the request ID for confirmation step
        setRequestId(requestId);
        setStep("review");
      }
    } catch (err) {
      console.error("Parse error:", err);
      setError("Something went wrong. Please try again.");
      setStep("write");
    }
  }

  async function handleConfirm(editedData: ParsedData) {
    if (!authUser || !requestId) return;
    setStep("confirming");
    setError(null);

    try {
      // Update the existing request with any edits the user made
      const { error: updateError } = await supabase
        .from("requests")
        .update({
          parsed_summary: editedData.parsed_summary,
          stated_problem: editedData.stated_problem,
          inferred_problem: editedData.inferred_problem,
          expertise_tags: editedData.expertise_tags,
          geographic_context: editedData.geographic_context,
          urgency: editedData.urgency,
          preferred_format:
            editedData.recommended_format === "synchronous"
              ? "synchronous"
              : editedData.recommended_format === "asynchronous"
              ? "asynchronous"
              : "no_preference",
          status: "confirmed",
        } as Record<string, unknown>)
        .eq("id", requestId);

      if (updateError) throw new Error(updateError.message);

      // Trigger matching (fire and forget)
      fetch("/api/jobs/run-matching", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ requestId }),
      }).catch(console.error);

      router.push(`/requests/${requestId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit request.");
      setStep("review");
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">
          Describe your problem
        </h1>
        <p className="mt-1 text-text-secondary">
          Tell us what you&apos;re dealing with in plain language. We&apos;ll
          find someone who has direct experience solving it.
        </p>
      </div>

      {error && <Alert variant="error">{error}</Alert>}

      {step === "write" && (
        <Card>
          <div className="space-y-4">
            <Textarea
              id="request"
              placeholder="Describe your problem here. What's happening? What have you tried? What would help?"
              rows={6}
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
            />
            <p className="text-xs text-text-muted">
              Write in any language. Be as specific as you can — the more
              context you give, the better match we&apos;ll find.
            </p>
            <div className="flex justify-end">
              <Button
                onClick={handleParse}
                disabled={rawText.trim().length < 20}
              >
                Find me a match
              </Button>
            </div>
          </div>
        </Card>
      )}

      {step === "parsing" && (
        <Card>
          <div className="flex flex-col items-center gap-4 py-8">
            <LoadingSpinner size="lg" />
            <div className="text-center">
              <p className="font-medium text-text-primary">
                Analysing your request...
              </p>
              <p className="text-sm text-text-secondary">
                We&apos;re understanding your problem and identifying what kind
                of experience you need.
              </p>
            </div>
          </div>
        </Card>
      )}

      {step === "review" && parsedData && (
        <ParsedSummaryReview
          data={parsedData}
          onConfirm={handleConfirm}
          onBack={() => setStep("write")}
        />
      )}

      {step === "confirming" && (
        <Card>
          <div className="flex flex-col items-center gap-4 py-8">
            <LoadingSpinner size="lg" />
            <p className="font-medium text-text-primary">
              Submitting your request...
            </p>
          </div>
        </Card>
      )}
    </div>
  );
}
