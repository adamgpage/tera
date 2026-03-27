"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { VideoCallFrame } from "@/components/calls/video-call-frame";
import { CallDocumentPanel } from "@/components/calls/call-document-panel";
import { Button } from "@/components/ui/button";

export default function CallPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [roomUrl, setRoomUrl] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [files] = useState<Array<{
    id: string;
    filename: string;
    file_type: string;
    file_size: number;
    storage_url: string;
    uploaded_by_name: string;
  }>>([]);

  useEffect(() => {
    async function initRoom() {
      try {
        // Create room
        const roomRes = await fetch("/api/calls/create-room", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ conversationId: id }),
        });

        if (!roomRes.ok) {
          const data = await roomRes.json();
          throw new Error(data.error || "Failed to create room");
        }

        const { roomUrl: url, roomName } = await roomRes.json();

        // Get token
        const tokenRes = await fetch("/api/calls/token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ roomName }),
        });

        if (!tokenRes.ok) {
          throw new Error("Failed to get meeting token");
        }

        const { token: t } = await tokenRes.json();

        setRoomUrl(url);
        setToken(t);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to set up call");
      } finally {
        setLoading(false);
      }
    }

    initRoom();
  }, [id]);

  const handleCallEnd = useCallback(() => {
    router.push(`/conversations/${id}`);
  }, [id, router]);

  const handleFileUpload = useCallback(async (file: File) => {
    // File upload handled via existing file infrastructure
    console.log("Upload file:", file.name, "for conversation:", id);
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-950">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-400 mx-auto mb-4" />
          <p className="text-gray-400 text-lg">Setting up your call…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-950">
        <div className="text-center max-w-md">
          <div className="text-red-400 text-xl mb-4">Could not start call</div>
          <p className="text-gray-400 mb-6">{error}</p>
          <div className="flex gap-3 justify-center">
            <Button onClick={() => window.location.reload()}>Try Again</Button>
            <Button variant="outline" onClick={() => router.push(`/conversations/${id}`)}>
              Back to Chat
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-950">
      {/* Main video area */}
      <div className="flex-1 p-4">
        {roomUrl && token && (
          <VideoCallFrame roomUrl={roomUrl} token={token} onCallEnd={handleCallEnd} />
        )}
      </div>

      {/* Document panel */}
      <div className="hidden lg:block">
        <CallDocumentPanel
          conversationId={id}
          files={files}
          onUpload={handleFileUpload}
        />
      </div>
    </div>
  );
}
