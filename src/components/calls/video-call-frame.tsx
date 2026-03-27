"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";

interface VideoCallFrameProps {
  roomUrl: string;
  token: string;
  onCallEnd?: () => void;
  onParticipantJoined?: () => void;
}

type DailyEvent = {
  action: string;
  participant?: { user_id: string; user_name: string };
};

export function VideoCallFrame({
  roomUrl,
  token,
  onCallEnd,
  onParticipantJoined,
}: VideoCallFrameProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<ReturnType<typeof import("@daily-co/daily-js").default.createFrame> | null>(null);
  const [status, setStatus] = useState<"loading" | "joined" | "error">("loading");
  const [error, setError] = useState<string | null>(null);
  const [participantCount, setParticipantCount] = useState(0);

  const cleanup = useCallback(() => {
    if (frameRef.current) {
      frameRef.current.leave();
      frameRef.current.destroy();
      frameRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!containerRef.current || !roomUrl || !token) return;

    let cancelled = false;

    async function initCall() {
      try {
        const { default: DailyIframe } = await import("@daily-co/daily-js");

        if (cancelled || !containerRef.current) return;

        const frame = DailyIframe.createFrame(containerRef.current, {
          iframeStyle: {
            width: "100%",
            height: "100%",
            border: "0",
            borderRadius: "12px",
          },
          showLeaveButton: true,
          showFullscreenButton: true,
        });

        frameRef.current = frame;

        frame.on("joined-meeting", () => {
          if (!cancelled) setStatus("joined");
        });

        frame.on("participant-joined", (_evt?: DailyEvent) => {
          if (!cancelled) {
            setParticipantCount((c) => c + 1);
            onParticipantJoined?.();
          }
        });

        frame.on("participant-left", () => {
          if (!cancelled) setParticipantCount((c) => Math.max(0, c - 1));
        });

        frame.on("left-meeting", () => {
          if (!cancelled) {
            setStatus("loading");
            onCallEnd?.();
          }
        });

        frame.on("error", (evt?: DailyEvent) => {
          if (!cancelled) {
            setStatus("error");
            setError((evt as unknown as { errorMsg?: string })?.errorMsg || "Call error occurred");
          }
        });

        await frame.join({ url: roomUrl, token });
      } catch (err) {
        if (!cancelled) {
          setStatus("error");
          setError(err instanceof Error ? err.message : "Failed to initialize call");
        }
      }
    }

    initCall();

    return () => {
      cancelled = true;
      cleanup();
    };
  }, [roomUrl, token, onCallEnd, onParticipantJoined, cleanup]);

  if (status === "error") {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-gray-900 rounded-xl p-8">
        <div className="text-red-400 text-lg mb-4">Unable to join call</div>
        <p className="text-gray-400 text-sm mb-6">{error}</p>
        <Button variant="outline" onClick={() => window.location.reload()}>
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      {status === "loading" && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900 rounded-xl z-10">
          <div className="text-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-teal-400 mx-auto mb-4" />
            <p className="text-gray-400">Connecting to call…</p>
          </div>
        </div>
      )}
      <div ref={containerRef} className="w-full h-full min-h-[400px] lg:min-h-[500px]" />
      {status === "joined" && (
        <div className="absolute top-4 right-4 bg-black/50 text-white text-xs px-3 py-1 rounded-full">
          {participantCount + 1} in call
        </div>
      )}
    </div>
  );
}
