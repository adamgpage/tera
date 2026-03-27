"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface ShareableCardProps {
  domain: string;
  fromLocation: string;
  toLocation: string;
  resolved: boolean;
  commonsUrl?: string;
  shareUrl: string;
}

export function ShareableCard({
  domain,
  fromLocation,
  toLocation,
  resolved,
  commonsUrl,
  shareUrl,
}: ShareableCardProps) {
  const shareText = `I just had a Tera conversation — ${domain}, ${fromLocation} → ${toLocation}. Human-to-human knowledge transfer, matched by AI. ${resolved ? "Problem resolved. ✓" : ""}`;

  function shareToLinkedIn() {
    window.open(
      `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`,
      "_blank"
    );
  }

  function shareToTwitter() {
    window.open(
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`,
      "_blank"
    );
  }

  function shareToWhatsApp() {
    window.open(
      `https://wa.me/?text=${encodeURIComponent(`${shareText}\n${shareUrl}`)}`,
      "_blank"
    );
  }

  function copyLink() {
    navigator.clipboard.writeText(shareUrl);
  }

  return (
    <Card className="overflow-hidden">
      {/* Card visual */}
      <div className="bg-gradient-to-br from-teal-600 to-cyan-700 p-6 text-white">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-2xl font-bold tracking-tight">TERA</span>
          <span className="text-xs opacity-75">VERIFIED</span>
        </div>

        <div className="text-lg font-medium mb-2">{domain}</div>

        <div className="flex items-center gap-3 text-sm opacity-90 mb-4">
          <span>{fromLocation}</span>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
          </svg>
          <span>{toLocation}</span>
        </div>

        <div className="flex items-center gap-2">
          {resolved ? (
            <span className="inline-flex items-center gap-1 bg-white/20 px-2 py-0.5 rounded text-sm">
              ✓ Resolved
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 bg-white/10 px-2 py-0.5 rounded text-sm">
              In progress
            </span>
          )}
          <span className="text-xs opacity-60">Human-to-human · AI-matched</span>
        </div>
      </div>

      {/* Share buttons */}
      <div className="p-4">
        <p className="text-sm text-gray-600 mb-3">Share this conversation</p>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={shareToLinkedIn}>
            LinkedIn
          </Button>
          <Button size="sm" variant="outline" onClick={shareToTwitter}>
            Twitter
          </Button>
          <Button size="sm" variant="outline" onClick={shareToWhatsApp}>
            WhatsApp
          </Button>
          <Button size="sm" variant="outline" onClick={copyLink}>
            Copy Link
          </Button>
        </div>
        {commonsUrl && (
          <a
            href={commonsUrl}
            className="block mt-3 text-xs text-teal-600 hover:underline"
          >
            View Knowledge Commons entry →
          </a>
        )}
      </div>
    </Card>
  );
}
